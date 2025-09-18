-- 既存の業務完了届に対して通知を作成するSQL

-- 1. 発行済み請求書と関連するプロジェクト・契約・受注者情報を取得
WITH invoice_data AS (
  SELECT 
    i.id as invoice_id,
    i.contract_id,
    i.contractor_id,
    i.total_amount,
    p.id as project_id,
    p.title as project_title,
    p.org_id
  FROM invoices i
  LEFT JOIN contracts c ON i.contract_id = c.id
  LEFT JOIN projects p ON c.project_id = p.id
  WHERE i.status = 'issued'
)

-- 2. 受注者に業務完了届作成通知を送信
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  data,
  created_at,
  updated_at
)
SELECT 
  contractor_id,
  'completion_report_created',
  '業務完了届が作成されました',
  '案件「' || project_title || '」の業務完了届が作成されました。請求書ページで確認できます。',
  jsonb_build_object(
    'project_id', project_id,
    'invoice_id', invoice_id,
    'contract_id', contract_id
  ),
  NOW(),
  NOW()
FROM invoice_data
WHERE contractor_id IS NOT NULL;

-- 3. 作成された通知を確認
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.title,
  n.message,
  n.created_at,
  u.display_name
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
WHERE n.type = 'completion_report_created'
ORDER BY n.created_at DESC;
