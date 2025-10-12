-- すべての受注者請求書データを一括修正（Key-Value構造対応）

-- ステップ1: システム設定からサポート手数料率を取得
WITH support_fee_setting AS (
  SELECT CAST(setting_value AS DECIMAL) as support_fee_percent
  FROM public.system_settings
  WHERE setting_key = 'support_fee_percent'
  LIMIT 1
)
-- ステップ2: すべての請求書データを正しい値に修正
UPDATE public.invoices i
SET
  fee_amount = CASE
    WHEN c.support_enabled THEN ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))
    ELSE 0
  END,
  total_amount = CASE
    WHEN c.support_enabled THEN i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))
    ELSE i.base_amount
  END,
  system_fee = CASE
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
  END
FROM public.contracts c, support_fee_setting sfs
WHERE i.contract_id = c.id
  AND i.direction = 'to_operator'
  AND c.id IS NOT NULL;

-- ステップ3: 修正後の確認
WITH support_fee_setting AS (
  SELECT CAST(setting_value AS DECIMAL) as support_fee_percent
  FROM public.system_settings
  WHERE setting_key = 'support_fee_percent'
  LIMIT 1
)
SELECT
  i.invoice_number as 請求書番号,
  p.title as プロジェクト名,
  i.base_amount as 契約金額,
  i.fee_amount as サポート料,
  i.total_amount as 小計,
  i.system_fee as 源泉税,
  i.total_amount - i.system_fee as お振込金額,
  c.support_enabled as サポート有効,
  sfs.support_fee_percent as システムサポート率,
  -- 検証
  CASE
    WHEN c.support_enabled THEN
      CASE
        WHEN i.fee_amount = ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))
          AND i.total_amount = (i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0)))
        THEN '✓ 正常'
        ELSE '✗ 不一致'
      END
    ELSE
      CASE
        WHEN i.fee_amount = 0 AND i.total_amount = i.base_amount
        THEN '✓ 正常'
        ELSE '✗ 不一致'
      END
  END as データ整合性
FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
LEFT JOIN public.projects p ON c.project_id = p.id
CROSS JOIN support_fee_setting sfs
WHERE i.direction = 'to_operator'
ORDER BY p.title, i.issue_date DESC;
