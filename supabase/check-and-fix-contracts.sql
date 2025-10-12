-- 契約テーブルのsupport_enabledフラグを確認

-- ステップ1: 請求書に紐づく契約のsupport_enabledを確認
SELECT
  c.id as contract_id,
  p.title as プロジェクト名,
  c.bid_amount as 契約金額,
  c.support_enabled as サポート有効,
  c.contractor_id as 受注者ID,
  o.name as 組織名,
  COUNT(i.id) as 請求書数
FROM public.contracts c
LEFT JOIN public.projects p ON c.project_id = p.id
LEFT JOIN public.organizations o ON p.org_id = o.id
LEFT JOIN public.invoices i ON i.contract_id = c.id AND i.direction = 'to_operator'
WHERE c.id IN (
  SELECT DISTINCT contract_id
  FROM public.invoices
  WHERE direction = 'to_operator'
    AND contract_id IS NOT NULL
)
GROUP BY c.id, p.title, c.bid_amount, c.support_enabled, c.contractor_id, o.name
ORDER BY p.title;

-- ステップ2: 「河川横断図作成」の契約を特定してsupport_enabledをtrueに修正
-- ※実行前に上記のSELECT結果を確認してから実行してください

-- UPDATE public.contracts c
-- SET support_enabled = true
-- FROM public.projects p
-- WHERE c.project_id = p.id
--   AND p.title = '河川横断図作成'
--   AND c.support_enabled = false;

-- ステップ3: 修正後、請求書データを再計算
-- ※契約のsupport_enabledを修正したら、fix-invoice-amounts-with-contract.sqlを再実行してください
