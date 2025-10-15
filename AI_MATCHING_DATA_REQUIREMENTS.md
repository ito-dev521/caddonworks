# AIマッチング機能 - データ要件とロードマップ

## 概要

本ドキュメントは、受注者の過去案件履歴と発注者の新規案件をAIでマッチングする機能の実装に必要なデータ要件をまとめたものです。

---

## 現在のデータ構造

### ✅ 既に利用可能なデータ

#### 1. **受注者データ（usersテーブル）**
- `specialties` (TEXT[]): 専門分野
- `qualifications` (TEXT[]): 保有資格
- `experience_years`: 経験年数
- `member_level`: レベル（beginner/intermediate/advanced）
- `rating`: 総合評価（0-5）
- `organization`: 所属組織
- `postal_code`, `address`: 住所情報

#### 2. **案件データ（projectsテーブル）**
- `title`: 案件タイトル
- `description`: 案件説明
- `category`: カテゴリ
- `requirements`: 要件
- `budget`: 予算
- `location`: 地域
- `required_level`: 必要なレベル
- `required_contractors`: 必要人数
- `bidding_deadline`: 入札締切

#### 3. **評価データ（contractor_evaluations/reviewsテーブル）**
- `deadline_score`: 納期評価（1-5）
- `quality_score`: 品質評価（1-5）
- `communication_score`: コミュニケーション評価（1-5）
- `understanding_score`: 理解度評価（1-5）
- `professionalism_score`: プロフェッショナリズム評価（1-5）
- `compliance`: 基準適合度（1-5）
- `quantity_integrity`: 数量整合性（1-5）
- `rework_rate`: 手戻り率（1-5）
- `comment`: コメント

#### 4. **契約・実績データ（contractsテーブル）**
- `project_id`: プロジェクトID
- `contractor_id`: 受注者ID
- `bid_amount`: 契約金額
- `start_date`, `end_date`: 契約期間
- `status`: 契約ステータス

#### 5. **入札履歴（bidsテーブル）**
- `project_id`: 応募した案件
- `contractor_id`: 応募した受注者
- `bid_amount`: 入札金額
- `proposal`: 提案内容
- `status`: 入札結果（submitted/accepted/rejected/withdrawn）

#### 6. **優先招待履歴（priority_invitationsテーブル）**
- `project_id`: 案件ID
- `contractor_id`: 招待された受注者
- `response`: 回答（accepted/declined/pending）
- `invited_at`, `responded_at`: 招待・回答日時

---

## 🔴 不足しているデータ

### 1. **受注者の稼働状況管理**

**目的**: 高スコアでも手が空いていない受注者を推薦しないため

```sql
-- usersテーブルへの追加カラム
ALTER TABLE users ADD COLUMN current_workload INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN max_concurrent_projects INTEGER DEFAULT 3;
ALTER TABLE users ADD COLUMN availability_status TEXT 
  CHECK (availability_status IN ('available', 'limited', 'unavailable')) 
  DEFAULT 'available';
ALTER TABLE users ADD COLUMN next_available_date DATE;

-- インデックス
CREATE INDEX idx_users_availability ON users(availability_status, next_available_date);

-- コメント
COMMENT ON COLUMN users.current_workload IS '現在の稼働中プロジェクト数';
COMMENT ON COLUMN users.max_concurrent_projects IS '同時進行可能な最大プロジェクト数';
COMMENT ON COLUMN users.availability_status IS '稼働状況（available: 対応可能, limited: 限定的, unavailable: 対応不可）';
COMMENT ON COLUMN users.next_available_date IS '次回対応可能日';
```

---

### 2. **AIマッチング履歴・フィードバックテーブル**

**目的**: AIの提案精度を継続的に改善するための学習データ

```sql
CREATE TABLE ai_matching_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- マッチングスコア
  match_score NUMERIC(5,2) CHECK (match_score >= 0 AND match_score <= 100),
  confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- マッチング理由の詳細
  match_reasoning JSONB,
  -- 例: {
  --   "skill_match": 0.95,
  --   "experience_match": 0.85,
  --   "location_match": 0.70,
  --   "availability_match": 1.0,
  --   "past_performance": 0.92,
  --   "similar_projects": ["project-uuid-1", "project-uuid-2"]
  -- }
  
  -- 実際の結果
  was_shown_to_client BOOLEAN DEFAULT false,
  was_invited BOOLEAN DEFAULT false,
  did_apply BOOLEAN DEFAULT false,
  was_hired BOOLEAN DEFAULT false,
  
  -- フィードバック
  client_feedback TEXT,
  rejection_reason TEXT,
  
  -- メタデータ
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_matching_history_project ON ai_matching_history(project_id);
CREATE INDEX idx_matching_history_contractor ON ai_matching_history(contractor_id);
CREATE INDEX idx_matching_history_score ON ai_matching_history(match_score DESC);
CREATE INDEX idx_matching_history_hired ON ai_matching_history(was_hired);

-- コメント
COMMENT ON TABLE ai_matching_history IS 'AIマッチングの提案履歴と実際の結果を記録';
```

---

### 3. **ベクトルストア（Embeddings）**

**目的**: セマンティック検索による意味的な類似性マッチング

```sql
-- pgvector拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- 案件のベクトル表現
CREATE TABLE project_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  
  -- ベクトル（OpenAI ada-002: 1536次元）
  description_embedding VECTOR(1536),
  requirements_embedding VECTOR(1536),
  combined_embedding VECTOR(1536),
  
  -- 元テキスト（デバッグ用）
  source_text TEXT,
  
  -- メタデータ
  embedding_model TEXT DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 受注者プロファイルのベクトル表現
CREATE TABLE contractor_profile_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- ベクトル
  profile_embedding VECTOR(1536),
  skills_embedding VECTOR(1536),
  portfolio_embedding VECTOR(1536),
  
  -- 元テキスト
  profile_text TEXT,
  skills_text TEXT,
  portfolio_text TEXT,
  
  -- メタデータ
  embedding_model TEXT DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ベクトル検索用のインデックス（IVFFlat: 高速近似検索）
CREATE INDEX ON project_embeddings 
  USING ivfflat (combined_embedding vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX ON contractor_profile_embeddings 
  USING ivfflat (profile_embedding vector_cosine_ops) 
  WITH (lists = 100);

-- コメント
COMMENT ON TABLE project_embeddings IS '案件の意味的ベクトル表現';
COMMENT ON TABLE contractor_profile_embeddings IS '受注者プロファイルの意味的ベクトル表現';
```

---

### 4. **受注者の詳細プロフィールテキスト**

**目的**: より詳細な情報でベクトル化と意味的マッチングを実現

```sql
-- usersテーブルへの追加カラム
ALTER TABLE users ADD COLUMN detailed_bio TEXT;
ALTER TABLE users ADD COLUMN past_projects_summary TEXT;
ALTER TABLE users ADD COLUMN technical_skills_description TEXT;
ALTER TABLE users ADD COLUMN specialization_areas TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN work_style_description TEXT;
ALTER TABLE users ADD COLUMN preferred_project_types TEXT[];

-- コメント
COMMENT ON COLUMN users.detailed_bio IS '詳細な自己紹介（AIマッチング用）';
COMMENT ON COLUMN users.past_projects_summary IS '過去案件の要約説明';
COMMENT ON COLUMN users.technical_skills_description IS '技術スキルの詳細説明';
COMMENT ON COLUMN users.specialization_areas IS 'より細かい専門分野のタグ';
COMMENT ON COLUMN users.work_style_description IS '仕事のスタイルや強み';
COMMENT ON COLUMN users.preferred_project_types IS '希望する案件タイプ';
```

---

### 5. **案件のタグシステムと詳細要件**

**目的**: より精密な条件マッチングとフィルタリング

```sql
-- projectsテーブルへの追加カラム
ALTER TABLE projects ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN technical_requirements TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN required_certifications TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN difficulty_level INTEGER 
  CHECK (difficulty_level BETWEEN 1 AND 5);
ALTER TABLE projects ADD COLUMN estimated_hours INTEGER;
ALTER TABLE projects ADD COLUMN work_style TEXT 
  CHECK (work_style IN ('onsite', 'hybrid', 'remote', 'flexible'));

-- インデックス
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);
CREATE INDEX idx_projects_technical_requirements ON projects USING GIN(technical_requirements);
CREATE INDEX idx_projects_difficulty ON projects(difficulty_level);

-- コメント
COMMENT ON COLUMN projects.tags IS '案件の特徴タグ（例: 道路設計, 橋梁, CAD, 数量計算）';
COMMENT ON COLUMN projects.technical_requirements IS '必要な技術要件のリスト';
COMMENT ON COLUMN projects.required_certifications IS '必須資格のリスト';
COMMENT ON COLUMN projects.difficulty_level IS '難易度（1: 初級 〜 5: 上級）';
COMMENT ON COLUMN projects.estimated_hours IS '推定作業時間';
COMMENT ON COLUMN projects.work_style IS '作業スタイル';
```

---

### 6. **地域情報の詳細化**

**目的**: 地域マッチングの精度向上

```sql
-- usersテーブルへの追加カラム
ALTER TABLE users ADD COLUMN work_regions TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN base_location TEXT;
ALTER TABLE users ADD COLUMN remote_work_available BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN max_commute_distance INTEGER; -- km単位

-- projectsテーブルへの追加カラム
ALTER TABLE projects ADD COLUMN location_flexibility BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN location_coordinates POINT; -- 緯度経度

-- インデックス
CREATE INDEX idx_users_work_regions ON users USING GIN(work_regions);

-- コメント
COMMENT ON COLUMN users.work_regions IS '対応可能地域のリスト（例: 東京都, 神奈川県）';
COMMENT ON COLUMN users.base_location IS '活動拠点';
COMMENT ON COLUMN users.remote_work_available IS 'リモートワーク対応可否';
COMMENT ON COLUMN users.max_commute_distance IS '通勤可能距離（km）';
COMMENT ON COLUMN projects.location_flexibility IS 'リモートワーク可能か';
```

---

### 7. **過去案件の統計情報（ビュー）**

**目的**: 受注者の実績を定量的に評価

```sql
CREATE OR REPLACE VIEW contractor_performance_stats AS
SELECT
  c.contractor_id,
  u.display_name,
  u.email,
  
  -- 案件統計
  COUNT(*) as total_projects,
  COUNT(*) FILTER (WHERE p.status = 'completed') as completed_projects,
  COUNT(*) FILTER (WHERE p.status = 'cancelled') as cancelled_projects,
  
  -- 評価統計
  AVG(ce.average_score) as avg_evaluation_score,
  AVG(ce.deadline_score) as avg_deadline_score,
  AVG(ce.quality_score) as avg_quality_score,
  AVG(ce.communication_score) as avg_communication_score,
  
  -- 期間統計
  AVG(EXTRACT(EPOCH FROM (c.end_date - c.start_date))/86400) as avg_project_duration_days,
  COUNT(*) FILTER (WHERE p.completed_at > c.end_date) as delayed_projects,
  
  -- カテゴリと金額
  ARRAY_AGG(DISTINCT p.category) FILTER (WHERE p.category IS NOT NULL) as project_categories,
  SUM(c.bid_amount) as total_revenue,
  AVG(c.bid_amount) as avg_project_amount,
  
  -- 直近の活動
  MAX(p.completed_at) as last_completed_date,
  MAX(c.created_at) as last_contract_date,
  
  -- 成功率
  ROUND(
    COUNT(*) FILTER (WHERE p.status = 'completed')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as completion_rate_percent

FROM contracts c
JOIN users u ON c.contractor_id = u.id
JOIN projects p ON c.project_id = p.id
LEFT JOIN contractor_evaluations ce ON c.id = ce.contract_id
GROUP BY c.contractor_id, u.display_name, u.email;

-- コメント
COMMENT ON VIEW contractor_performance_stats IS '受注者の過去実績統計（AIマッチング用）';
```

---

### 8. **類似度計算キャッシュ**

**目的**: リアルタイムマッチングの高速化

```sql
CREATE TABLE similarity_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 類似度スコア
  similarity_score NUMERIC(5,4) CHECK (similarity_score >= 0 AND similarity_score <= 1),
  
  -- 類似性の要因分析
  factors JSONB,
  -- 例: {
  --   "skill_similarity": 0.92,
  --   "experience_similarity": 0.85,
  --   "category_match": true,
  --   "location_proximity": 0.78,
  --   "common_projects": 3
  -- }
  
  -- キャッシュ管理
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT true,
  
  UNIQUE(project_id, contractor_id)
);

-- インデックス
CREATE INDEX idx_similarity_cache_project_score 
  ON similarity_cache(project_id, similarity_score DESC);
CREATE INDEX idx_similarity_cache_contractor 
  ON similarity_cache(contractor_id, similarity_score DESC);
CREATE INDEX idx_similarity_cache_valid 
  ON similarity_cache(is_valid, expires_at);

-- 自動キャッシュ無効化関数
CREATE OR REPLACE FUNCTION invalidate_expired_similarity_cache()
RETURNS void AS $$
BEGIN
  UPDATE similarity_cache
  SET is_valid = false
  WHERE expires_at < NOW() AND is_valid = true;
END;
$$ LANGUAGE plpgsql;

-- コメント
COMMENT ON TABLE similarity_cache IS '案件と受注者の類似度計算結果のキャッシュ';
```

---

### 9. **時系列パフォーマンストラッキング**

**目的**: 受注者のスキル成長や最近のパフォーマンスを追跡

```sql
CREATE TABLE contractor_skill_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- スナップショット
  skill_snapshot JSONB,
  -- 例: {
  --   "specialties": ["道路設計", "橋梁設計"],
  --   "qualifications": ["技術士", "RCCM"],
  --   "experience_years": 10,
  --   "member_level": "advanced"
  -- }
  
  -- パフォーマンスメトリクス
  performance_metrics JSONB,
  -- 例: {
  --   "avg_rating": 4.8,
  --   "completed_projects": 15,
  --   "on_time_rate": 0.95,
  --   "client_satisfaction": 4.7
  -- }
  
  -- 記録日時
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_skill_history_contractor 
  ON contractor_skill_history(contractor_id, recorded_at DESC);

-- 定期スナップショット作成関数
CREATE OR REPLACE FUNCTION create_contractor_skill_snapshot()
RETURNS void AS $$
BEGIN
  INSERT INTO contractor_skill_history (contractor_id, skill_snapshot, performance_metrics)
  SELECT
    u.id,
    jsonb_build_object(
      'specialties', u.specialties,
      'qualifications', u.qualifications,
      'experience_years', u.experience_years,
      'member_level', u.member_level,
      'rating', u.rating
    ),
    jsonb_build_object(
      'avg_rating', cps.avg_evaluation_score,
      'completed_projects', cps.completed_projects,
      'on_time_rate', 1.0 - (cps.delayed_projects::NUMERIC / NULLIF(cps.total_projects, 0)),
      'completion_rate', cps.completion_rate_percent / 100.0
    )
  FROM users u
  LEFT JOIN contractor_performance_stats cps ON u.id = cps.contractor_id
  WHERE u.id IN (
    SELECT DISTINCT contractor_id FROM contracts
  );
END;
$$ LANGUAGE plpgsql;

-- コメント
COMMENT ON TABLE contractor_skill_history IS '受注者のスキルとパフォーマンスの時系列記録';
```

---

### 10. **案件成功要因分析**

**目的**: 成功パターンを学習してマッチング精度を向上

```sql
CREATE TABLE project_success_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- 成功度スコア
  success_score NUMERIC(5,2) CHECK (success_score >= 0 AND success_score <= 100),
  
  -- 成功要因の分析
  key_factors JSONB,
  -- 例: {
  --   "skill_match_quality": "excellent",
  --   "communication_effectiveness": 0.95,
  --   "timeline_adherence": 0.98,
  --   "budget_adherence": 1.0,
  --   "client_satisfaction": 4.8,
  --   "contractor_satisfaction": 4.5,
  --   "issue_count": 2,
  --   "revision_count": 1
  -- }
  
  -- 学んだ教訓
  lessons_learned TEXT,
  what_worked_well TEXT,
  what_could_improve TEXT,
  
  -- 分析日時
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_by UUID REFERENCES users(id)
);

-- インデックス
CREATE INDEX idx_success_factors_project ON project_success_factors(project_id);
CREATE INDEX idx_success_factors_score ON project_success_factors(success_score DESC);

-- コメント
COMMENT ON TABLE project_success_factors IS '完了案件の成功要因分析（AIマッチング学習用）';
```

---

## 📊 実装ロードマップ

### **Phase 1: 基本データの整備（1-2週間）**

**目標**: ルールベースのマッチングを実装可能にする

#### タスク:
1. ✅ 受注者の稼働状況フィールド追加
2. ✅ 案件タグシステムの追加
3. ✅ 地域情報の詳細化
4. ✅ 過去案件統計ビューの作成
5. ✅ マッチング履歴テーブルの作成

#### SQL実行順序:
```bash
# 1. ユーザー関連の拡張
psql -f migrations/01_add_user_availability_fields.sql

# 2. プロジェクト関連の拡張
psql -f migrations/02_add_project_tags_and_requirements.sql

# 3. 統計ビューの作成
psql -f migrations/03_create_performance_stats_view.sql

# 4. マッチング履歴テーブル
psql -f migrations/04_create_matching_history_table.sql
```

#### 完了条件:
- ✅ シンプルなルールベースマッチングAPIが動作する
- ✅ 専門分野・資格・地域・評価でフィルタリング可能
- ✅ マッチング結果を記録できる

---

### **Phase 2: AI基盤の構築（2-3週間）**

**目標**: セマンティック検索によるAIマッチングを実装

#### タスク:
1. ✅ pgvectorの導入
2. ✅ embeddingsテーブルの作成
3. ✅ OpenAI/Claude APIでのベクトル化処理
4. ✅ 類似度計算とキャッシュシステム
5. ✅ 詳細プロフィールテキストの追加

#### 技術スタック:
- **データベース**: pgvector（Supabase標準サポート）
- **Embeddings API**: OpenAI `text-embedding-ada-002` または Claude
- **ベクトル検索**: コサイン類似度
- **キャッシュ**: Redis（オプション）+ PostgreSQLテーブル

#### API実装例:
```typescript
// src/app/api/ai-matching/suggest/route.ts
export async function POST(request: NextRequest) {
  const { project_id } = await request.json();
  
  // 1. プロジェクトのembeddingを取得または生成
  const projectEmbedding = await getOrCreateProjectEmbedding(project_id);
  
  // 2. ベクトル類似度で候補を検索
  const candidates = await supabaseAdmin.rpc('find_similar_contractors', {
    query_embedding: projectEmbedding,
    match_threshold: 0.7,
    match_count: 20
  });
  
  // 3. ルールベースのフィルタリング
  const filtered = candidates.filter(c => 
    c.availability_status === 'available' &&
    c.rating >= 4.0
  );
  
  // 4. 総合スコアリング
  const ranked = filtered.map(c => ({
    ...c,
    match_score: calculateMatchScore(c, project)
  })).sort((a, b) => b.match_score - a.match_score);
  
  // 5. マッチング履歴に記録
  await logMatchingHistory(project_id, ranked);
  
  return NextResponse.json({ suggestions: ranked.slice(0, 10) });
}
```

#### 完了条件:
- ✅ AIによる意味的マッチングが動作する
- ✅ マッチング精度が70%以上
- ✅ レスポンスタイムが2秒以内

---

### **Phase 3: 継続的学習と最適化（継続的）**

**目標**: フィードバックループで精度を継続改善

#### タスク:
1. ✅ フィードバックループの実装
2. ✅ パフォーマンストラッキング
3. ✅ 成功要因分析
4. ✅ A/Bテストフレームワーク
5. ✅ モデルの定期再学習

#### 学習サイクル:
```
案件作成 → AIマッチング → 招待 → 応募 → 採用 → 評価
                    ↑                              ↓
                    └────────── フィードバック ←────┘
```

#### 評価メトリクス:
- **精度**: 推薦した受注者が実際に採用される率
- **適合率**: 推薦した受注者が応募する率
- **成功率**: マッチング後のプロジェクト完了率
- **満足度**: 発注者・受注者双方の評価

#### 完了条件:
- ✅ マッチング精度が80%以上
- ✅ 自動で学習データが蓄積される
- ✅ 月次でモデル性能レポートが生成される

---

## 🔧 技術実装の詳細

### 1. **ベクトル化処理**

```typescript
// src/lib/embeddings.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateProjectEmbedding(project: Project) {
  const text = `
    タイトル: ${project.title}
    説明: ${project.description}
    要件: ${project.requirements}
    カテゴリ: ${project.category}
    タグ: ${project.tags.join(', ')}
  `.trim();
  
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  
  return response.data[0].embedding;
}

export async function generateContractorEmbedding(user: User) {
  const text = `
    専門分野: ${user.specialties.join(', ')}
    資格: ${user.qualifications.join(', ')}
    詳細プロフィール: ${user.detailed_bio}
    過去案件: ${user.past_projects_summary}
    技術スキル: ${user.technical_skills_description}
  `.trim();
  
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  
  return response.data[0].embedding;
}
```

---

### 2. **類似度検索（SQL関数）**

```sql
-- ベクトル類似度検索関数
CREATE OR REPLACE FUNCTION find_similar_contractors(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  similarity FLOAT,
  specialties TEXT[],
  rating NUMERIC,
  availability_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.display_name,
    1 - (cpe.profile_embedding <=> query_embedding) AS similarity,
    u.specialties,
    u.rating,
    u.availability_status
  FROM contractor_profile_embeddings cpe
  JOIN users u ON cpe.user_id = u.id
  WHERE 1 - (cpe.profile_embedding <=> query_embedding) > match_threshold
  ORDER BY cpe.profile_embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

---

### 3. **マッチングスコア計算**

```typescript
// src/lib/matching-score.ts
interface MatchingFactors {
  vectorSimilarity: number;      // 0-1
  skillMatch: number;            // 0-1
  experienceMatch: number;       // 0-1
  ratingScore: number;           // 0-1
  availabilityScore: number;     // 0-1
  locationMatch: number;         // 0-1
  pastPerformance: number;       // 0-1
}

const WEIGHTS = {
  vectorSimilarity: 0.30,
  skillMatch: 0.20,
  experienceMatch: 0.15,
  ratingScore: 0.15,
  availabilityScore: 0.10,
  locationMatch: 0.05,
  pastPerformance: 0.05
};

export function calculateMatchScore(
  contractor: Contractor,
  project: Project,
  factors: MatchingFactors
): number {
  const score = 
    factors.vectorSimilarity * WEIGHTS.vectorSimilarity +
    factors.skillMatch * WEIGHTS.skillMatch +
    factors.experienceMatch * WEIGHTS.experienceMatch +
    factors.ratingScore * WEIGHTS.ratingScore +
    factors.availabilityScore * WEIGHTS.availabilityScore +
    factors.locationMatch * WEIGHTS.locationMatch +
    factors.pastPerformance * WEIGHTS.pastPerformance;
  
  return Math.round(score * 100); // 0-100スケール
}
```

---

## 💰 コスト見積もり

### OpenAI Embeddings API
- **モデル**: `text-embedding-ada-002`
- **価格**: $0.0001 / 1K tokens
- **想定トークン数**:
  - 案件1件: 約200トークン → $0.00002
  - 受注者1人: 約300トークン → $0.00003
- **月間コスト（100案件 × 500受注者）**:
  - 初回ベクトル化: $17
  - 更新（月10%）: $1.7
  - **合計: 約$20/月**

### PostgreSQL（Supabase）
- pgvectorは追加コストなし
- ストレージ増加: 約100MB（embeddingsテーブル）

### 総コスト見積もり
- **初期**: 約$20（データ初期化）
- **月額**: 約$5-10（更新のみ）

---

## 🎯 期待される効果

### 発注者側
- ✅ 最適な受注者を数秒で発見
- ✅ マッチング精度80%以上
- ✅ 採用までの時間を50%短縮

### 受注者側
- ✅ 自分に合った案件を自動推薦
- ✅ 応募の手間を削減
- ✅ 契約成立率の向上

### 運営会社側
- ✅ マッチング成功率の向上
- ✅ プラットフォームの価値向上
- ✅ データ蓄積による継続的改善

---

## 📝 次のアクションアイテム

### 今すぐ始められること（Week 1）
1. [ ] Phase 1のSQLマイグレーションファイル作成
2. [ ] 受注者プロフィールのUI改善（詳細情報入力フォーム）
3. [ ] 過去案件統計の表示画面作成

### 短期目標（Month 1）
1. [ ] ルールベースマッチングAPIの実装
2. [ ] マッチング結果表示UIの作成
3. [ ] マッチング履歴の記録開始

### 中期目標（Month 2-3）
1. [ ] pgvectorの導入とembeddingsテーブル作成
2. [ ] OpenAI APIの統合
3. [ ] AIマッチングAPIの実装

### 長期目標（Month 4-6）
1. [ ] フィードバックループの実装
2. [ ] A/Bテストの実施
3. [ ] モデルの継続的改善

---

## 📚 参考リソース

### pgvector
- https://github.com/pgvector/pgvector
- https://supabase.com/docs/guides/database/extensions/pgvector

### OpenAI Embeddings
- https://platform.openai.com/docs/guides/embeddings

### ベクトル検索の実装例
- https://supabase.com/blog/openai-embeddings-postgres-vector

---

## 🔒 セキュリティとプライバシー

### データプライバシー管理

**目的**: ユーザーデータの適切な管理とGDPR/個人情報保護法への対応

```sql
-- データ同意管理テーブル
CREATE TABLE ai_data_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- 同意事項
  allow_ai_matching BOOLEAN DEFAULT true,
  allow_profile_embedding BOOLEAN DEFAULT true,
  allow_performance_tracking BOOLEAN DEFAULT true,
  allow_data_analytics BOOLEAN DEFAULT true,

  -- データ保持期間
  data_retention_days INTEGER DEFAULT 365,

  -- 匿名化設定
  anonymization_level TEXT CHECK (anonymization_level IN ('none', 'partial', 'full')) DEFAULT 'none',

  -- 監査ログ
  consent_version TEXT DEFAULT '1.0',
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX idx_data_consent_user ON ai_data_consent(user_id);
CREATE INDEX idx_data_consent_withdrawn ON ai_data_consent(withdrawn_at) WHERE withdrawn_at IS NOT NULL;

-- コメント
COMMENT ON TABLE ai_data_consent IS 'AIマッチング機能のデータ使用同意管理';

-- embeddings テーブルに匿名化フラグを追加
ALTER TABLE contractor_profile_embeddings
  ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS anonymization_level TEXT CHECK (anonymization_level IN ('none', 'partial', 'full')) DEFAULT 'none';

-- 同意撤回時の自動処理関数
CREATE OR REPLACE FUNCTION handle_consent_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.withdrawn_at IS NOT NULL AND OLD.withdrawn_at IS NULL THEN
    -- Embeddings を削除
    DELETE FROM contractor_profile_embeddings WHERE user_id = NEW.user_id;

    -- マッチング履歴を匿名化
    UPDATE ai_matching_history
    SET contractor_id = NULL,
        match_reasoning = jsonb_set(match_reasoning, '{anonymized}', 'true'::jsonb)
    WHERE contractor_id = NEW.user_id;

    -- 類似度キャッシュを削除
    DELETE FROM similarity_cache WHERE contractor_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_consent_withdrawal
  AFTER UPDATE ON ai_data_consent
  FOR EACH ROW
  EXECUTE FUNCTION handle_consent_withdrawal();
```

### RLSポリシーの追加

```sql
-- ai_data_consent テーブルのRLS
ALTER TABLE ai_data_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consent"
ON ai_data_consent FOR SELECT
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own consent"
ON ai_data_consent FOR UPDATE
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
```

---

## 🎯 公平性とバイアス対策

### マッチング公平性トラッカー

**目的**: 新人受注者への露出機会を保証し、バイアスを検出

```sql
CREATE TABLE matching_fairness_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- 露出指標
  times_recommended INTEGER DEFAULT 0,
  times_viewed_by_client INTEGER DEFAULT 0,
  times_invited INTEGER DEFAULT 0,
  times_hired INTEGER DEFAULT 0,

  -- 新人ブースト
  is_new_contractor BOOLEAN DEFAULT true,
  registration_date TIMESTAMPTZ DEFAULT NOW(),
  boost_multiplier NUMERIC(3,2) DEFAULT 1.2,
  boost_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '3 months',

  -- ダイバーシティスコア
  diversity_score NUMERIC(5,2) DEFAULT 100.0,
  last_recommended_at TIMESTAMPTZ,
  recommendation_frequency_score NUMERIC(5,2),

  -- 公平性メトリクス
  fairness_metrics JSONB,
  -- 例: {
  --   "exposure_rate": 0.15,
  --   "conversion_rate": 0.05,
  --   "avg_rank_position": 7.2,
  --   "diversity_group": "新人",
  --   "needs_boost": true
  -- }

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_fairness_contractor ON matching_fairness_tracker(contractor_id);
CREATE INDEX idx_fairness_new_contractor ON matching_fairness_tracker(is_new_contractor) WHERE is_new_contractor = true;
CREATE INDEX idx_fairness_last_recommended ON matching_fairness_tracker(last_recommended_at DESC);

-- 新人フラグの自動更新関数
CREATE OR REPLACE FUNCTION update_new_contractor_status()
RETURNS void AS $$
BEGIN
  UPDATE matching_fairness_tracker
  SET is_new_contractor = false,
      boost_multiplier = 1.0
  WHERE boost_expires_at < NOW() AND is_new_contractor = true;
END;
$$ LANGUAGE plpgsql;

-- コメント
COMMENT ON TABLE matching_fairness_tracker IS 'マッチングの公平性を監視・保証するトラッカー';
```

### 公平性を考慮したマッチングスコア調整

```typescript
// src/lib/fairness-adjustment.ts
export function applyFairnessBoost(
  contractors: Contractor[],
  fairnessData: Map<string, FairnessTracker>
): Contractor[] {
  return contractors.map(contractor => {
    const fairness = fairnessData.get(contractor.id);
    if (!fairness) return contractor;

    let adjustedScore = contractor.match_score;

    // 新人ブースト（登録後3ヶ月）
    if (fairness.is_new_contractor) {
      adjustedScore *= fairness.boost_multiplier;
    }

    // 露出機会の均等化（推薦回数が少ない人を優遇）
    const avgRecommendations = calculateAverageRecommendations();
    if (fairness.times_recommended < avgRecommendations * 0.5) {
      adjustedScore *= 1.1;
    }

    // 長期間推薦されていない場合のブースト
    const daysSinceLastRecommended = fairness.last_recommended_at
      ? (Date.now() - new Date(fairness.last_recommended_at).getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    if (daysSinceLastRecommended > 30) {
      adjustedScore *= 1.15;
    }

    return {
      ...contractor,
      match_score: Math.min(100, adjustedScore),
      fairness_boost_applied: adjustedScore !== contractor.match_score
    };
  });
}
```

---

## 🛡️ エラーハンドリングとフォールバック

### 3層フォールバックシステム

**目的**: AIマッチングが失敗してもサービスを継続

```typescript
// src/lib/matching-fallback.ts
export async function getMatchingSuggestions(projectId: string) {
  try {
    // Layer 1: AIベースのセマンティックマッチング
    return await getAIMatchingSuggestions(projectId);
  } catch (error) {
    console.error('AI matching failed, falling back to rule-based:', error);

    try {
      // Layer 2: ルールベースマッチング（embeddings不要）
      return await getRuleBasedMatching(projectId);
    } catch (fallbackError) {
      console.error('Rule-based matching failed, using basic sorting:', fallbackError);

      // Layer 3: 最終フォールバック - 評価順ソート
      return await getTopRatedContractors(projectId);
    }
  }
}

// ルールベースマッチング
async function getRuleBasedMatching(projectId: string) {
  const project = await getProject(projectId);

  const { data: contractors } = await supabaseAdmin
    .from('users')
    .select(`
      *,
      contractor_performance_stats(*)
    `)
    .contains('specialties', [project.category])
    .eq('availability_status', 'available')
    .gte('rating', 4.0)
    .order('rating', { ascending: false })
    .limit(10);

  return contractors.map(c => ({
    ...c,
    match_score: calculateRuleBasedScore(c, project),
    matching_method: 'rule-based'
  }));
}

// 最終フォールバック
async function getTopRatedContractors(projectId: string) {
  const { data: contractors } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('availability_status', 'available')
    .order('rating', { ascending: false })
    .limit(10);

  return contractors.map(c => ({
    ...c,
    match_score: c.rating * 20, // 0-5 → 0-100
    matching_method: 'fallback-rating'
  }));
}
```

### エラー監視とアラート

```sql
-- エラーログテーブル
CREATE TABLE matching_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  error_type TEXT NOT NULL,
  error_message TEXT,
  error_details JSONB,
  fallback_used TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_log_project ON matching_error_log(project_id);
CREATE INDEX idx_error_log_type ON matching_error_log(error_type, occurred_at DESC);

-- エラー率監視関数
CREATE OR REPLACE FUNCTION get_matching_error_rate(time_period INTERVAL DEFAULT '1 day')
RETURNS TABLE (
  total_requests BIGINT,
  error_count BIGINT,
  error_rate NUMERIC,
  most_common_error TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT project_id)::BIGINT as total_requests,
    COUNT(*)::BIGINT as error_count,
    ROUND((COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT project_id), 0)) * 100, 2) as error_rate,
    MODE() WITHIN GROUP (ORDER BY error_type) as most_common_error
  FROM matching_error_log
  WHERE occurred_at > NOW() - time_period;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 データ品質管理

### データ品質チェックシステム

**目的**: 低品質なデータを検出して改善を促す

```sql
CREATE TABLE data_quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- チェック結果
  is_valid BOOLEAN,
  quality_score NUMERIC(5,2) CHECK (quality_score >= 0 AND quality_score <= 100),
  issues JSONB,
  -- 例: {
  --   "missing_fields": ["detailed_bio", "specialties"],
  --   "outdated_data": ["experience_years"],
  --   "invalid_values": {"rating": "out of range"},
  --   "suggestions": ["プロフィールを80%以上記入すると推薦率が向上します"]
  -- }

  -- 重要度
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',

  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_quality_checks_entity ON data_quality_checks(entity_type, entity_id);
CREATE INDEX idx_quality_checks_invalid ON data_quality_checks(is_valid) WHERE is_valid = false;
CREATE INDEX idx_quality_checks_severity ON data_quality_checks(severity, checked_at DESC);

-- 受注者プロフィール品質チェック関数
CREATE OR REPLACE FUNCTION check_contractor_profile_quality(user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  quality_score NUMERIC := 100.0;
  user_record RECORD;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = user_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- 必須項目チェック（-20点）
  IF user_record.specialties IS NULL OR array_length(user_record.specialties, 1) = 0 THEN
    quality_score := quality_score - 20;
  END IF;

  -- 詳細プロフィール（-15点）
  IF user_record.detailed_bio IS NULL OR LENGTH(user_record.detailed_bio) < 100 THEN
    quality_score := quality_score - 15;
  END IF;

  -- 資格情報（-10点）
  IF user_record.qualifications IS NULL OR array_length(user_record.qualifications, 1) = 0 THEN
    quality_score := quality_score - 10;
  END IF;

  -- 地域情報（-10点）
  IF user_record.work_regions IS NULL OR array_length(user_record.work_regions, 1) = 0 THEN
    quality_score := quality_score - 10;
  END IF;

  -- 評価データの有無（-10点）
  IF NOT EXISTS (
    SELECT 1 FROM contractor_evaluations
    WHERE contractor_id = user_id
  ) THEN
    quality_score := quality_score - 10;
  END IF;

  -- 過去案件実績（-10点）
  IF NOT EXISTS (
    SELECT 1 FROM contracts
    WHERE contractor_id = user_id AND status = 'signed'
  ) THEN
    quality_score := quality_score - 10;
  END IF;

  -- プロフィール画像（-5点）
  IF user_record.avatar_url IS NULL THEN
    quality_score := quality_score - 5;
  END IF;

  RETURN GREATEST(0, quality_score);
END;
$$ LANGUAGE plpgsql;

-- 定期的な品質チェック実行
CREATE OR REPLACE FUNCTION run_quality_checks()
RETURNS void AS $$
BEGIN
  -- 受注者プロフィールの品質チェック
  INSERT INTO data_quality_checks (check_type, entity_type, entity_id, quality_score, is_valid, issues)
  SELECT
    'profile_completeness',
    'user',
    u.id,
    check_contractor_profile_quality(u.id),
    check_contractor_profile_quality(u.id) >= 70,
    jsonb_build_object(
      'missing_fields', ARRAY(
        SELECT unnest(ARRAY['specialties', 'detailed_bio', 'qualifications', 'work_regions'])
        WHERE CASE unnest(ARRAY['specialties', 'detailed_bio', 'qualifications', 'work_regions'])
          WHEN 'specialties' THEN u.specialties IS NULL
          WHEN 'detailed_bio' THEN u.detailed_bio IS NULL
          WHEN 'qualifications' THEN u.qualifications IS NULL
          WHEN 'work_regions' THEN u.work_regions IS NULL
        END
      )
    )
  FROM users u
  WHERE u.id IN (SELECT DISTINCT contractor_id FROM contracts);
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 UI/UX設計ガイドライン

### 発注者側の画面

#### 1. 案件作成時のAI推薦プレビュー

```typescript
// src/components/project-create/ai-preview.tsx
export function AIMatchingPreview({ projectDraft }: { projectDraft: ProjectDraft }) {
  const [preview, setPreview] = useState<ContractorPreview[]>([]);

  // リアルタイムプレビュー（デバウンス付き）
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (projectDraft.title && projectDraft.description) {
        const result = await getMatchingPreview(projectDraft);
        setPreview(result);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [projectDraft]);

  return (
    <div className="ai-preview">
      <h3>💡 この条件で推薦される受注者: {preview.length}人</h3>
      {preview.slice(0, 3).map(contractor => (
        <ContractorCard key={contractor.id} contractor={contractor} compact />
      ))}
      <p className="text-sm text-gray-600">
        案件を公開すると、これらの受注者に自動で通知されます
      </p>
    </div>
  );
}
```

#### 2. マッチング結果画面

```typescript
// src/components/matching/result-list.tsx
export function MatchingResultList({ projectId }: { projectId: string }) {
  const { contractors, loading } = useMatchingResults(projectId);

  return (
    <div className="matching-results">
      <h2>おすすめの受注者 ({contractors.length}人)</h2>

      {contractors.map((contractor, index) => (
        <ContractorCard
          key={contractor.id}
          contractor={contractor}
          rank={index + 1}
          showMatchReason={true}
          onInvite={() => handleInvite(contractor.id)}
        />
      ))}

      {/* フィードバックボタン */}
      <FeedbackButtons projectId={projectId} />
    </div>
  );
}

function ContractorCard({ contractor, rank, showMatchReason }: Props) {
  return (
    <div className="contractor-card">
      {/* ランク表示 */}
      <div className="rank-badge">#{rank}</div>

      {/* マッチ度 */}
      <div className="match-score">
        <CircularProgress value={contractor.match_score} />
        <span>{contractor.match_score}% マッチ</span>
      </div>

      {/* プロフィール情報 */}
      <div className="profile">
        <h3>{contractor.display_name}</h3>
        <div className="specialties">{contractor.specialties.join(', ')}</div>
        <div className="rating">⭐ {contractor.rating.toFixed(1)}</div>
      </div>

      {/* マッチング理由 */}
      {showMatchReason && (
        <div className="match-reason">
          <h4>なぜ推薦されたか:</h4>
          <ul>
            {contractor.match_reasoning.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* アクション */}
      <Button onClick={() => onInvite(contractor.id)}>
        優先招待する
      </Button>
    </div>
  );
}
```

#### 3. フィードバック機能

```typescript
// src/components/matching/feedback.tsx
export function MatchingFeedback({ projectId }: { projectId: string }) {
  const handleFeedback = async (contractorId: string, isGood: boolean, reason?: string) => {
    await supabase
      .from('ai_matching_history')
      .update({
        client_feedback: isGood ? 'good' : 'bad',
        rejection_reason: reason
      })
      .match({ project_id: projectId, contractor_id: contractorId });
  };

  return (
    <div className="feedback">
      <h3>この推薦は役に立ちましたか？</h3>
      <div className="feedback-buttons">
        <button onClick={() => handleFeedback(contractorId, true)}>
          👍 良い推薦
        </button>
        <button onClick={() => handleFeedback(contractorId, false)}>
          👎 合わない
        </button>
      </div>

      {/* 合わない理由を選択 */}
      <select onChange={(e) => handleFeedback(contractorId, false, e.target.value)}>
        <option value="">理由を選択...</option>
        <option value="skill_mismatch">スキルが合わない</option>
        <option value="location_far">地域が遠い</option>
        <option value="budget_mismatch">予算が合わない</option>
        <option value="availability">対応できない</option>
      </select>
    </div>
  );
}
```

### 受注者側の画面

#### 1. おすすめ案件フィード

```typescript
// src/components/contractor/recommended-projects.tsx
export function RecommendedProjects() {
  const { projects, loading } = useRecommendedProjects();

  return (
    <div className="recommended-projects">
      <h2>あなたにおすすめの案件</h2>

      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          matchScore={project.match_score}
          showMatchReason={true}
        />
      ))}
    </div>
  );
}

function ProjectCard({ project, matchScore, showMatchReason }: Props) {
  return (
    <div className="project-card">
      {/* マッチ度表示 */}
      <div className="match-indicator">
        <div className="match-bar" style={{ width: `${matchScore}%` }} />
        <span>{matchScore}% あなたの強みと一致</span>
      </div>

      {/* 案件情報 */}
      <h3>{project.title}</h3>
      <p>{project.description}</p>

      {/* なぜおすすめか */}
      {showMatchReason && (
        <div className="match-highlights">
          <h4>💡 おすすめの理由:</h4>
          <ul>
            <li>✅ あなたの専門分野「{project.matching_specialty}」に一致</li>
            <li>✅ 過去に類似案件を{project.similar_projects_count}件完了</li>
            <li>✅ 地域が近い（{project.distance}km圏内）</li>
          </ul>
        </div>
      )}

      <Button variant="primary">詳細を見る</Button>
    </div>
  );
}
```

#### 2. プロフィール最適化ガイド

```typescript
// src/components/contractor/profile-optimizer.tsx
export function ProfileOptimizer() {
  const { user } = useAuth();
  const { qualityScore, suggestions } = useProfileQuality(user.id);

  return (
    <div className="profile-optimizer">
      <h3>プロフィール完成度: {qualityScore}%</h3>

      <ProgressBar value={qualityScore} />

      <div className="suggestions">
        <h4>マッチ率を向上させるには:</h4>
        {suggestions.map((suggestion, i) => (
          <div key={i} className="suggestion-item">
            <span className="impact">+{suggestion.impact}%</span>
            <span className="text">{suggestion.text}</span>
            <Button size="sm" onClick={suggestion.action}>
              {suggestion.actionText}
            </Button>
          </div>
        ))}
      </div>

      {/* 例 */}
      {/* +15% 「詳細な自己紹介」を追加 [今すぐ追加] */}
      {/* +10% 「保有資格」を3つ以上登録 [資格を追加] */}
      {/* +5% 「対応可能地域」を設定 [地域を選択] */}
    </div>
  );
}
```

---

## 📈 モニタリングとアラート

### リアルタイムモニタリングダッシュボード

```typescript
// src/lib/monitoring/metrics.ts
export interface MatchingHealthMetrics {
  // パフォーマンス
  avgResponseTime: number;  // ms
  p95ResponseTime: number;
  p99ResponseTime: number;
  embeddingGenerationSuccessRate: number; // 0-1

  // 品質
  matchAccuracy: number;  // 招待→採用率
  applicationRate: number; // 推薦→応募率
  userSatisfactionScore: number; // 1-5

  // 公平性
  diversityScore: number;  // 0-100
  newContractorExposureRate: number; // 0-1
  recommendationGiniCoefficient: number; // 0-1（0が完全に均等）

  // システム
  cacheHitRate: number;  // 0-1
  errorRate: number;  // 0-1
  fallbackRate: number;  // フォールバック発動率

  // データ品質
  avgProfileQuality: number;  // 0-100
  embeddingCoverage: number;  // embeddings が作成されている割合
}

export const ALERT_THRESHOLDS = {
  responseTime: 3000,  // 3秒超えたらアラート
  errorRate: 0.05,     // 5%超えたらアラート
  matchAccuracy: 0.50, // 50%下回ったらアラート
  cacheHitRate: 0.60,  // 60%下回ったらアラート
  diversityScore: 50,  // 50下回ったらアラート
};

export async function collectHealthMetrics(): Promise<MatchingHealthMetrics> {
  const [
    performance,
    quality,
    fairness,
    system,
    dataQuality
  ] = await Promise.all([
    getPerformanceMetrics(),
    getQualityMetrics(),
    getFairnessMetrics(),
    getSystemMetrics(),
    getDataQualityMetrics()
  ]);

  return { ...performance, ...quality, ...fairness, ...system, ...dataQuality };
}

// アラート送信
export function checkAndSendAlerts(metrics: MatchingHealthMetrics) {
  const alerts: Alert[] = [];

  if (metrics.avgResponseTime > ALERT_THRESHOLDS.responseTime) {
    alerts.push({
      level: 'warning',
      message: `平均応答時間が${metrics.avgResponseTime}msに達しています`,
      action: 'キャッシュ戦略の見直しが必要です'
    });
  }

  if (metrics.errorRate > ALERT_THRESHOLDS.errorRate) {
    alerts.push({
      level: 'critical',
      message: `エラー率が${(metrics.errorRate * 100).toFixed(1)}%に達しています`,
      action: 'フォールバックシステムを確認してください'
    });
  }

  if (metrics.matchAccuracy < ALERT_THRESHOLDS.matchAccuracy) {
    alerts.push({
      level: 'warning',
      message: `マッチング精度が${(metrics.matchAccuracy * 100).toFixed(1)}%に低下しています`,
      action: 'モデルの再学習が必要な可能性があります'
    });
  }

  if (alerts.length > 0) {
    sendAlertsToSlack(alerts);
  }
}
```

### SQL関数でのメトリクス収集

```sql
-- マッチング精度の計算
CREATE OR REPLACE FUNCTION calculate_matching_accuracy(time_period INTERVAL DEFAULT '7 days')
RETURNS NUMERIC AS $$
DECLARE
  hired_count INTEGER;
  invited_count INTEGER;
BEGIN
  -- 招待された受注者の数
  SELECT COUNT(*) INTO invited_count
  FROM ai_matching_history
  WHERE was_invited = true
    AND created_at > NOW() - time_period;

  -- 実際に採用された受注者の数
  SELECT COUNT(*) INTO hired_count
  FROM ai_matching_history
  WHERE was_hired = true
    AND created_at > NOW() - time_period;

  IF invited_count = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((hired_count::NUMERIC / invited_count) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- ダイバーシティスコアの計算（ジニ係数）
CREATE OR REPLACE FUNCTION calculate_recommendation_diversity(time_period INTERVAL DEFAULT '30 days')
RETURNS NUMERIC AS $$
DECLARE
  gini_coefficient NUMERIC;
BEGIN
  WITH recommendation_counts AS (
    SELECT
      contractor_id,
      COUNT(*) as recommendation_count
    FROM ai_matching_history
    WHERE created_at > NOW() - time_period
    GROUP BY contractor_id
  ),
  sorted_counts AS (
    SELECT
      recommendation_count,
      ROW_NUMBER() OVER (ORDER BY recommendation_count) as rank,
      COUNT(*) OVER () as total_contractors
    FROM recommendation_counts
  )
  SELECT
    1 - (2 * SUM((total_contractors - rank + 0.5) * recommendation_count) /
    (total_contractors * SUM(recommendation_count))) INTO gini_coefficient
  FROM sorted_counts;

  -- ジニ係数を0-100スケールに変換（0 = 完全に均等、100 = 完全に偏り）
  RETURN ROUND((1 - COALESCE(gini_coefficient, 0)) * 100, 2);
END;
$$ LANGUAGE plpgsql;
```

---

## 🚀 段階的ロールアウト計画

### Phase 0: ダークローンチ（Week 1-2）

**目標**: AIマッチングを裏で動かし、ログのみ記録

```typescript
// src/app/api/projects/route.ts
export async function POST(request: NextRequest) {
  const project = await createProject(request);

  // ダークローンチ: AIマッチングを実行するが結果は表示しない
  runMatchingInBackground(project.id).catch(error => {
    console.error('Dark launch matching error:', error);
  });

  return NextResponse.json({ project });
}

async function runMatchingInBackground(projectId: string) {
  const suggestions = await getAIMatchingSuggestions(projectId);

  // ログのみ記録
  await logMatchingHistory(projectId, suggestions, {
    isDarkLaunch: true,
    wasShownToClient: false
  });
}
```

**検証項目**:
- [ ] エラー率 < 5%
- [ ] 平均応答時間 < 2秒
- [ ] 既存機能への影響なし

### Phase 1: ベータテスト（Week 3-4）

**目標**: 限定的な発注者にのみ公開

```typescript
// src/lib/feature-flags.ts
export function isAIMatchingEnabled(orgId: string): boolean {
  const betaOrgs = process.env.AI_MATCHING_BETA_ORGS?.split(',') || [];
  return betaOrgs.includes(orgId);
}

// src/components/project-detail/contractor-list.tsx
export function ContractorList({ projectId }: Props) {
  const { organization } = useOrganization();
  const showAIMatching = isAIMatchingEnabled(organization.id);

  if (showAIMatching) {
    return <AIMatchingResults projectId={projectId} />;
  }

  return <TraditionalContractorList projectId={projectId} />;
}
```

**ベータ参加組織**:
- 10社程度を選定
- 多様な規模・業種を含める
- フィードバック収集を積極的に行う

**検証項目**:
- [ ] ユーザー満足度 > 4.0/5.0
- [ ] マッチング精度 > 60%
- [ ] バグ報告数 < 5件/week

### Phase 2: 段階的展開（Month 2）

**目標**: 全発注者に公開（ただし「おすすめ」として）

```typescript
// 全ユーザーに表示するが、従来の方法も併用
export function ContractorList({ projectId }: Props) {
  return (
    <>
      {/* AI推薦 */}
      <section>
        <h2>💡 おすすめの受注者</h2>
        <AIMatchingResults projectId={projectId} limit={5} />
      </section>

      {/* 従来の一覧 */}
      <section>
        <h2>すべての受注者</h2>
        <TraditionalContractorList projectId={projectId} />
      </section>
    </>
  );
}
```

**A/Bテスト実施**:
- グループA: AI推薦あり
- グループB: AI推薦なし
- メトリクス比較: 採用率、満足度、採用までの時間

**検証項目**:
- [ ] マッチング精度 > 70%
- [ ] AI推薦経由の採用率 > 従来の採用率
- [ ] クリティカルバグなし

### Phase 3: 全面展開（Month 3）

**目標**: デフォルトのマッチング方法に

```typescript
// デフォルトでAI推薦を表示
export function ContractorList({ projectId }: Props) {
  const [view, setView] = useState<'ai' | 'all'>('ai');

  return (
    <>
      <div className="view-toggle">
        <button onClick={() => setView('ai')} active={view === 'ai'}>
          おすすめ順
        </button>
        <button onClick={() => setView('all')} active={view === 'all'}>
          すべて表示
        </button>
      </div>

      {view === 'ai' ? (
        <AIMatchingResults projectId={projectId} />
      ) : (
        <TraditionalContractorList projectId={projectId} />
      )}
    </>
  );
}
```

**検証項目**:
- [ ] マッチング精度 > 80%
- [ ] ユーザー満足度 > 4.5/5.0
- [ ] 継続的な改善サイクルが確立

---

## 📚 追加の参考リソース

### セキュリティとプライバシー
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)
- [個人情報保護法ガイドライン](https://www.ppc.go.jp/personalinfo/legal/)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

### 機械学習の公平性
- [Google's ML Fairness Guidelines](https://developers.google.com/machine-learning/fairness-overview)
- [Fairness Indicators](https://www.tensorflow.org/responsible_ai/fairness_indicators/guide)

### モニタリングとアラート
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)

---

## 🎯 成功の定義

### ビジネスメトリクス

| メトリクス | 現状（想定） | 目標（6ヶ月後） |
|-----------|-------------|----------------|
| マッチング精度（採用率） | 30% | 80% |
| 採用までの平均時間 | 7日 | 3日 |
| ユーザー満足度 | 3.5/5.0 | 4.5/5.0 |
| プラットフォーム利用率 | 60% | 85% |
| 新規受注者の初受注までの期間 | 60日 | 30日 |

### 技術メトリクス

| メトリクス | 目標 |
|-----------|------|
| API応答時間（P95） | < 2秒 |
| エラー率 | < 1% |
| キャッシュヒット率 | > 80% |
| データ品質スコア平均 | > 75点 |
| ダイバーシティスコア | > 70点 |

---

**作成日**: 2025-10-15
**最終更新**: 2025-10-16
**バージョン**: 2.0.0
**レビュー担当**: 開発チーム
**関連ドキュメント**: [COMPATIBILITY_ANALYSIS.md](./COMPATIBILITY_ANALYSIS.md)

