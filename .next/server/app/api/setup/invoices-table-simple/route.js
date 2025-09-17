"use strict";(()=>{var e={};e.id=5336,e.ids=[5336],e.modules={30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},57310:e=>{e.exports=require("url")},59796:e=>{e.exports=require("zlib")},7192:(e,i,s)=>{s.r(i),s.d(i,{headerHooks:()=>N,originalPathname:()=>_,patchFetch:()=>O,requestAsyncStorage:()=>d,routeModule:()=>c,serverHooks:()=>T,staticGenerationAsyncStorage:()=>I,staticGenerationBailout:()=>p});var t={};s.r(t),s.d(t,{POST:()=>u});var r=s(95419),o=s(69108),a=s(99678),n=s(78070),E=s(6517);async function u(e){try{let e=(0,E.ST)(),{data:i,error:s}=await e.from("invoices").select("*").limit(1);if(!s)return n.Z.json({message:"invoicesテーブルは既に存在します",existing:!0},{status:200});return n.Z.json({message:"invoicesテーブルが存在しません。Supabaseダッシュボードで手動実行してください。",sql:`
-- 以下のSQLをSupabaseダッシュボードのSQL Editorで実行してください:

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.10,
    tax_amount DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,
    paid_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'sent', 'paid', 'overdue', 'cancelled')),
    description TEXT,
    billing_details JSONB,
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

-- RLSの有効化
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY IF NOT EXISTS "contractors_can_view_their_invoices" ON invoices
    FOR SELECT USING (
        contractor_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

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
      `},{status:200})}catch(e){return console.error("invoicesテーブルセットアップエラー:",e),n.Z.json({message:"サーバーエラーが発生しました",error:e instanceof Error?e.message:"Unknown error"},{status:500})}}let c=new r.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/setup/invoices-table-simple/route",pathname:"/api/setup/invoices-table-simple",filename:"route",bundlePath:"app/api/setup/invoices-table-simple/route"},resolvedPagePath:"/Users/sayuri/caddonworks/src/app/api/setup/invoices-table-simple/route.ts",nextConfigOutput:"",userland:t}),{requestAsyncStorage:d,staticGenerationAsyncStorage:I,serverHooks:T,headerHooks:N,staticGenerationBailout:p}=c,_="/api/setup/invoices-table-simple/route";function O(){return(0,a.patchFetch)({serverHooks:T,staticGenerationAsyncStorage:I})}},6517:(e,i,s)=>{s.d(i,{OQ:()=>r,ST:()=>o});var t=s(32409);let r=(0,t.eI)("https://rxnozwuamddqlcwysxag.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjY4MDMsImV4cCI6MjA3MzM0MjgwM30.0sbl6zWJ1XalGTFbsgeMpth6yH-oQA_P1eTCc8lKoAU"),o=()=>{let e=process.env.SUPABASE_SERVICE_ROLE_KEY||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE";return(0,t.eI)("https://rxnozwuamddqlcwysxag.supabase.co",e,{auth:{autoRefreshToken:!1,persistSession:!1}})}}};var i=require("../../../../webpack-runtime.js");i.C(e);var s=e=>i(i.s=e),t=i.X(0,[1638,6206,2409],()=>s(7192));module.exports=t})();