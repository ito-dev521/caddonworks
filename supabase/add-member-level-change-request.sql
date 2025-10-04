-- 会員レベル変更リクエスト用のカラムをusersテーブルに追加

-- 申請中の会員レベル
ALTER TABLE users
ADD COLUMN IF NOT EXISTS requested_member_level TEXT CHECK (requested_member_level IN ('beginner', 'intermediate', 'advanced'));

-- レベル変更リクエストのステータス
ALTER TABLE users
ADD COLUMN IF NOT EXISTS level_change_status TEXT CHECK (level_change_status IN ('pending', 'approved', 'rejected'));

-- リクエスト送信日時
ALTER TABLE users
ADD COLUMN IF NOT EXISTS level_change_requested_at TIMESTAMPTZ;

-- レビュー完了日時
ALTER TABLE users
ADD COLUMN IF NOT EXISTS level_change_reviewed_at TIMESTAMPTZ;

-- レビューしたユーザーID
ALTER TABLE users
ADD COLUMN IF NOT EXISTS level_change_reviewed_by UUID REFERENCES users(id);

-- 却下理由や備考
ALTER TABLE users
ADD COLUMN IF NOT EXISTS level_change_notes TEXT;

-- コメント追加
COMMENT ON COLUMN users.requested_member_level IS '申請中の会員レベル';
COMMENT ON COLUMN users.level_change_status IS 'レベル変更リクエストのステータス (pending/approved/rejected)';
COMMENT ON COLUMN users.level_change_requested_at IS 'レベル変更リクエスト送信日時';
COMMENT ON COLUMN users.level_change_reviewed_at IS 'レベル変更リクエストレビュー完了日時';
COMMENT ON COLUMN users.level_change_reviewed_by IS 'レベル変更リクエストをレビューしたユーザーID';
COMMENT ON COLUMN users.level_change_notes IS 'レベル変更リクエストの却下理由や備考';
