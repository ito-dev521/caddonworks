-- 特定のプロジェクトの評価データを確認
-- ポリライン作成プロジェクトの評価データ
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
WHERE ce.project_id = '2de6c4d4-83f4-4594-a53a-be14cb09108f'
ORDER BY ce.created_at DESC;

-- 都市部道路拡張プロジェクトの評価データ
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
WHERE ce.project_id = '64aee52e-3b67-4ae8-a34b-ef4e3bdddd88'
ORDER BY ce.created_at DESC;

-- 災害査定作業プロジェクトの評価データ
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
WHERE ce.project_id = '95901dd9-b991-4cb8-8495-7ed30fbeb263'
ORDER BY ce.created_at DESC;

-- 全評価データの確認
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
