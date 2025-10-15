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

**作成日**: 2025-10-15  
**最終更新**: 2025-10-15  
**バージョン**: 1.0.0

