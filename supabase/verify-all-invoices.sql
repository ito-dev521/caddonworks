-- 全ての請求書を検証し、計算間違いを特定する

WITH support_fee_setting AS (
  SELECT CAST(setting_value AS DECIMAL) as support_fee_percent
  FROM public.system_settings
  WHERE setting_key = 'support_fee_percent'
  LIMIT 1
),
invoice_verification AS (
  SELECT
    i.id,
    i.invoice_number,
    i.direction,
    p.title as project_title,
    c.id as contract_id,
    c.support_enabled,

    -- 現在のDB値
    i.base_amount as current_base_amount,
    i.fee_amount as current_fee_amount,
    i.total_amount as current_total_amount,
    i.system_fee as current_system_fee,

    -- 正しい計算値
    i.base_amount as expected_base_amount,
    CASE
      WHEN c.support_enabled THEN ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))
      ELSE 0
    END as expected_fee_amount,
    CASE
      WHEN c.support_enabled THEN i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))
      ELSE i.base_amount
    END as expected_total_amount,
    CASE
      WHEN c.support_enabled THEN
        CASE
          WHEN (i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))) <= 1000000
          THEN FLOOR((i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))) * 0.1021)
          ELSE FLOOR(((i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))) - 1000000) * 0.2042 + 102100)
        END
      ELSE
        CASE
          WHEN i.base_amount <= 1000000
          THEN FLOOR(i.base_amount * 0.1021)
          ELSE FLOOR((i.base_amount - 1000000) * 0.2042 + 102100)
        END
    END as expected_system_fee,

    sfs.support_fee_percent

  FROM public.invoices i
  LEFT JOIN public.contracts c ON i.contract_id = c.id
  LEFT JOIN public.projects p ON c.project_id = p.id
  CROSS JOIN support_fee_setting sfs
  WHERE i.direction = 'to_operator'
)
SELECT
  invoice_number as 請求書番号,
  project_title as プロジェクト名,
  contract_id IS NOT NULL as 契約存在,
  support_enabled as サポート有効,

  -- 契約金額
  current_base_amount as DB契約金額,
  expected_base_amount as 正しい契約金額,
  CASE WHEN current_base_amount = expected_base_amount THEN '✓' ELSE '✗' END as 契約金額OK,

  -- サポート料
  current_fee_amount as DBサポート料,
  expected_fee_amount as 正しいサポート料,
  CASE WHEN current_fee_amount = expected_fee_amount THEN '✓' ELSE '✗' END as サポート料OK,

  -- 小計
  current_total_amount as DB小計,
  expected_total_amount as 正しい小計,
  CASE WHEN current_total_amount = expected_total_amount THEN '✓' ELSE '✗' END as 小計OK,

  -- 源泉税
  current_system_fee as DB源泉税,
  expected_system_fee as 正しい源泉税,
  CASE WHEN current_system_fee = expected_system_fee THEN '✓' ELSE '✗' END as 源泉税OK,

  -- 総合判定
  CASE
    WHEN current_fee_amount = expected_fee_amount
      AND current_total_amount = expected_total_amount
      AND current_system_fee = expected_system_fee
    THEN '✓ 正常'
    ELSE '✗ 要修正'
  END as 総合判定

FROM invoice_verification
ORDER BY
  CASE WHEN current_fee_amount = expected_fee_amount
      AND current_total_amount = expected_total_amount
      AND current_system_fee = expected_system_fee
    THEN 1 ELSE 0 END,  -- 異常データを先に表示
  project_title;
