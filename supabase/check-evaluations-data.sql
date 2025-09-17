-- 評価データの確認
SELECT 
  ce.id,
  ce.project_id,
  ce.contractor_id,
  ce.evaluator_id,
  ce.average_score,
  ce.comment,
  ce.created_at,
  p.title as project_title,
  u1.display_name as contractor_name,
  u2.display_name as evaluator_name
FROM contractor_evaluations ce
LEFT JOIN projects p ON ce.project_id = p.id
LEFT JOIN users u1 ON ce.contractor_id = u1.id
LEFT JOIN users u2 ON ce.evaluator_id = u2.id
ORDER BY ce.created_at DESC;

-- プロジェクトの完了案件とcontractor_idの確認
SELECT 
  p.id,
  p.title,
  p.status,
  p.contractor_id,
  u.display_name as contractor_name
FROM projects p
LEFT JOIN users u ON p.contractor_id = u.id
WHERE p.status = 'completed'
ORDER BY p.created_at DESC;
