-- 受注者評価システム用テーブル作成
-- 業務完了時に発注者が受注者を評価するためのテーブル

-- 1. 受注者評価テーブル
CREATE TABLE IF NOT EXISTS contractor_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 評価項目（5段階評価：1-5）
  deadline_score INTEGER NOT NULL CHECK (deadline_score >= 1 AND deadline_score <= 5),
  quality_score INTEGER NOT NULL CHECK (quality_score >= 1 AND quality_score <= 5),
  communication_score INTEGER NOT NULL CHECK (communication_score >= 1 AND communication_score <= 5),
  understanding_score INTEGER NOT NULL CHECK (understanding_score >= 1 AND understanding_score <= 5),
  professionalism_score INTEGER NOT NULL CHECK (professionalism_score >= 1 AND professionalism_score <= 5),
  
  -- 平均評価（自動計算）
  average_score DECIMAL(3,2) GENERATED ALWAYS AS (
    (deadline_score + quality_score + communication_score + understanding_score + professionalism_score) / 5.0
  ) STORED,
  
  -- コメント
  comment TEXT,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約：1つのプロジェクトに対して1つの評価のみ
  UNIQUE(project_id, evaluator_id)
);

-- 2. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_contractor_evaluations_contractor_id ON contractor_evaluations(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_evaluations_project_id ON contractor_evaluations(project_id);
CREATE INDEX IF NOT EXISTS idx_contractor_evaluations_contract_id ON contractor_evaluations(contract_id);
CREATE INDEX IF NOT EXISTS idx_contractor_evaluations_evaluator_id ON contractor_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_contractor_evaluations_average_score ON contractor_evaluations(average_score);
CREATE INDEX IF NOT EXISTS idx_contractor_evaluations_created_at ON contractor_evaluations(created_at);

-- 3. 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_contractor_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーが存在しない場合のみ作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contractor_evaluations_updated_at') THEN
        CREATE TRIGGER update_contractor_evaluations_updated_at
            BEFORE UPDATE ON contractor_evaluations
            FOR EACH ROW
            EXECUTE FUNCTION update_contractor_evaluations_updated_at();
    END IF;
END $$;

-- 4. 受注者の平均評価を計算するビュー
CREATE OR REPLACE VIEW contractor_rating_summary AS
SELECT 
    contractor_id,
    COUNT(*) as total_evaluations,
    ROUND(AVG(average_score), 2) as overall_rating,
    ROUND(AVG(deadline_score), 2) as avg_deadline_score,
    ROUND(AVG(quality_score), 2) as avg_quality_score,
    ROUND(AVG(communication_score), 2) as avg_communication_score,
    ROUND(AVG(understanding_score), 2) as avg_understanding_score,
    ROUND(AVG(professionalism_score), 2) as avg_professionalism_score,
    MAX(created_at) as last_evaluation_date
FROM contractor_evaluations
GROUP BY contractor_id;

-- 5. RLS（Row Level Security）の設定
ALTER TABLE contractor_evaluations ENABLE ROW LEVEL SECURITY;

-- 評価者は自分の評価を閲覧・編集可能
CREATE POLICY "Users can view their own evaluations" ON contractor_evaluations
    FOR SELECT USING (evaluator_id = auth.uid());

CREATE POLICY "Users can insert their own evaluations" ON contractor_evaluations
    FOR INSERT WITH CHECK (evaluator_id = auth.uid());

CREATE POLICY "Users can update their own evaluations" ON contractor_evaluations
    FOR UPDATE USING (evaluator_id = auth.uid());

-- 受注者は自分に対する評価を閲覧可能
CREATE POLICY "Contractors can view evaluations about them" ON contractor_evaluations
    FOR SELECT USING (contractor_id = auth.uid());

-- 組織管理者は組織内の評価を閲覧可能
CREATE POLICY "Org admins can view org evaluations" ON contractor_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships m
            JOIN projects p ON p.org_id = m.org_id
            WHERE m.user_id = auth.uid() 
            AND m.role = 'OrgAdmin'
            AND p.id = contractor_evaluations.project_id
        )
    );

-- 6. サンプルデータは削除（実際のプロジェクトIDが必要なため）
-- テスト時は実際のプロジェクトIDを使用してください
