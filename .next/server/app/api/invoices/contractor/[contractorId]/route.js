"use strict";(()=>{var e={};e.id=9523,e.ids=[9523],e.modules={30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},57310:e=>{e.exports=require("url")},59796:e=>{e.exports=require("zlib")},49462:(e,t,r)=>{r.r(t),r.d(t,{headerHooks:()=>I,originalPathname:()=>h,patchFetch:()=>g,requestAsyncStorage:()=>p,routeModule:()=>d,serverHooks:()=>l,staticGenerationAsyncStorage:()=>m,staticGenerationBailout:()=>_});var s={};r.r(s),r.d(s,{GET:()=>u});var a=r(95419),o=r(69108),i=r(99678),n=r(78070);let c=(0,r(6517).ST)();async function u(e,{params:t}){try{let{contractorId:r}=t,s=e.headers.get("authorization");if(!s)return n.Z.json({message:"認証が必要です"},{status:401});let a=s.replace("Bearer ",""),{data:{user:o},error:i}=await c.auth.getUser(a);if(i||!o)return n.Z.json({message:"認証に失敗しました"},{status:401});let{data:u,error:d}=await c.from("users").select("id").eq("auth_user_id",o.id).single();if(d||!u)return n.Z.json({message:"ユーザー情報の取得に失敗しました"},{status:400});if(u.id!==r)return n.Z.json({message:"他のユーザーの請求書は閲覧できません"},{status:403});let{data:p,error:m}=await c.from("invoices").select(`
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        base_amount,
        system_fee,
        total_amount,
        created_at,
        projects (
          id,
          title,
          contractor_id
        ),
        contracts (
          id,
          bid_amount
        ),
        organizations (
          id,
          name
        )
      `).eq("contractor_id",r).order("created_at",{ascending:!1});if(m)return console.error("請求書取得エラー:",m),n.Z.json({message:"請求書の取得に失敗しました"},{status:500});let l=p?.map(e=>({id:e.id,invoice_number:e.invoice_number,status:e.status,issue_date:e.issue_date,due_date:e.due_date,base_amount:e.base_amount,system_fee:e.system_fee,total_amount:e.total_amount,project:{id:e.projects?.id,title:e.projects?.title,contractor_id:e.projects?.contractor_id},contract:{id:e.contracts?.id,bid_amount:e.contracts?.bid_amount},client_org:{id:e.organizations?.id,name:e.organizations?.name}}))||[];return n.Z.json({invoices:l})}catch(e){return console.error("請求書取得エラー:",e),n.Z.json({message:"サーバーエラーが発生しました"},{status:500})}}let d=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/invoices/contractor/[contractorId]/route",pathname:"/api/invoices/contractor/[contractorId]",filename:"route",bundlePath:"app/api/invoices/contractor/[contractorId]/route"},resolvedPagePath:"/Users/sayuri/caddonworks/src/app/api/invoices/contractor/[contractorId]/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:p,staticGenerationAsyncStorage:m,serverHooks:l,headerHooks:I,staticGenerationBailout:_}=d,h="/api/invoices/contractor/[contractorId]/route";function g(){return(0,i.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:m})}},6517:(e,t,r)=>{r.d(t,{OQ:()=>a,ST:()=>o});var s=r(32409);let a=(0,s.eI)("https://rxnozwuamddqlcwysxag.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjY4MDMsImV4cCI6MjA3MzM0MjgwM30.0sbl6zWJ1XalGTFbsgeMpth6yH-oQA_P1eTCc8lKoAU"),o=()=>{let e=process.env.SUPABASE_SERVICE_ROLE_KEY||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE";return(0,s.eI)("https://rxnozwuamddqlcwysxag.supabase.co",e,{auth:{autoRefreshToken:!1,persistSession:!1}})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[1638,6206,2409],()=>r(49462));module.exports=s})();