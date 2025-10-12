-- invoice_number が NULL の請求書を修正
-- base_amount を契約の bid_amount で上書きしてから計算

WITH support_fee_setting AS (
  SELECT CAST(setting_value AS DECIMAL) as support_fee_percent
  FROM public.system_settings
  WHERE setting_key = 'support_fee_percent'
  LIMIT 1
)
UPDATE public.invoices i
SET
  base_amount = c.bid_amount,  -- 契約金額で上書き
  fee_amount = CASE
    WHEN c.support_enabled = true THEN ROUND(c.bid_amount * (sfs.support_fee_percent / 100.0))
    ELSE 0
  END,
  total_amount = CASE
    WHEN c.support_enabled = true THEN c.bid_amount - ROUND(c.bid_amount * (sfs.support_fee_percent / 100.0))
    ELSE c.bid_amount
  END,
  system_fee = CASE
    WHEN c.support_enabled = true THEN
      CASE
        WHEN (c.bid_amount - ROUND(c.bid_amount * (sfs.support_fee_percent / 100.0))) <= 1000000
        THEN FLOOR((c.bid_amount - ROUND(c.bid_amount * (sfs.support_fee_percent / 100.0))) * 0.1021)
        ELSE FLOOR(((c.bid_amount - ROUND(c.bid_amount * (sfs.support_fee_percent / 100.0))) - 1000000) * 0.2042 + 102100)
      END
    ELSE
      CASE
        WHEN c.bid_amount <= 1000000
        THEN FLOOR(c.bid_amount * 0.1021)
        ELSE FLOOR((c.bid_amount - 1000000) * 0.2042 + 102100)
      END
  END
FROM public.contracts c, support_fee_setting sfs
WHERE i.contract_id = c.id
  AND i.invoice_number IS NULL
  AND i.direction = 'to_operator';

-- 修正結果の確認
SELECT
  i.id,
  i.invoice_number,
  c.bid_amount as 契約金額,
  i.base_amount as DB契約金額,
  i.fee_amount as DBサポート料,
  i.total_amount as DB小計,
  i.system_fee as DB源泉税,
  i.total_amount - i.system_fee as DB請求額,
  c.support_enabled,
  p.title as プロジェクト名,
  -- 検証
  CASE
    WHEN i.base_amount = c.bid_amount THEN '✓'
    ELSE '✗'
  END as 契約金額OK
FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
LEFT JOIN public.projects p ON i.project_id = p.id
WHERE i.invoice_number IS NULL
  AND i.direction = 'to_operator'
ORDER BY i.id;
