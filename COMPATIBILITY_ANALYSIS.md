# AIマッチング機能 - 互換性分析レポート

## 概要

このドキュメントは、AIマッチング機能の実装に必要なデータベース変更が既存システムに与える影響を分析したものです。

---

## 既存テーブル構造

### 主要テーブル一覧

| テーブル名 | 用途 | 主要カラム |
|-----------|------|-----------|
| users | ユーザー情報 | id, email, display_name, specialties, qualifications, experience_years, member_level, rating |
| projects | 案件情報 | id, title, description, category, budget, location, status, org_id, contractor_id |
| contracts | 契約情報 | id, project_id, contractor_id, bid_amount, status, signed_at |
| bids | 入札情報 | id, project_id, contractor_id, bid_amount, proposal, status |
| contractor_evaluations | 評価情報 | id, contract_id, contractor_id, overall_rating, deadline_score, quality_score |
| priority_invitations | 優先招待 | id, project_id, contractor_id, response, invited_at |
| organizations | 組織情報 | id, name, box_folder_id |
| memberships | メンバーシップ | user_id, org_id, role |

---

## 新規追加要素

### 1. 新規テーブル

| テーブル名 | 用途 | 既存テーブルとの関係 |
|-----------|------|-------------------|
| ai_matching_history | マッチング履歴 | projects.id, users.id を参照 |
| project_embeddings | 案件ベクトル表現 | projects.id を参照 |
| contractor_profile_embeddings | 受注者ベクトル表現 | users.id を参照 |
| similarity_cache | 類似度キャッシュ | projects.id, users.id を参照 |
| contractor_skill_history | スキル履歴 | users.id を参照 |
| project_success_factors | 成功要因分析 | projects.id, contracts.id を参照 |
| ai_data_consent | データ同意管理 | users.id を参照 |
| data_quality_checks | データ品質チェック | 汎用（複数テーブルのIDを参照） |
| matching_fairness_tracker | 公平性トラッカー | users.id を参照 |
| contractor_performance_stats | 実績統計ビュー | contracts, projects, evaluations から作成 |

### 2. 既存テーブルへのカラム追加

#### usersテーブル

| カラム名 | 型 | デフォルト値 | NULL許可 | 説明 |
|---------|-----|------------|---------|------|
| current_workload | INTEGER | 0 | NO | 現在の稼働中プロジェクト数 |
| max_concurrent_projects | INTEGER | 3 | NO | 同時進行可能な最大プロジェクト数 |
| availability_status | TEXT | 'available' | NO | 稼働状況 |
| next_available_date | DATE | NULL | YES | 次回対応可能日 |
| detailed_bio | TEXT | NULL | YES | 詳細な自己紹介 |
| past_projects_summary | TEXT | NULL | YES | 過去案件の要約 |
| technical_skills_description | TEXT | NULL | YES | 技術スキルの詳細 |
| specialization_areas | TEXT[] | '{}' | NO | 細かい専門分野タグ |
| work_style_description | TEXT | NULL | YES | 仕事のスタイルや強み |
| preferred_project_types | TEXT[] | NULL | YES | 希望する案件タイプ |
| work_regions | TEXT[] | '{}' | NO | 対応可能地域 |
| base_location | TEXT | NULL | YES | 活動拠点 |
| remote_work_available | BOOLEAN | true | NO | リモートワーク対応可否 |
| max_commute_distance | INTEGER | NULL | YES | 通勤可能距離（km） |

#### projectsテーブル

| カラム名 | 型 | デフォルト値 | NULL許可 | 説明 |
|---------|-----|------------|---------|------|
| tags | TEXT[] | '{}' | NO | 案件の特徴タグ |
| technical_requirements | TEXT[] | '{}' | NO | 必要な技術要件 |
| required_certifications | TEXT[] | '{}' | NO | 必須資格 |
| difficulty_level | INTEGER | NULL | YES | 難易度（1-5） |
| estimated_hours | INTEGER | NULL | YES | 推定作業時間 |
| work_style | TEXT | NULL | YES | 作業スタイル |
| location_flexibility | BOOLEAN | false | NO | リモートワーク可能か |
| location_coordinates | POINT | NULL | YES | 緯度経度 |

---

## 互換性分析

### ✅ 安全な変更

#### 1. 新規テーブルの追加

**影響**: なし

**理由**:
- すべての新規テーブルは既存テーブルに対する参照（外部キー）のみを持つ
- 既存テーブルのデータ構造を変更しない
- 既存のクエリには一切影響しない
- 新規テーブルへのアクセスは新しいAPIエンドポイントのみで行う

**外部キー制約**:
```sql
-- すべての外部キー制約は ON DELETE CASCADE で設定
-- 親レコードが削除されると子レコードも自動削除される
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
```

#### 2. カラム追加（DEFAULT値あり）

**影響**: なし

**理由**:
- すべての新規カラムはDEFAULT値を持つか、NULL許可
- 既存のINSERT文は引き続き動作する
- 既存のSELECT文は新しいカラムを含まなくても動作する
- アプリケーションコードの変更は段階的に可能

**例**:
```sql
-- 既存のINSERT文（変更不要）
INSERT INTO users (email, display_name) VALUES ('test@example.com', 'Test User');

-- 新しいカラムは自動的にDEFAULT値が設定される
-- current_workload = 0
-- max_concurrent_projects = 3
-- availability_status = 'available'
```

#### 3. インデックスの追加

**影響**: 軽微（INSERTパフォーマンス）

**理由**:
- 新規インデックスはSELECTクエリを高速化
- INSERT/UPDATE時のオーバーヘッドは極めて小さい（数ミリ秒）
- 既存のクエリには影響しない

#### 4. ビューの追加

**影響**: なし

**理由**:
- ビュー（contractor_performance_stats）は読み取り専用
- 既存テーブルのデータを変更しない
- 複雑なJOINクエリをカプセル化してパフォーマンス向上

---

### ⚠️ 注意が必要な変更

#### 1. RLS（Row Level Security）ポリシー

**影響**: セキュリティ向上、パフォーマンス影響

**対策**:
- 新規テーブルには適切なRLSポリシーを設定
- 既存のauth.uid()を使用した認証を継承
- サービスロールキーでの管理操作は影響なし

```sql
-- 例: ai_matching_historyテーブルのRLS
CREATE POLICY "OrgAdmins can view matching history for their projects"
ON ai_matching_history FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN memberships m ON p.org_id = m.org_id
    JOIN users u ON m.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND m.role = 'OrgAdmin'
  )
);
```

#### 2. pgvector拡張機能

**影響**: データベース拡張のインストールが必要

**対策**:
```sql
-- Supabaseダッシュボードで実行
CREATE EXTENSION IF NOT EXISTS vector;
```

**注意点**:
- Supabaseでは標準サポート（追加料金なし）
- ローカル開発環境ではpgvectorのインストールが必要

#### 3. ストレージ増加

**現在の見積もり**:
- Embeddings: 約100MB（受注者500人 + 案件100件）
- マッチング履歴: 約50MB/月
- キャッシュテーブル: 約20MB

**1年後の見積もり**:
- Embeddings: 約400MB
- マッチング履歴: 約600MB
- キャッシュテーブル: 約100MB
- **合計**: 約1.1GB

**対策**:
- 古いマッチング履歴の定期アーカイブ（6ヶ月以上経過）
- キャッシュの自動期限切れ処理（7日間）

---

## 既存機能への影響チェックリスト

### ✅ 影響なし

- [x] ユーザー登録・ログイン
- [x] 案件作成・編集・削除
- [x] 入札の作成・更新
- [x] 契約の作成・署名
- [x] 評価の投稿
- [x] チャット機能
- [x] ファイル管理
- [x] 請求書生成
- [x] Box統合
- [x] メール通知
- [x] プロフィール表示
- [x] 案件履歴表示
- [x] お気に入り機能
- [x] 優先招待機能

### 🔄 段階的な統合が必要

- [ ] **プロフィール編集画面**: 新しいフィールド（detailed_bio, specialization_areas等）を追加
- [ ] **案件作成画面**: タグシステム（tags, technical_requirements）を追加
- [ ] **マッチングAPI**: 新しいAIマッチングエンドポイントを追加
- [ ] **受注者一覧**: 稼働状況（availability_status）を表示

---

## マイグレーション戦略

### Phase 1: 基盤整備（Week 1）

```bash
# 1. 新規カラムの追加（既存データに影響なし）
psql -f migrations/01_add_user_availability_fields.sql
psql -f migrations/02_add_project_tags_and_requirements.sql
psql -f migrations/03_add_user_profile_fields.sql
psql -f migrations/04_add_project_location_fields.sql
```

**検証**:
```sql
-- 既存データが正常に取得できることを確認
SELECT * FROM users LIMIT 10;
SELECT * FROM projects LIMIT 10;
```

### Phase 2: 統計・履歴テーブル（Week 2）

```bash
# 2. 新規テーブルの作成
psql -f migrations/05_create_matching_history_table.sql
psql -f migrations/06_create_performance_stats_view.sql
psql -f migrations/07_create_consent_table.sql
psql -f migrations/08_create_fairness_tracker.sql
```

**検証**:
```sql
-- ビューが正常に動作することを確認
SELECT * FROM contractor_performance_stats LIMIT 5;
```

### Phase 3: AI関連テーブル（Week 3）

```bash
# 3. pgvectorとembeddingsテーブル
psql -f migrations/09_enable_pgvector.sql
psql -f migrations/10_create_embeddings_tables.sql
psql -f migrations/11_create_similarity_cache.sql
psql -f migrations/12_create_skill_history.sql
psql -f migrations/13_create_success_factors.sql
```

**検証**:
```sql
-- ベクトル検索が動作することを確認
SELECT 1 - (profile_embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM contractor_profile_embeddings
LIMIT 1;
```

### Phase 4: データ品質管理（Week 4）

```bash
# 4. データ品質とモニタリング
psql -f migrations/14_create_data_quality_checks.sql
psql -f migrations/15_create_monitoring_functions.sql
```

---

## ロールバック計画

### 各フェーズのロールバック手順

#### Phase 1のロールバック
```sql
-- 追加したカラムを削除
ALTER TABLE users
  DROP COLUMN IF EXISTS current_workload,
  DROP COLUMN IF EXISTS max_concurrent_projects,
  DROP COLUMN IF EXISTS availability_status,
  DROP COLUMN IF EXISTS next_available_date,
  DROP COLUMN IF EXISTS detailed_bio,
  DROP COLUMN IF EXISTS past_projects_summary,
  DROP COLUMN IF EXISTS technical_skills_description,
  DROP COLUMN IF EXISTS specialization_areas,
  DROP COLUMN IF EXISTS work_style_description,
  DROP COLUMN IF EXISTS preferred_project_types,
  DROP COLUMN IF EXISTS work_regions,
  DROP COLUMN IF EXISTS base_location,
  DROP COLUMN IF EXISTS remote_work_available,
  DROP COLUMN IF EXISTS max_commute_distance;

ALTER TABLE projects
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS technical_requirements,
  DROP COLUMN IF EXISTS required_certifications,
  DROP COLUMN IF EXISTS difficulty_level,
  DROP COLUMN IF EXISTS estimated_hours,
  DROP COLUMN IF EXISTS work_style,
  DROP COLUMN IF EXISTS location_flexibility,
  DROP COLUMN IF EXISTS location_coordinates;
```

#### Phase 2-4のロールバック
```sql
-- 新規テーブルを削除（外部キーのCASCADEにより関連データも削除）
DROP TABLE IF EXISTS data_quality_checks CASCADE;
DROP TABLE IF EXISTS contractor_skill_history CASCADE;
DROP TABLE IF EXISTS project_success_factors CASCADE;
DROP TABLE IF EXISTS similarity_cache CASCADE;
DROP TABLE IF EXISTS contractor_profile_embeddings CASCADE;
DROP TABLE IF EXISTS project_embeddings CASCADE;
DROP TABLE IF EXISTS matching_fairness_tracker CASCADE;
DROP TABLE IF EXISTS ai_data_consent CASCADE;
DROP TABLE IF EXISTS ai_matching_history CASCADE;
DROP VIEW IF EXISTS contractor_performance_stats CASCADE;
```

---

## パフォーマンステスト

### テスト項目

| テスト項目 | 目標 | 測定方法 |
|-----------|------|---------|
| カラム追加後のINSERTパフォーマンス | < 50ms | 1000件のユーザー登録 |
| カラム追加後のSELECTパフォーマンス | < 100ms | 既存のユーザー一覧取得 |
| ベクトル検索パフォーマンス | < 200ms | 類似受注者10件の検索 |
| マッチングAPI全体 | < 2秒 | 案件に対する推薦10件生成 |
| キャッシュヒット時 | < 50ms | キャッシュから結果取得 |

### テストスクリプト例

```sql
-- 既存クエリのパフォーマンステスト
EXPLAIN ANALYZE
SELECT * FROM users WHERE member_level = 'advanced' LIMIT 10;

-- 新しいカラムを含むクエリのパフォーマンステスト
EXPLAIN ANALYZE
SELECT * FROM users
WHERE member_level = 'advanced'
  AND availability_status = 'available'
LIMIT 10;

-- ベクトル検索のパフォーマンステスト
EXPLAIN ANALYZE
SELECT user_id, 1 - (profile_embedding <=> $1::vector) AS similarity
FROM contractor_profile_embeddings
ORDER BY profile_embedding <=> $1::vector
LIMIT 10;
```

---

## モニタリングと警告

### 監視すべきメトリクス

1. **データベースパフォーマンス**
   - 平均クエリ時間
   - インデックス使用率
   - テーブルスキャン頻度

2. **ストレージ使用量**
   - embeddingsテーブルのサイズ
   - マッチング履歴の増加率
   - キャッシュテーブルのサイズ

3. **APIパフォーマンス**
   - マッチングAPI応答時間
   - エラー率
   - キャッシュヒット率

4. **データ品質**
   - プロフィール記入率
   - Embeddings生成成功率
   - データ品質スコア

---

## 結論

### ✅ 安全性評価: **高い**

新規追加するテーブルとカラムは既存システムに対して：
- **データ整合性**: 外部キー制約で保護されている
- **後方互換性**: 既存のクエリは変更不要
- **段階的移行**: フェーズごとに検証可能
- **ロールバック**: 各フェーズでロールバック可能

### 🎯 推奨事項

1. **本番環境への適用前に**:
   - ステージング環境で全フェーズをテスト
   - パフォーマンステストを実施
   - ロールバック手順を確認

2. **本番環境での適用**:
   - メンテナンス時間帯に実施
   - Phase 1から順次適用
   - 各フェーズ後に既存機能をテスト

3. **適用後の監視**:
   - 最初の24時間は詳細モニタリング
   - エラーログの監視
   - パフォーマンスメトリクスの追跡

---

**作成日**: 2025-10-16
**レビュー担当**: 開発チーム
**承認**: 必要
