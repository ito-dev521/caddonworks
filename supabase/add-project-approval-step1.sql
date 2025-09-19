-- ステップ1: 組織テーブルに承認設定を追加
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT FALSE;

-- 既存の組織にデフォルト値を設定
UPDATE organizations 
SET approval_required = FALSE 
WHERE approval_required IS NULL;
