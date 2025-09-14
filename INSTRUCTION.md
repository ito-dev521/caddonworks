# 土木設計業務専用 業務発注システム 指示書
（Box API連携 + VDR的ファイル管理 + 評価機能 + バッチ運用 + 会計機能）

---

## 1. システム概要
本システムは **土木設計業務専用の業務発注プラットフォーム** である。  
以下をコア要件とする：  
- 発注/受注マッチング（個人事業主モデル、出勤管理は不要）  
- **セキュアなファイル管理（Box API連携, VDR機能）**  
- **土木特化の評価機能**（品質・基準適合・数量整合）  
- **バッチ処理による自動検査/集計**  
- **会計処理フロー**（運営会社が受注者に支払い、発注者に請求）  

---

## 2. アーキテクチャ
- **Auth/DB**: Supabase（Postgres + RLS）  
- **フロント**: Next.js (App Router) + TypeScript + TailwindCSS  
- **API層**: Next.js Route Handlers / Server Actions, 軽量BFF (Node.js/.NET 8)  
- **ファイル管理**: Box API  
- **バッチ/非同期**: Cloud Run / Functions + Queue (SQS/RabbitMQ) + Scheduler (Supabase Cron等)  
- **監査ログ**: audit_logs (WORM相当運用) + Box Events API  
- **ウイルススキャン**: ClamAV (アップロード後非同期)  
- **CAD変換**: APS (Autodesk Platform Services) or ODA SDK  
- **通知**: メール + 将来はプッシュ通知  

---

## 3. 権限モデル
- 発注者: OrgAdmin / Staff  
- 受注者: Contractor  
- 監督員: Reviewer  
- 監査: Auditor (read-only)  

ゼロトラスト設計:  
- プロジェクト単位の閉域（VDR）  
- NDA同意必須（Supabase Authで制御）  
- チェックイン/アウトによるファイル編集ロック  
- ダウンロードは承認フローを経て一時許可  

---

## 4. データモデル（主要テーブル）
- users（プロフィール、分野、資格、実績）  
- organizations / memberships（組織管理）  
- projects（案件情報、box_folder_id）  
- rfp_items（成果物定義：平面図、縦横断、数量表等）  
- bids（見積/提案）  
- contracts（契約条件、NDA参照、支払条件）  
- deliverables（提出物、版管理、承認フロー）  
- files（Box file_id, ハッシュ, scan_status）  
- reviews（土木特化評価：品質/基準適合/数量整合/納期/コミュ/手戻り率）  
- audit_logs（閲覧・DL・承認など全操作記録）  
- jobs（バッチ・非同期処理）  
- standards_refs（適用基準リンク集：道路構造令/土木学会/NEXCO 等）  
- invoices（発注者への請求）  
- payouts（受注者への支払）  

### テーブル定義（詳細）
```sql
-- users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  display_name text not null,
  email text not null,
  specialties text[] not null default '{}',
  qualifications text[] not null default '{}',
  portfolio_url text,
  rating numeric check (rating >= 0 and rating <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists users_email_lower_idx on users (lower(email));

-- organizations
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  billing_email text,
  system_fee numeric not null default 50000,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists organizations_name_lower_idx on organizations (lower(name));

-- memberships
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('OrgAdmin','Staff','Contractor','Reviewer','Auditor')),
  created_at timestamptz not null default now()
);
create unique index if not exists memberships_org_user_uk on memberships (org_id, user_id);

-- projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','bidding','contracted','in_progress','submitted','completed','cancelled')),
  box_folder_id text,
  standards_set jsonb,
  due_date date,
  visibility text not null default 'private' check (visibility in ('private','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_org_status_idx on projects (org_id, status);

-- standards_refs（基準リンク集）
create table if not exists standards_refs (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  url text,
  category text,
  tags text[] not null default '{}',
  metadata jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists standards_refs_code_lower_uk on standards_refs (lower(code));

-- rfp_items（成果物定義）
create table if not exists rfp_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  item_type text not null,
  title text not null,
  description text,
  required boolean not null default true,
  standards jsonb,
  expected_format text,
  created_at timestamptz not null default now()
);
create index if not exists rfp_items_project_idx on rfp_items (project_id);

-- bids
create table if not exists bids (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  bidder_org_id uuid not null references organizations(id) on delete cascade,
  bidder_user_id uuid references users(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  message text,
  status text not null default 'submitted' check (status in ('submitted','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists bids_unique_bidder_per_project on bids (project_id, bidder_org_id);

-- contracts
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contractor_org_id uuid not null references organizations(id) on delete cascade,
  contractor_user_id uuid references users(id) on delete set null,
  nda_url text,
  payment_terms text,
  terms jsonb,
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft','active','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contracts_project_idx on contracts (project_id);

-- deliverables
create table if not exists deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  rfp_item_id uuid references rfp_items(id) on delete set null,
  contract_id uuid references contracts(id) on delete set null,
  name text not null,
  version int not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected')),
  checklist jsonb,
  approved_by uuid references users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deliverables_project_idx on deliverables (project_id);

-- files（Box連携/版管理/DLP）
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid references deliverables(id) on delete cascade,
  box_file_id text not null,
  version int not null default 1 check (version > 0),
  is_current boolean not null default true,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  scan_status text not null default 'pending' check (scan_status in ('pending','clean','infected','error')),
  preview_url text,
  ocr_text text,
  dlp_flag boolean not null default false,
  uploaded_by uuid references users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);
create index if not exists files_deliverable_version_idx on files (deliverable_id, version desc);
create index if not exists files_box_file_id_idx on files (box_file_id);

-- reviews（評価）
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contract_id uuid references contracts(id) on delete set null,
  reviewer_user_id uuid not null references users(id) on delete cascade,
  target_user_id uuid references users(id) on delete set null,
  quality smallint not null check (quality between 1 and 5),
  compliance smallint not null check (compliance between 1 and 5),
  quantity_integrity smallint not null check (quantity_integrity between 1 and 5),
  schedule smallint not null check (schedule between 1 and 5),
  communication smallint not null check (communication between 1 and 5),
  rework_rate smallint not null check (rework_rate between 1 and 5),
  comment text,
  computed_score numeric,
  created_at timestamptz not null default now()
);
create unique index if not exists reviews_unique_reviewer_per_contract on reviews (contract_id, reviewer_user_id);

-- audit_logs（監査用操作ログ）
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  org_id uuid references organizations(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  target_type text not null,
  target_id uuid,
  action text not null,
  ip inet,
  user_agent text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_project_time_idx on audit_logs (project_id, created_at desc);

-- jobs（非同期/バッチ）
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  payload jsonb,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  attempts int not null default 0,
  last_error text,
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists jobs_status_scheduled_idx on jobs (status, coalesce(scheduled_at, created_at));

-- invoices（請求）
-- 既存の定義を踏襲。金額はnumericで扱う（必要に応じてprecisionを設定）。
-- create table invoices (...) は本書9章に記載済み。

-- payouts（支払）
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  contractor_org_id uuid not null references organizations(id) on delete cascade,
  contractor_user_id uuid references users(id) on delete set null,
  period date not null,
  amount numeric(14,2) not null check (amount >= 0),
  status text not null default 'scheduled' check (status in ('scheduled','paid','on_hold','cancelled')),
  paid_at timestamptz,
  method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payouts_org_period_idx on payouts (contractor_org_id, period);
```

---

## 5. セキュアなファイル管理（Box API）
- 案件作成時に Box フォルダを自動生成 (`projects.box_folder_id`)  
- アップロード: メタ情報必須（図面種別/版/図番/基準/縮尺）  
- プレビュー優先（PDF/画像化, 透かし付き）  
- ダウンロードは承認による短命署名URL + IP制御  
- ウイルススキャン + SHA-256ハッシュ保存  
- 版管理: deliverable_id + version、差分プレビュー可  
- 提出時にチェックリスト（基準表JSON）必須添付  
- DLP: OCRテキスト抽出 → NGワード/社外秘判定  

---

## 6. ワークフロー
1. 案件登録（発注者, 基準セット選択, Boxフォルダ生成）  
2. 入札/指名（限定公開/公開入札, Q&A掲示板）  
3. 契約（NDA承諾 → 契約 → 権限付与）  
4. 設計・中間提出（チェックイン/アウト, 版管理, QAログ）  
5. 自動チェック（バッチ処理: 図番/縮尺/数量整合）  
6. 最終提出 → 二重承認（担当者+監督員）  
7. 納品・検収・評価（相互レビュー）  
8. 支払処理・会計フロー  

---

## 7. バッチ処理
- DWG/DXF → PDF/PNG変換  
- PDF → サムネイル画像化  
- ClamAVスキャン  
- AI/ルール検査（凡例・縮尺・数量整合）  
- 日次スナップショット（暗号化）  
- 期限管理（納期リマインド、削除期限通知）  
- 月次集計（売上・利用額・KPIレポート）  

---

## 8. 評価機能
- 発動条件：検収完了後のみ  
- 項目：品質 / 基準適合 / 数量整合 / 納期 / コミュニケーション / 手戻り率  
- スコア計算：加重平均 + 案件規模補正 + 直近重み  
- 不正対策：相互高評価偏重検知 → 中央値採用  
- レビュー本文はモデレーション（NG語/個人情報検出）  

---

## 9. 会計フロー
- **受注者への支払**  
  - 運営会社が毎月20日締めで一括集計し、月末支払  
  - 受注者は請求書不要（マイページで支払予定・履歴を確認）  

- **発注者への請求**  
  - 運営会社 → 発注者へ月次請求書発行  
  - 請求額 = 利用額合計 + (利用額合計 × 0.3) + 固定システム利用料  
  - システム利用料は全社共通固定（例: ¥50,000/月）  

### invoicesテーブル
```sql
create table invoices (
  id uuid primary key default gen_random_uuid(),
  client_org_id uuid references organizations(id),
  base_amount numeric not null,
  fee_amount numeric not null,
  system_fee numeric not null default 50000,
  total_amount numeric not null,
  status text check (status in ('draft','issued','paid')),
  issue_date date,
  due_date date,
  pdf_url text,
  period date
);
```

---

## 10. 管理画面（3層）

### 運営会社ダッシュボード
- **サマリー**: 売上合計 / 手数料 / システム料 / 受注者支払額
- **発注者請求一覧**（請求書DL）
- **受注者支払一覧**（支払ステータス管理）
- **月次レポート**（グラフ, KPI）
- **監査ログ検索**

### 発注者ダッシュボード
- **月次利用額と請求予定額**（+30%手数料 + 固定料）
- **請求書PDFダウンロード**
- **案件別内訳**
- **支払状況確認**

### 受注者マイページ
- **月次報酬合計と支払予定日**
- **案件別報酬内訳**
- **過去支払履歴**（CSV/Excel出力）
- **契約条件・納期確認**

---

## 11. UI設計指針（Web + React Native 統一）

### 1. 基本方針
- 技術は **React 系で統一**（Web = Next.js, モバイル = React Native + Expo）。
- **Supabase Auth/DB** を共通利用。
- **Box API** は必ず BFF（Next.js API Route / Edge Functions）経由で呼び出す。
- デザインシステム（カラー/タイポグラフィ/アイコン）を共通化し、Web/アプリ間で再利用。

---

### 2. 利用シーン別のUI戦略

#### Web（PC前提）
- 表形式・詳細画面を中心とした業務向けUI。
- ファイル管理・会計管理・監査ログなど大量データの可視化を最適化。
- 主な対象：
  - 発注者（案件管理・請求確認）
  - 受注者（案件提出・報酬確認）
  - 運営者（案件全体管理・会計・監査）

#### モバイル（React Native）
- リスト表示・簡易カード表示を中心にした軽量UI。
- 操作は最小限、**確認用途が中心**。
- 主な対象：
  - 発注者：契約確認、請求書DL、支払ステータス確認
  - 受注者：報酬額確認、支払予定確認
- プッシュ通知による即時性の担保（契約締結、請求発行、支払完了通知）。

---

### 3. 共通デザインルール
- **カラー**：ブルー基調 + アクセントにグリーン。
- **フォント**：Sans-serif（Web/モバイル共通指定）。
- **アイコン**：Lucide React / Expo Vector Icons。
- **レイアウト**：
  - PC：グリッド/テーブルベース。
  - モバイル：リスト/アコーディオン型。

---

### 4. UI構成（3層）

#### 1) 運営会社ダッシュボード（会計タブ）
【Web専用（PC最適化）】
- サマリー：総売上 / 手数料収入 / システム利用料収入 / 受注者支払予定。
- 発注者請求一覧（請求書DL機能付き）。
- 受注者支払一覧（締め日ごとの集計）。
- 月次レポート（グラフ/推移）。

#### 2) 発注者ダッシュボード（請求タブ）
【Web + モバイル両対応】
- サマリー：利用額合計 / 手数料 / システム利用料 / 請求総額。
- 請求書PDFダウンロード。
- 案件別利用額一覧。
- 支払ステータス・期日確認。

#### 3) 受注者マイページ（報酬タブ）
【Web + モバイル両対応】
- サマリー：今月の受注額合計 / 支払予定日 / ステータス。
- 案件別報酬内訳。
- 過去支払履歴（CSV/Excel出力）。

---

### 5. モバイル優先機能（React Native）
- 契約確認（契約内容・金額・納期・契約PDFプレビュー）。
- 請求確認（発注者向け請求額・請求書DL）。
- 支払確認（受注者向け報酬額・支払予定日）。
- 通知（契約締結、請求発行、支払完了）。
- 将来的な拡張：写真アップロード、オフラインPDF閲覧。

---

### 6. 実装パターン例（Next.js + Tailwind）
```tsx
{/* PC表示：テーブル */}
<table className="hidden md:table w-full">
  <thead>
    <tr><th>発注者</th><th>利用額</th><th>請求総額</th></tr>
  </thead>
  <tbody>
    {invoices.map(i => (
      <tr key={i.id}>
        <td>{i.client_org}</td>
        <td>¥{i.base_amount}</td>
        <td>¥{i.total_amount}</td>
      </tr>
    ))}
  </tbody>
</table>

{/* モバイル表示：リスト */}
<div className="block md:hidden">
  {invoices.map(i => (
    <div key={i.id} className="border-b p-2">
      <div className="font-bold">{i.client_org}</div>
      <div>利用額: ¥{i.base_amount}</div>
      <div>請求総額: ¥{i.total_amount}</div>
      <a href={i.pdf_url} className="text-blue-600">請求書PDF</a>
    </div>
  ))}
</div>
```

---

### 7. ロードマップ（UI）
- **フェーズ1（現行）**
  - Next.js Web版完成（PC最適化、スマホ閲覧はレスポンシブ）。
- **フェーズ2（中期）**
  - React Native アプリ開発（Expo利用）。
  - 契約/請求/支払確認 + プッシュ通知。
- **フェーズ3（拡張）**
  - 図面プレビュー（Box API透かし付きリンクをWebViewで表示）。
  - カメラ機能（現場写真アップロード）。
  - オフライン対応（PDF一時保存）。

---

✅ この `INSTRUCTION.md` を Claude Code に渡せば、  
案件作成 → Boxフォルダ生成 → ファイル管理 → 評価 → 請求/支払 まで一貫したコード生成の土台になります。
