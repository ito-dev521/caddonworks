-- 複数受注者対応のためのチャット機能拡張

-- 1. 案件参加者テーブル（複数受注者の管理）
CREATE TABLE IF NOT EXISTS project_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'client', 'contractor', 'observer'
  status VARCHAR(50) DEFAULT 'invited', -- 'invited', 'accepted', 'declined', 'active', 'completed'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contract_id UUID REFERENCES contracts(id),
  bid_id UUID REFERENCES bids(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 2. チャットルームタイプを拡張
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS room_type VARCHAR(50) DEFAULT 'project'; -- 'project', 'private', 'group'

-- 3. チャット参加者に追加情報
ALTER TABLE chat_participants
ADD COLUMN IF NOT EXISTS participant_type VARCHAR(50) DEFAULT 'member'; -- 'client', 'contractor', 'member'

-- 4. 複数受注者用のチャットルーム自動作成関数
CREATE OR REPLACE FUNCTION create_project_chat_rooms()
RETURNS TRIGGER AS $$
BEGIN
  -- メインプロジェクトチャットルーム作成
  INSERT INTO chat_rooms (project_id, name, description, created_by, room_type)
  VALUES (
    NEW.id,
    NEW.title || ' - メインチャット',
    '案件に関する全体的な議論用チャットルーム',
    (SELECT auth_user_id FROM users WHERE id = (
      SELECT user_id FROM memberships WHERE org_id = NEW.org_id AND role = 'OrgAdmin' LIMIT 1
    )),
    'project'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. プロジェクト作成時のトリガー
DROP TRIGGER IF EXISTS trigger_create_project_chat_rooms ON projects;
CREATE TRIGGER trigger_create_project_chat_rooms
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_project_chat_rooms();

-- 6. 受注者が案件に参加した際のチャット参加者追加関数
CREATE OR REPLACE FUNCTION add_contractor_to_chat()
RETURNS TRIGGER AS $$
DECLARE
  project_chat_room_id UUID;
  contractor_auth_id UUID;
BEGIN
  -- プロジェクトのメインチャットルームを取得
  SELECT id INTO project_chat_room_id
  FROM chat_rooms
  WHERE project_id = NEW.project_id AND room_type = 'project'
  LIMIT 1;

  -- 受注者のauth_user_idを取得
  SELECT auth_user_id INTO contractor_auth_id
  FROM users
  WHERE id = NEW.contractor_id;

  -- チャット参加者として追加
  IF project_chat_room_id IS NOT NULL AND contractor_auth_id IS NOT NULL THEN
    INSERT INTO chat_participants (room_id, user_id, role, participant_type)
    VALUES (project_chat_room_id, contractor_auth_id, 'member', 'contractor')
    ON CONFLICT (room_id, user_id) DO NOTHING;

    -- プロジェクト参加者としても追加
    INSERT INTO project_participants (project_id, user_id, role, status, contract_id)
    VALUES (NEW.project_id, NEW.contractor_id, 'contractor', 'active', NEW.id)
    ON CONFLICT (project_id, user_id) DO UPDATE SET
      status = 'active',
      contract_id = NEW.id,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 契約作成時のトリガー
DROP TRIGGER IF EXISTS trigger_add_contractor_to_chat ON contracts;
CREATE TRIGGER trigger_add_contractor_to_chat
  AFTER INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION add_contractor_to_chat();

-- 8. インデックス追加
CREATE INDEX IF NOT EXISTS idx_project_participants_project_id ON project_participants(project_id);
CREATE INDEX IF NOT EXISTS idx_project_participants_user_id ON project_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_project_participants_role ON project_participants(role);
CREATE INDEX IF NOT EXISTS idx_project_participants_status ON project_participants(status);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_type ON chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_chat_participants_participant_type ON chat_participants(participant_type);

-- 9. Row Level Security (RLS) 設定
ALTER TABLE project_participants ENABLE ROW LEVEL SECURITY;

-- プロジェクト参加者は自分が参加しているプロジェクトの情報のみ閲覧可能
CREATE POLICY "Users can view project participants for their projects" ON project_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND (
        u.id = user_id -- 自分自身
        OR EXISTS ( -- または同じプロジェクトの参加者
          SELECT 1 FROM project_participants pp
          WHERE pp.project_id = project_participants.project_id
          AND pp.user_id = u.id
        )
        OR EXISTS ( -- またはプロジェクトの組織のOrgAdmin
          SELECT 1 FROM projects p
          JOIN memberships m ON m.org_id = p.org_id
          WHERE p.id = project_participants.project_id
          AND m.user_id = u.id
          AND m.role = 'OrgAdmin'
        )
      )
    )
  );

-- 10. チャットルーム参加者の自動追加（発注者）
CREATE OR REPLACE FUNCTION add_client_to_project_chat()
RETURNS TRIGGER AS $$
DECLARE
  client_users RECORD;
BEGIN
  -- プロジェクトの組織のOrgAdminユーザーを取得してチャットに追加
  FOR client_users IN
    SELECT u.auth_user_id
    FROM users u
    JOIN memberships m ON m.user_id = u.id
    WHERE m.org_id = NEW.org_id AND m.role = 'OrgAdmin'
  LOOP
    INSERT INTO chat_participants (room_id, user_id, role, participant_type)
    SELECT NEW.id, client_users.auth_user_id, 'admin', 'client'
    WHERE NOT EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE room_id = NEW.id AND user_id = client_users.auth_user_id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. チャットルーム作成時のクライアント追加トリガー
DROP TRIGGER IF EXISTS trigger_add_client_to_project_chat ON chat_rooms;
CREATE TRIGGER trigger_add_client_to_project_chat
  AFTER INSERT ON chat_rooms
  FOR EACH ROW
  WHEN (NEW.room_type = 'project')
  EXECUTE FUNCTION add_client_to_project_chat();

-- 12. データ確認用クエリ
SELECT 
  'Projects with multiple contractors' as info,
  COUNT(*) as count
FROM projects 
WHERE required_contractors > 1;

SELECT 
  'Chat rooms' as info,
  COUNT(*) as count
FROM chat_rooms;

SELECT 
  'Chat participants' as info,
  COUNT(*) as count
FROM chat_participants;
