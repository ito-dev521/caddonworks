-- ブロック積み展開図作成の契約を確認

SELECT
  c.id,
  c.bid_amount,
  c.support_enabled,
  c.project_id,
  p.title as project_title
FROM public.contracts c
LEFT JOIN public.projects p ON c.project_id = p.id
WHERE c.id = '79f37c6b-ac16-4831-8412-c23837108495';
