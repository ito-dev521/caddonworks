-- プロジェクトテーブルにcompleted_atカラムを追加
-- 案件が完了した日時を記録するため

-- 1. カラムを追加
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. 既存の完了済み案件にcompleted_atを設定
-- status='completed'の案件については、updated_atをcompleted_atとして設定
UPDATE projects
SET completed_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL;

-- 3. キャンセルされた案件についても、updated_atをcompleted_atとして設定
UPDATE projects
SET completed_at = updated_at
WHERE status = 'cancelled' AND completed_at IS NULL;

-- 4. インデックスを作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_projects_completed_at ON projects(completed_at);

-- 5. トリガーを作成（ステータスがcompletedまたはcancelledに変更された時、completed_atを自動設定）
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- ステータスがcompletedまたはcancelledに変更され、completed_atがNULLの場合
  IF (NEW.status IN ('completed', 'cancelled')) AND (OLD.status NOT IN ('completed', 'cancelled')) AND (NEW.completed_at IS NULL) THEN
    NEW.completed_at = NOW();
  END IF;

  -- ステータスがcompletedまたはcancelled以外に変更された場合、completed_atをNULLにする
  IF (NEW.status NOT IN ('completed', 'cancelled')) AND (OLD.status IN ('completed', 'cancelled')) THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 既存のトリガーがある場合は削除してから作成
DROP TRIGGER IF EXISTS trigger_set_completed_at ON projects;
CREATE TRIGGER trigger_set_completed_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();

-- コメントを追加
COMMENT ON COLUMN projects.completed_at IS '案件が完了またはキャンセルされた日時';
