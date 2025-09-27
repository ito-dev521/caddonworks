# データベーススキーマ変更の影響範囲文書

## 現在の状況

### 不存在テーブル
1. **completion_reports** - 業務完了届テーブル
   - 影響API: `/api/completion-reports/*`
   - 影響ページ: `/contracts` (業務完了届タブ)
   - 対応状況: エラーハンドリング実装済み（空配列返却）

### カラム不整合
1. **invoices.created_at** → **invoices.updated_at**
   - 影響API: `/api/invoices/route.ts`
   - 修正状況: 完了（3箇所修正）

## データベース変更時の確認プロセス

### 1. 影響範囲調査
```bash
# テーブル/カラムを参照するAPIファイル検索
find src/app/api -name "*.ts" -exec grep -l "table_name\|column_name" {} \;

# フロントエンドファイル検索
find src/app -name "*.tsx" -exec grep -l "table_name\|column_name" {} \;
```

### 2. 関連APIの修正
- データベースクエリの更新
- エラーハンドリングの追加
- レスポンス形式の調整

### 3. フロントエンドの修正
- インターフェース定義の更新
- コンポーネントの表示ロジック調整
- エラー表示の実装

### 4. テスト確認
- API動作確認
- フロントエンド表示確認
- エラーハンドリング確認

## 主要テーブルと影響範囲

### 完了済み修正
| テーブル | 問題 | 影響API | 影響ページ | 修正状況 |
|---------|------|---------|------------|----------|
| invoices | created_at不存在 | /api/invoices | /invoices | ✅完了 |
| completion_reports | テーブル不存在 | /api/completion-reports/* | /contracts | ✅エラーハンドリング |

### 正常動作テーブル
- users ✅
- memberships ✅
- favorite_members ✅
- deliverables ✅
- projects ✅
- contracts ✅
- organizations ✅

## 推奨事項
1. テーブル/カラム変更前に必ず影響範囲調査を実施
2. APIのエラーハンドリングを強化
3. フロントエンドでの適切なエラー表示実装
4. 段階的なデプロイとテスト確認