-- ブロック積み展開図作成の請求書を詳細確認
-- ID: 8a824185-2ce6-465a-ac40-f90ef3d348ef（最初の8文字が 8a824185 なので表示は INV-8A824185...ではない？）

-- invoice_number が NULL で、小計が 115000 になっている請求書を探す
SELECT
  i.id,
  i.invoice_number,
  i.base_amount as DB契約金額,
  i.fee_amount as DBサポート料,
  i.total_amount as DB小計,
  i.system_fee as DB源泉税,
  i.contract_id,
  c.bid_amount as 契約の入札額,
  c.support_enabled,
  p.title as プロジェクト名
FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
LEFT JOIN public.projects p ON i.project_id = p.id
WHERE i.total_amount = 115000
  OR i.base_amount = 115000
  OR i.id = '8a824185-2ce6-465a-ac40-f90ef3d348ef'
ORDER BY i.updated_at DESC;
