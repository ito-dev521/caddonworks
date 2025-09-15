-- シンプルなテーブル再作成アプローチ
-- 既存のテーブルを削除して新しく作成します

-- ========================================
-- 1. 既存のテーブルを削除（存在する場合のみ）
-- ========================================

-- 外部キー制約を削除
ALTER TABLE IF EXISTS bids DROP CONSTRAINT IF EXISTS fk_bids_project_id;
ALTER TABLE IF EXISTS bids DROP CONSTRAINT IF EXISTS fk_bids_contractor_id;
ALTER TABLE IF EXISTS projects DROP CONSTRAINT IF EXISTS fk_projects_org_id;
ALTER TABLE IF EXISTS projects DROP CONSTRAINT IF EXISTS fk_projects_contractor_id;

-- テーブルを削除
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- ========================================
-- 2. projectsテーブルを新規作成
-- ========================================

CREATE TABLE projects (
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
  bidding_deadline TIMESTAMP WITH TIME ZONE,
  requirements TEXT,
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. bidsテーブルを新規作成
-- ========================================

CREATE TABLE bids (
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

-- ========================================
-- 4. インデックスの作成
-- ========================================

-- projectsテーブルのインデックス
CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_contractor_id ON projects(contractor_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_bidding_deadline ON projects(bidding_deadline);
CREATE INDEX idx_projects_location ON projects(location);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- bidsテーブルのインデックス
CREATE INDEX idx_bids_project_id ON bids(project_id);
CREATE INDEX idx_bids_contractor_id ON bids(contractor_id);
CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_bids_created_at ON bids(created_at);

-- ========================================
-- 5. 外部キー制約の追加（安全に）
-- ========================================

-- projectsテーブルの外部キー制約
DO $$
BEGIN
    -- organizationsテーブルが存在する場合
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN
        ALTER TABLE projects ADD CONSTRAINT fk_projects_org_id 
            FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'projects.org_idの外部キー制約を追加しました';
    ELSE
        RAISE NOTICE 'organizationsテーブルが存在しないため、外部キー制約をスキップしました';
    END IF;
    
    -- usersテーブルが存在する場合
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        ALTER TABLE projects ADD CONSTRAINT fk_projects_contractor_id 
            FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'projects.contractor_idの外部キー制約を追加しました';
    ELSE
        RAISE NOTICE 'usersテーブルが存在しないため、外部キー制約をスキップしました';
    END IF;
END
$$;

-- bidsテーブルの外部キー制約
DO $$
BEGIN
    -- projectsテーブルが存在する場合
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN
        ALTER TABLE bids ADD CONSTRAINT fk_bids_project_id 
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        RAISE NOTICE 'bids.project_idの外部キー制約を追加しました';
    ELSE
        RAISE NOTICE 'projectsテーブルが存在しないため、外部キー制約をスキップしました';
    END IF;
    
    -- usersテーブルが存在する場合
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        ALTER TABLE bids ADD CONSTRAINT fk_bids_contractor_id 
            FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'bids.contractor_idの外部キー制約を追加しました';
    ELSE
        RAISE NOTICE 'usersテーブルが存在しないため、外部キー制約をスキップしました';
    END IF;
END
$$;

-- ========================================
-- 6. サンプルデータの挿入
-- ========================================

-- サンプル案件データの挿入
DO $$
DECLARE
    org_count INTEGER;
    sample_org_id UUID;
BEGIN
    -- organizationsテーブルの存在確認
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO org_count FROM organizations;
        
        IF org_count = 0 THEN
            -- サンプル組織を作成
            INSERT INTO organizations (name, email, corporate_number) 
            VALUES ('サンプル建設会社', 'sample@example.com', '1234567890123')
            RETURNING id INTO sample_org_id;
            RAISE NOTICE 'サンプル組織を作成しました: %', sample_org_id;
        ELSE
            -- 既存の組織IDを取得
            SELECT id INTO sample_org_id FROM organizations LIMIT 1;
            RAISE NOTICE '既存の組織を使用します: %', sample_org_id;
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
        );
        
        RAISE NOTICE 'サンプル案件データを正常に挿入しました';
    ELSE
        RAISE NOTICE 'organizationsテーブルが存在しません。先にテーブルを作成してください。';
    END IF;
END
$$;

-- ========================================
-- 7. 最終確認
-- ========================================

-- 作成されたテーブルの確認
SELECT '=== 作成されたテーブル ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'bids')
ORDER BY table_name;

-- projectsテーブルの構造確認
SELECT '=== projectsテーブルの構造 ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- bidsテーブルの構造確認
SELECT '=== bidsテーブルの構造 ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- サンプルデータの確認
SELECT '=== 挿入されたサンプル案件 ===' as info;
SELECT id, title, status, budget, category, location
FROM projects 
WHERE status = 'bidding'
ORDER BY created_at;

SELECT '案件一覧システムのセットアップが完了しました！' as message;
