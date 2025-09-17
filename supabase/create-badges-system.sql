-- バッジシステム用テーブル作成
-- 土木設計業務用のバッジシステム

-- 1. バッジマスターテーブル
CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'rainbow')),
  icon_name VARCHAR(50) NOT NULL,
  requirements JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ユーザーバッジテーブル（獲得したバッジ）
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, badge_id)
);

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_tier ON badges(tier);
CREATE INDEX IF NOT EXISTS idx_badges_code ON badges(code);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at);

-- 4. 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_badges_updated_at
    BEFORE UPDATE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION update_badges_updated_at();

-- 5. RLS（Row Level Security）の設定
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- バッジマスターは全員閲覧可能
CREATE POLICY "Badges are viewable by everyone" ON badges
    FOR SELECT USING (true);

-- ユーザーバッジは自分のもののみ閲覧可能
CREATE POLICY "Users can view their own badges" ON user_badges
    FOR SELECT USING (user_id = auth.uid());

-- サービスロールはバッジを作成・更新可能
CREATE POLICY "Service role can manage badges" ON badges
    FOR ALL USING (true);

CREATE POLICY "Service role can manage user badges" ON user_badges
    FOR ALL USING (true);

-- 6. バッジマスターデータの挿入
INSERT INTO badges (code, name, description, category, tier, icon_name, requirements) VALUES
-- 基本バッジ（案件数ベース）
('first_project', '初回受注', '初めて案件を受注した時', 'achievement', 'bronze', 'first_project', '{"type": "first_project"}'),
('project_master', '案件マスター', '10件の案件を完了', 'achievement', 'silver', 'project_master', '{"type": "project_count", "count": 10}'),
('project_expert', '案件エキスパート', '50件の案件を完了', 'achievement', 'gold', 'project_expert', '{"type": "project_count", "count": 50}'),
('project_legend', '案件レジェンド', '100件の案件を完了', 'achievement', 'platinum', 'project_legend', '{"type": "project_count", "count": 100}'),

-- 継続性系
('streak_3m', '連続達成', '3ヶ月連続で案件を完了', 'consistency', 'silver', 'streak_3m', '{"type": "monthly_streak", "months": 3}'),
('speed_star', 'スピードスター', '納期より早く完了した案件が5件', 'performance', 'gold', 'speed_star', '{"type": "early_completion", "count": 5}'),
('perfectionist', '完璧主義者', '評価5.0満点の案件が3件', 'quality', 'platinum', 'perfectionist', '{"type": "perfect_rating", "count": 3}'),
('growing_star', '成長株', '評価が向上し続けている（3件連続で評価上昇）', 'growth', 'gold', 'growing_star', '{"type": "rating_improvement", "streak": 3}'),

-- 設計分野別
('bridge_designer', '橋梁設計師', '橋梁設計案件を5件完了', 'specialty', 'silver', 'bridge_designer', '{"type": "category_count", "category": "橋梁設計", "count": 5}'),
('road_designer', '道路設計師', '道路設計案件を5件完了', 'specialty', 'silver', 'road_designer', '{"type": "category_count", "category": "道路設計", "count": 5}'),
('building_designer', '建築設計師', '建築設計案件を5件完了', 'specialty', 'silver', 'building_designer', '{"type": "category_count", "category": "建築設計", "count": 5}'),
('river_designer', '河川設計師', '河川・治水設計案件を5件完了', 'specialty', 'silver', 'river_designer', '{"type": "category_count", "category": "河川設計", "count": 5}'),
('tunnel_designer', 'トンネル設計師', 'トンネル設計案件を3件完了', 'specialty', 'gold', 'tunnel_designer', '{"type": "category_count", "category": "トンネル設計", "count": 3}'),
('electrical_designer', '電気設計師', '電気設備設計案件を5件完了', 'specialty', 'silver', 'electrical_designer', '{"type": "category_count", "category": "電気設計", "count": 5}'),
('water_designer', '上下水道設計師', '上下水道設計案件を5件完了', 'specialty', 'silver', 'water_designer', '{"type": "category_count", "category": "上下水道設計", "count": 5}'),

-- 技術レベル別
('cad_master', 'CADマスター', 'CAD関連案件を10件完了', 'technical', 'gold', 'cad_master', '{"type": "skill_count", "skill": "CAD", "count": 10}'),
('structural_engineer', '構造計算士', '構造計算案件を5件完了', 'technical', 'gold', 'structural_engineer', '{"type": "skill_count", "skill": "構造計算", "count": 5}'),
('surveyor', '測量技術者', '測量関連案件を5件完了', 'technical', 'silver', 'surveyor', '{"type": "skill_count", "skill": "測量", "count": 5}'),
('bim_specialist', 'BIMスペシャリスト', 'BIM関連案件を3件完了', 'technical', 'platinum', 'bim_specialist', '{"type": "skill_count", "skill": "BIM", "count": 3}'),

-- コミュニケーション系
('communicator', 'コミュニケーター', 'コミュニケーション評価が4.5以上の案件が10件', 'communication', 'gold', 'communicator', '{"type": "rating_threshold", "metric": "communication_score", "threshold": 4.5, "count": 10}'),
('team_player', 'チームプレイヤー', '複数人での協業案件を5件完了', 'collaboration', 'silver', 'team_player', '{"type": "collaboration_count", "count": 5}'),
('response_king', 'レスポンス王', '24時間以内の返信率が95%以上', 'responsiveness', 'gold', 'response_king', '{"type": "response_rate", "threshold": 0.95}'),
('presenter', 'プレゼンター', 'プレゼンテーション案件を3件完了', 'presentation', 'silver', 'presenter', '{"type": "skill_count", "skill": "プレゼンテーション", "count": 3}'),

-- 品質管理系
('quality_manager', '品質管理士', '品質評価が4.5以上の案件が20件', 'quality', 'platinum', 'quality_manager', '{"type": "rating_threshold", "metric": "quality_score", "threshold": 4.5, "count": 20}'),
('checker', 'チェッカー', '図面チェック案件を10件完了', 'quality', 'silver', 'checker', '{"type": "skill_count", "skill": "図面チェック", "count": 10}'),
('document_master', 'ドキュメントマスター', '書類作成案件を15件完了', 'documentation', 'gold', 'document_master', '{"type": "skill_count", "skill": "書類作成", "count": 15}'),
('safety_designer', '安全設計士', '安全関連設計案件を5件完了', 'safety', 'gold', 'safety_designer', '{"type": "skill_count", "skill": "安全設計", "count": 5}'),

-- 季節・イベント系
('spring_designer', '春の設計師', '春に案件を完了', 'seasonal', 'bronze', 'spring_designer', '{"type": "seasonal", "season": "spring"}'),
('summer_designer', '夏の設計師', '夏に案件を完了', 'seasonal', 'bronze', 'summer_designer', '{"type": "seasonal", "season": "summer"}'),
('autumn_designer', '秋の設計師', '秋に案件を完了', 'seasonal', 'bronze', 'autumn_designer', '{"type": "seasonal", "season": "autumn"}'),
('winter_designer', '冬の設計師', '冬に案件を完了', 'seasonal', 'bronze', 'winter_designer', '{"type": "seasonal", "season": "winter"}'),
('new_year_challenger', '新年チャレンジャー', '新年最初の案件を完了', 'event', 'rainbow', 'new_year_challenger', '{"type": "new_year_first"}'),

-- 地域・規模系
('urban_designer', '都市設計師', '都市部の大規模案件を完了', 'location', 'gold', 'urban_designer', '{"type": "location_scale", "location": "urban", "scale": "large"}'),
('rural_designer', '地方設計師', '地方の案件を5件完了', 'location', 'silver', 'rural_designer', '{"type": "location_count", "location": "rural", "count": 5}'),
('mega_project', '大型プロジェクト', '予算1億円以上の案件を完了', 'scale', 'platinum', 'mega_project', '{"type": "budget_threshold", "threshold": 100000000}'),
('local_expert', '地域密着', '同じ地域の案件を3件完了', 'location', 'silver', 'local_expert', '{"type": "same_location", "count": 3}'),

-- 収益系
('millionaire', 'ミリオネア', '累計収益100万円達成', 'revenue', 'gold', 'millionaire', '{"type": "total_revenue", "threshold": 1000000}'),
('billionaire', '億万長者', '累計収益1000万円達成', 'revenue', 'platinum', 'billionaire', '{"type": "total_revenue", "threshold": 10000000}'),
('growth_stock', '成長株', '月間収益が前月比150%以上', 'growth', 'gold', 'growth_stock', '{"type": "revenue_growth", "ratio": 1.5}'),
('goal_achiever', '目標達成', '年間目標を達成', 'achievement', 'platinum', 'goal_achiever', '{"type": "annual_goal"}'),

-- レアバッジ
('platform_mvp', 'プラットフォームMVP', 'プラットフォーム全体で最も評価が高い', 'rare', 'rainbow', 'platform_mvp', '{"type": "top_rated"}'),
('superstar', 'スーパースター', '全評価項目で5.0満点の案件を5件', 'rare', 'rainbow', 'superstar', '{"type": "perfect_all_metrics", "count": 5}'),
('innovator', 'イノベーター', '新しい技術を導入した案件を完了', 'innovation', 'platinum', 'innovator', '{"type": "innovation"}'),
('mentor', 'メンター', '他の受注者をサポートした実績', 'leadership', 'platinum', 'mentor', '{"type": "mentoring"})

ON CONFLICT (code) DO NOTHING;
