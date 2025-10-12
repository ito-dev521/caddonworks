-- 特定の請求書を個別に修正

-- INV-E9331B33（縦断図作成）とINV-A0D5CA6B（ブロック積み展開図作成）を修正
WITH support_fee_setting AS (
  SELECT CAST(setting_value AS DECIMAL) as support_fee_percent
  FROM public.system_settings
  WHERE setting_key = 'support_fee_percent'
  LIMIT 1
)
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
  AND i.invoice_number IN ('INV-E9331B33', 'INV-A0D5CA6B');

-- 修正後の確認
SELECT
  i.invoice_number,
  i.base_amount as 契約金額,
  i.fee_amount as サポート料,
  i.total_amount as 小計,
  i.system_fee as 源泉税,
  i.total_amount - i.system_fee as お振込金額
FROM public.invoices i
WHERE i.invoice_number IN ('INV-E9331B33', 'INV-A0D5CA6B')
ORDER BY i.invoice_number;
