-- 案件一覧システムのセットアップ（修正版）
-- 実行順序: 1. fix-projects-table.sql → 2. create-bids-table.sql → 3. insert-sample-jobs.sql

-- ========================================
-- 1. projectsテーブルの修正とカラム追加
-- ========================================

-- 1. まず、projectsテーブルが存在するか確認し、存在しない場合は作成
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'bidding' CHECK (status IN ('bidding', 'in_progress', 'completed', 'cancelled')),
  budget INTEGER,
  start_date DATE,
  end_date DATE,
  category VARCHAR(100),
  org_id UUID,
  contractor_id UUID,
  assignee_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 不足しているカラムを追加（既に存在する場合はスキップ）
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS contractor_id UUID,
ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS bidding_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requirements TEXT,
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- 3. 外部キー制約を追加（テーブルが存在する場合のみ）
DO $$
BEGIN
    -- organizationsテーブルが存在する場合のみ外部キー制約を追加
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_org_id;
        ALTER TABLE projects ADD CONSTRAINT fk_projects_org_id 
            FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    
    -- usersテーブルが存在する場合のみ外部キー制約を追加
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_contractor_id;
        ALTER TABLE projects ADD CONSTRAINT fk_projects_contractor_id 
            FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- 4. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_contractor_id ON projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_bidding_deadline ON projects(bidding_deadline);
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects(location);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- 5. 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーが存在しない場合のみ作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at') THEN
        CREATE TRIGGER update_projects_updated_at 
            BEFORE UPDATE ON projects 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- 6. RLS (Row Level Security) の設定
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view projects from their organization" ON projects;
DROP POLICY IF EXISTS "OrgAdmins can manage projects from their organization" ON projects;

-- 新しいポリシーを作成
CREATE POLICY "Users can view projects from their organization" ON projects
  FOR SELECT USING (
    org_id IN (
      SELECT m.org_id FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "OrgAdmins can manage projects from their organization" ON projects
  FOR ALL USING (
    org_id IN (
      SELECT m.org_id FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND m.role = 'OrgAdmin'
    )
  );

-- ========================================
-- 2. bidsテーブルの作成
-- ========================================

-- 入札テーブルの作成
CREATE TABLE IF NOT EXISTS bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  bid_amount INTEGER NOT NULL CHECK (bid_amount > 0),
  proposal TEXT NOT NULL,
  estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0),
  start_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 一つの案件に対して同じ受注者は一度だけ入札可能
  UNIQUE(project_id, contractor_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_bids_project_id ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor_id ON bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at);

-- 更新日時の自動更新トリガー
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bids_updated_at') THEN
        CREATE TRIGGER update_bids_updated_at 
            BEFORE UPDATE ON bids 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- 外部キー制約を安全に追加
DO $$
BEGIN
    -- projectsテーブルが存在する場合のみ外部キー制約を追加
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        BEGIN
            ALTER TABLE bids DROP CONSTRAINT IF EXISTS fk_bids_project_id;
            ALTER TABLE bids ADD CONSTRAINT fk_bids_project_id 
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'projectsテーブルへの外部キー制約の追加に失敗しました: %', SQLERRM;
        END;
    END IF;
    
    -- usersテーブルが存在する場合のみ外部キー制約を追加
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        BEGIN
            ALTER TABLE bids DROP CONSTRAINT IF EXISTS fk_bids_contractor_id;
            ALTER TABLE bids ADD CONSTRAINT fk_bids_contractor_id 
                FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'usersテーブルへの外部キー制約の追加に失敗しました: %', SQLERRM;
        END;
    END IF;
END
$$;

-- RLS (Row Level Security) の設定
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- 受注者は自分の入札のみ閲覧可能
CREATE POLICY "Contractors can view their own bids" ON bids
  FOR SELECT USING (
    contractor_id IN (
      SELECT id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- 受注者は自分の入札のみ作成可能
CREATE POLICY "Contractors can create their own bids" ON bids
  FOR INSERT WITH CHECK (
    contractor_id IN (
      SELECT id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- 受注者は自分の入札のみ更新可能（ただし、受付済みの場合は不可）
CREATE POLICY "Contractors can update their own bids" ON bids
  FOR UPDATE USING (
    contractor_id IN (
      SELECT id FROM users 
      WHERE auth_user_id = auth.uid()
    ) AND status = 'submitted'
  );

-- 発注者は自分の案件の入札を閲覧可能
CREATE POLICY "Clients can view bids for their projects" ON bids
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      JOIN users u ON m.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND m.role = 'OrgAdmin'
    )
  );

-- 発注者は自分の案件の入札を更新可能（受付・却下）
CREATE POLICY "Clients can update bids for their projects" ON bids
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      JOIN users u ON m.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND m.role = 'OrgAdmin'
    )
  );

-- ========================================
-- 3. サンプルデータの挿入
-- ========================================

-- サンプル案件データの挿入（入札可能な案件）
DO $$
DECLARE
    org_count INTEGER;
    sample_org_id UUID;
BEGIN
    -- organizationsテーブルの存在確認
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        SELECT COUNT(*) INTO org_count FROM organizations;
        
        IF org_count = 0 THEN
            -- サンプル組織を作成
            INSERT INTO organizations (name, email, corporate_number) 
            VALUES ('サンプル建設会社', 'sample@example.com', '1234567890123')
            RETURNING id INTO sample_org_id;
        ELSE
            -- 既存の組織IDを取得
            SELECT id INTO sample_org_id FROM organizations LIMIT 1;
        END IF;
        
        -- 入札可能な案件を追加
        INSERT INTO projects (
          title,
          description,
          status,
          budget,
          start_date,
          end_date,
          category,
          org_id,
          assignee_name,
          bidding_deadline,
          requirements,
          location
        ) VALUES 
        (
          '都市部道路拡張工事設計',
          '都心部の主要道路の拡張工事に関する詳細設計を行います。交通量調査、環境影響評価、住民説明会の実施も含まれます。',
          'bidding',
          5000000,
          '2024-02-01',
          '2024-06-30',
          '道路設計',
          sample_org_id,
          '田中太郎',
          '2024-01-25 23:59:59',
          '・土木施工管理技士の資格が必要\n・過去3年間の類似案件経験\n・CADソフトウェア（AutoCAD）の使用経験\n・週1回の進捗報告',
          '東京都渋谷区'
        ),
        (
          '河川護岸工事設計・監理',
          '中小河川の護岸工事に関する設計と施工監理を行います。環境配慮型の工法を採用し、生態系への影響を最小限に抑える設計が求められます。',
          'bidding',
          3500000,
          '2024-03-01',
          '2024-08-31',
          '河川工事',
          sample_org_id,
          '佐藤花子',
          '2024-02-20 23:59:59',
          '・河川工学の専門知識\n・環境アセスメントの経験\n・施工監理の実務経験3年以上',
          '神奈川県横浜市'
        ),
        (
          '橋梁点検・補修設計',
          '既存橋梁の定期点検と補修工事の設計を行います。非破壊検査技術を活用した詳細な劣化診断と、適切な補修工法の選定が重要です。',
          'bidding',
          2800000,
          '2024-02-15',
          '2024-05-31',
          '構造物点検',
          sample_org_id,
          '山田次郎',
          '2024-02-10 23:59:59',
          '・橋梁工学の専門知識\n・非破壊検査技術の経験\n・構造計算の実務経験',
          '埼玉県さいたま市'
        ),
        (
          '地下構造物設計',
          '地下駐車場と地下通路の設計を行います。地盤調査データに基づく構造設計と、防水・排水計画の策定が主な業務です。',
          'bidding',
          4200000,
          '2024-03-15',
          '2024-07-31',
          '地下構造',
          sample_org_id,
          '鈴木一郎',
          '2024-03-01 23:59:59',
          '・地下構造物の設計経験\n・地盤工学の知識\n・防水工法の専門知識',
          '千葉県千葉市'
        ),
        (
          '公園整備基本設計',
          '新設公園の基本設計を行います。利用者のニーズ調査、景観設計、維持管理計画の策定も含まれます。',
          'bidding',
          1800000,
          '2024-04-01',
          '2024-06-30',
          '道路設計',
          sample_org_id,
          '高橋美咲',
          '2024-03-20 23:59:59',
          '・造園設計の経験\n・景観設計の知識\n・住民参加型設計の経験',
          '茨城県水戸市'
        );
        
        RAISE NOTICE 'サンプル案件データを正常に挿入しました';
    ELSE
        RAISE NOTICE 'organizationsテーブルが存在しません。先にテーブルを作成してください。';
    END IF;
END
$$;

-- コメント
COMMENT ON TABLE projects IS '案件情報を管理するテーブル';
COMMENT ON TABLE bids IS '入札情報を管理するテーブル';

-- 完了メッセージ
SELECT '案件一覧システムのセットアップが完了しました！' as message;
