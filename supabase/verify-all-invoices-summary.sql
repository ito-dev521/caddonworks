-- 請求書データの問題の統計サマリー

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
    c.support_enabled,

    -- 現在のDB値
    i.fee_amount as current_fee_amount,
    i.total_amount as current_total_amount,
    i.system_fee as current_system_fee,

    -- 正しい計算値
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
    END as expected_system_fee

  FROM public.invoices i
  LEFT JOIN public.contracts c ON i.contract_id = c.id
  CROSS JOIN support_fee_setting sfs
  WHERE i.direction = 'to_operator'
)
SELECT
  '総請求書数' as 項目,
  COUNT(*) as 件数,
  '' as 詳細
FROM invoice_verification

UNION ALL

SELECT
  '正常な請求書',
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM invoice_verification), 1)::TEXT || '%'
FROM invoice_verification
WHERE current_fee_amount = expected_fee_amount
  AND current_total_amount = expected_total_amount
  AND current_system_fee = expected_system_fee

UNION ALL

SELECT
  '✗ 異常な請求書',
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM invoice_verification), 1)::TEXT || '%'
FROM invoice_verification
WHERE current_fee_amount != expected_fee_amount
  OR current_total_amount != expected_total_amount
  OR current_system_fee != expected_system_fee

UNION ALL

SELECT
  '  - サポート料が間違い',
  COUNT(*),
  ''
FROM invoice_verification
WHERE current_fee_amount != expected_fee_amount

UNION ALL

SELECT
  '  - 小計が間違い',
  COUNT(*),
  ''
FROM invoice_verification
WHERE current_total_amount != expected_total_amount

UNION ALL

SELECT
  '  - 源泉税が間違い',
  COUNT(*),
  ''
FROM invoice_verification
WHERE current_system_fee != expected_system_fee;
