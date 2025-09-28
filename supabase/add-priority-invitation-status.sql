-- プロジェクトステータスに priority_invitation を追加し、
-- 期限管理用の priority_invitation_active を導入します。

-- 1) 既存のCHECK制約を priority_invitation を含む形に更新
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'projects_status_check'
        AND table_name = 'projects'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.projects DROP CONSTRAINT projects_status_check;
    END IF;

    ALTER TABLE public.projects
    ADD CONSTRAINT projects_status_check
    CHECK (status IN (
        'draft',
        'pending_approval',
        'bidding',
        'priority_invitation',
        'in_progress',
        'completed',
        'cancelled',
        'suspended'
    ));
END $$;

-- 2) priority_invitation_active フラグ列の追加（なければ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'priority_invitation_active'
    ) THEN
        ALTER TABLE public.projects
        ADD COLUMN priority_invitation_active BOOLEAN DEFAULT false;

        CREATE INDEX IF NOT EXISTS idx_projects_priority_invitation_active
          ON public.projects(priority_invitation_active);
    END IF;
END $$;

-- 3) 期限切れ優先招待の自動処理（任意・関数のみ定義）
CREATE OR REPLACE FUNCTION public.expire_priority_invitations()
RETURNS void AS $$
BEGIN
    -- 期限切れの優先招待を自動的に拒否扱いにし、
    -- プロジェクトのステータスを一般公開(bidding)へ戻す
    UPDATE public.priority_invitations
    SET
        response = 'declined',
        responded_at = NOW(),
        response_notes = '期限切れによる自動拒否'
    WHERE
        response = 'pending'
        AND expires_at < NOW();

    UPDATE public.projects p
    SET
        status = 'bidding',
        priority_invitation_active = false
    WHERE
        p.status = 'priority_invitation'
        AND EXISTS (
            SELECT 1 FROM public.priority_invitations i
            WHERE i.project_id = p.id
              AND i.response = 'declined'
              AND i.response_notes = '期限切れによる自動拒否'
        );
END;
$$ LANGUAGE plpgsql;

-- 実行確認用
SELECT 'priority_invitation ステータスと列、関数を準備しました' AS result;

-- プロジェクトステータスに priority_invitation を追加
-- 既存のCHECK制約を確認
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%projects%status%';

-- ステータス制約を更新（priority_invitationを追加）
DO $$
BEGIN
    -- 既存の制約を削除
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'projects_status_check'
        AND table_name = 'projects'
    ) THEN
        ALTER TABLE projects DROP CONSTRAINT projects_status_check;
    END IF;

    -- 新しい制約を追加
    ALTER TABLE projects
    ADD CONSTRAINT projects_status_check
    CHECK (status IN (
        'draft',
        'pending_approval',
        'bidding',
        'priority_invitation',  -- 優先招待中ステータスを追加
        'in_progress',
        'completed',
        'cancelled',
        'suspended'
    ));
END $$;

-- priority_invitation_activeカラムを追加（優先招待が有効かどうかのフラグ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'priority_invitation_active'
    ) THEN
        ALTER TABLE projects
        ADD COLUMN priority_invitation_active BOOLEAN DEFAULT false;

        -- インデックスを追加
        CREATE INDEX IF NOT EXISTS idx_projects_priority_invitation_active
        ON projects(priority_invitation_active);
    END IF;
END $$;

-- 自動期限切れ処理用の関数を作成
CREATE OR REPLACE FUNCTION expire_priority_invitations()
RETURNS void AS $$
BEGIN
    -- 期限切れの優先招待を自動的に拒否扱いにし、プロジェクトを一般公開に変更
    UPDATE priority_invitations
    SET
        response = 'declined',
        responded_at = NOW(),
        response_notes = '期限切れによる自動拒否'
    WHERE
        response = 'pending'
        AND expires_at < NOW();

    -- 対応するプロジェクトのステータスを変更
    UPDATE projects
    SET
        status = 'bidding',
        priority_invitation_active = false
    WHERE
        id IN (
            SELECT DISTINCT project_id
            FROM priority_invitations
            WHERE response = 'declined'
            AND response_notes = '期限切れによる自動拒否'
        )
        AND status = 'priority_invitation';
END;
$$ LANGUAGE plpgsql;

-- 期限切れ処理を定期的に実行するためのコメント
-- 本番環境では、cron拡張またはExternal schedulerで以下を定期実行:
-- SELECT expire_priority_invitations();

-- 実行確認
SELECT 'priority_invitationステータスとexpire_priority_invitations関数が正常に追加されました' as result;