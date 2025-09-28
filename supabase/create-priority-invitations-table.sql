-- 優先招待テーブルの作成（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'priority_invitations'
    ) THEN
        CREATE TABLE public.priority_invitations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
            contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            response TEXT NOT NULL DEFAULT 'pending' CHECK (response IN ('pending','accepted','declined')),
            invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            responded_at TIMESTAMPTZ NULL,
            expires_at TIMESTAMPTZ NULL,
            response_notes TEXT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_priority_invitations_project_id ON public.priority_invitations(project_id);
        CREATE INDEX IF NOT EXISTS idx_priority_invitations_contractor_id ON public.priority_invitations(contractor_id);
        CREATE INDEX IF NOT EXISTS idx_priority_invitations_org_id ON public.priority_invitations(org_id);
        CREATE INDEX IF NOT EXISTS idx_priority_invitations_response ON public.priority_invitations(response);
        CREATE INDEX IF NOT EXISTS idx_priority_invitations_invited_at ON public.priority_invitations(invited_at DESC);
        CREATE INDEX IF NOT EXISTS idx_priority_invitations_expires_at ON public.priority_invitations(expires_at);
    END IF;
END $$;

-- 実行確認
SELECT 'priority_invitations テーブルを確認/作成しました' AS result;


