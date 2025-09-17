"use strict";(()=>{var e={};e.id=1098,e.ids=[1098],e.modules={30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},57310:e=>{e.exports=require("url")},59796:e=>{e.exports=require("zlib")},70066:(e,i,s)=>{s.r(i),s.d(i,{headerHooks:()=>N,originalPathname:()=>p,patchFetch:()=>O,requestAsyncStorage:()=>d,routeModule:()=>u,serverHooks:()=>I,staticGenerationAsyncStorage:()=>T,staticGenerationBailout:()=>_});var t={};s.r(t),s.d(t,{POST:()=>c});var r=s(95419),o=s(69108),a=s(99678),E=s(78070),n=s(6517);async function c(e){try{let e=(0,n.ST)(),i=`
      -- 請求書テーブルの作成
      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

          -- 金額情報
          amount DECIMAL(12,2) NOT NULL,
          tax_rate DECIMAL(5,4) DEFAULT 0.10,
          tax_amount DECIMAL(12,2) NOT NULL,
          total_amount DECIMAL(12,2) NOT NULL,

          -- 日付情報
          issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          due_date TIMESTAMPTZ NOT NULL,
          paid_date TIMESTAMPTZ,

          -- ステータス
          status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'sent', 'paid', 'overdue', 'cancelled')),

          -- 請求書詳細
          description TEXT,
          billing_details JSONB,

          -- メタデータ
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- インデックスの作成
      CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_contractor_id ON invoices(contractor_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
      CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

      -- RLS（行レベルセキュリティ）の有効化
      ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

      -- RLSポリシーの作成
      -- 受注者は自分宛の請求書のみ閲覧可能
      CREATE POLICY IF NOT EXISTS "contractors_can_view_their_invoices" ON invoices
          FOR SELECT USING (
              contractor_id IN (
                  SELECT id FROM users WHERE auth_user_id = auth.uid()
              )
          );

      -- 発注者（組織管理者）は自分の組織の請求書を閲覧・作成・更新可能
      CREATE POLICY IF NOT EXISTS "org_admins_can_manage_invoices" ON invoices
          FOR ALL USING (
              org_id IN (
                  SELECT m.org_id
                  FROM memberships m
                  JOIN users u ON u.id = m.user_id
                  WHERE u.auth_user_id = auth.uid()
                  AND m.role = 'OrgAdmin'
              )
          );

      -- システム管理者は全ての請求書を管理可能
      CREATE POLICY IF NOT EXISTS "admins_can_manage_all_invoices" ON invoices
          FOR ALL USING (
              EXISTS (
                  SELECT 1
                  FROM memberships m
                  JOIN users u ON u.id = m.user_id
                  WHERE u.auth_user_id = auth.uid()
                  AND m.role = 'Admin'
              )
          );

      -- updated_atの自動更新トリガー
      CREATE OR REPLACE FUNCTION update_invoices_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_invoices_updated_at_trigger ON invoices;
      CREATE TRIGGER update_invoices_updated_at_trigger
          BEFORE UPDATE ON invoices
          FOR EACH ROW
          EXECUTE FUNCTION update_invoices_updated_at();
    `,{error:s}=await e.rpc("exec_sql",{sql:i});if(s)return console.error("invoicesテーブル作成エラー:",s),E.Z.json({message:"invoicesテーブルの作成に失敗しました",error:s},{status:500});let{data:t,error:r}=await e.from("invoices").select("*").limit(1);return E.Z.json({message:"invoicesテーブルが正常に作成されました",testQuery:r?{error:r}:{success:!0,data:t}},{status:200})}catch(e){return console.error("invoicesテーブルセットアップエラー:",e),E.Z.json({message:"サーバーエラーが発生しました",error:e instanceof Error?e.message:"Unknown error"},{status:500})}}let u=new r.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/setup/invoices-table/route",pathname:"/api/setup/invoices-table",filename:"route",bundlePath:"app/api/setup/invoices-table/route"},resolvedPagePath:"/Users/sayuri/caddonworks/src/app/api/setup/invoices-table/route.ts",nextConfigOutput:"",userland:t}),{requestAsyncStorage:d,staticGenerationAsyncStorage:T,serverHooks:I,headerHooks:N,staticGenerationBailout:_}=u,p="/api/setup/invoices-table/route";function O(){return(0,a.patchFetch)({serverHooks:I,staticGenerationAsyncStorage:T})}},6517:(e,i,s)=>{s.d(i,{OQ:()=>r,ST:()=>o});var t=s(32409);let r=(0,t.eI)("https://rxnozwuamddqlcwysxag.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjY4MDMsImV4cCI6MjA3MzM0MjgwM30.0sbl6zWJ1XalGTFbsgeMpth6yH-oQA_P1eTCc8lKoAU"),o=()=>{let e=process.env.SUPABASE_SERVICE_ROLE_KEY||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE";return(0,t.eI)("https://rxnozwuamddqlcwysxag.supabase.co",e,{auth:{autoRefreshToken:!1,persistSession:!1}})}}};var i=require("../../../../webpack-runtime.js");i.C(e);var s=e=>i(i.s=e),t=i.X(0,[1638,6206,2409],()=>s(70066));module.exports=t})();