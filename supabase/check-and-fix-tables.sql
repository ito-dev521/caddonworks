-- テーブル構造の確認と修正
-- まず現在の状況を確認してから修正します

-- ========================================
-- 1. 現在のテーブル構造を確認
-- ========================================

-- 既存のテーブル一覧
SELECT '=== 既存のテーブル一覧 ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- projectsテーブルの現在の構造
SELECT '=== projectsテーブルの現在の構造 ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- bidsテーブルの現在の構造（存在する場合）
SELECT '=== bidsテーブルの現在の構造 ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 2. projectsテーブルの修正
-- ========================================

-- まず、projectsテーブルが存在するか確認
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN
        RAISE NOTICE 'projectsテーブルが存在します。カラムを追加します。';
        
        -- 必要なカラムを追加
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS contractor_id UUID;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(255);
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS bidding_deadline TIMESTAMP WITH TIME ZONE;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS requirements TEXT;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS location VARCHAR(255);
        
        RAISE NOTICE 'projectsテーブルにカラムを追加しました。';
    ELSE
        RAISE NOTICE 'projectsテーブルが存在しません。作成します。';
        
        -- projectsテーブルを作成
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
        
        RAISE NOTICE 'projectsテーブルを作成しました。';
    END IF;
END
$$;

-- ========================================
-- 3. bidsテーブルの作成
-- ========================================

-- bidsテーブルが存在しない場合のみ作成
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

-- ========================================
-- 4. インデックスの作成
-- ========================================

-- projectsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_contractor_id ON projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_bidding_deadline ON projects(bidding_deadline);
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects(location);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- bidsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_bids_project_id ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor_id ON bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at);

-- ========================================
-- 5. 外部キー制約の追加（安全に）
-- ========================================

-- projectsテーブルの外部キー制約
DO $$
BEGIN
    -- organizationsテーブルが存在する場合
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_org_id;
            ALTER TABLE projects ADD CONSTRAINT fk_projects_org_id 
                FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
            RAISE NOTICE 'projects.org_idの外部キー制約を追加しました';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'projects.org_idの外部キー制約の追加に失敗: %', SQLERRM;
        END;
    END IF;
    
    -- usersテーブルが存在する場合
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_contractor_id;
            ALTER TABLE projects ADD CONSTRAINT fk_projects_contractor_id 
                FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE SET NULL;
            RAISE NOTICE 'projects.contractor_idの外部キー制約を追加しました';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'projects.contractor_idの外部キー制約の追加に失敗: %', SQLERRM;
        END;
    END IF;
END
$$;

-- bidsテーブルの外部キー制約
DO $$
BEGIN
    -- projectsテーブルが存在する場合
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE bids DROP CONSTRAINT IF EXISTS fk_bids_project_id;
            ALTER TABLE bids ADD CONSTRAINT fk_bids_project_id 
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
            RAISE NOTICE 'bids.project_idの外部キー制約を追加しました';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'bids.project_idの外部キー制約の追加に失敗: %', SQLERRM;
        END;
    END IF;
    
    -- usersテーブルが存在する場合
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE bids DROP CONSTRAINT IF EXISTS fk_bids_contractor_id;
            ALTER TABLE bids ADD CONSTRAINT fk_bids_contractor_id 
                FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE;
            RAISE NOTICE 'bids.contractor_idの外部キー制約を追加しました';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'bids.contractor_idの外部キー制約の追加に失敗: %', SQLERRM;
        END;
    END IF;
END
$$;

-- ========================================
-- 6. 最終確認
-- ========================================

-- 修正後のprojectsテーブル構造
SELECT '=== 修正後のprojectsテーブル構造 ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 作成されたbidsテーブル構造
SELECT '=== 作成されたbidsテーブル構造 ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'テーブルの修正が完了しました！' as message;
