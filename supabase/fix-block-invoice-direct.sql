-- ブロック積み展開図作成の請求書を直接修正（システム設定を使わない）

UPDATE public.invoices
SET
  base_amount = 20000,
  fee_amount = 0,
  total_amount = 20000,
  system_fee = FLOOR(20000 * 0.1021)
WHERE id = 'a0d5ca6b-dcb7-4372-b1cb-5797e23d596c';

-- 修正結果の確認
SELECT
  id,
  invoice_number,
  base_amount as DB契約金額,
  fee_amount as DBサポート料,
  total_amount as DB小計,
  system_fee as DB源泉税,
  total_amount - system_fee as DB請求額,
  updated_at
FROM public.invoices
WHERE id = 'a0d5ca6b-dcb7-4372-b1cb-5797e23d596c';
