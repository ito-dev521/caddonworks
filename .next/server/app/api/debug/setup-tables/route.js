"use strict";(()=>{var e={};e.id=1749,e.ids=[1749],e.modules={30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},57310:e=>{e.exports=require("url")},59796:e=>{e.exports=require("zlib")},64047:(e,s,r)=>{r.r(s),r.d(s,{headerHooks:()=>p,originalPathname:()=>l,patchFetch:()=>A,requestAsyncStorage:()=>n,routeModule:()=>T,serverHooks:()=>d,staticGenerationAsyncStorage:()=>I,staticGenerationBailout:()=>m});var t={};r.r(t),r.d(t,{POST:()=>c});var a=r(95419),o=r(69108),E=r(99678),u=r(78070),i=r(6517);async function c(e){try{let e=(0,i.ST)(),s=[];try{let{error:r}=await e.rpc("exec_sql",{sql:`
          CREATE TABLE IF NOT EXISTS chat_rooms (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            project_id UUID,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID,
            is_active BOOLEAN DEFAULT true
          );
        `});r?s.push({table:"chat_rooms",status:"error",message:r.message}):s.push({table:"chat_rooms",status:"success",message:"テーブルを作成しました"})}catch(e){s.push({table:"chat_rooms",status:"error",message:e instanceof Error?e.message:"Unknown error"})}try{let{error:r}=await e.rpc("exec_sql",{sql:`
          CREATE TABLE IF NOT EXISTS users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            auth_user_id UUID UNIQUE,
            email VARCHAR(255) UNIQUE NOT NULL,
            display_name VARCHAR(255),
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `});r?s.push({table:"users",status:"error",message:r.message}):s.push({table:"users",status:"success",message:"テーブルを作成しました"})}catch(e){s.push({table:"users",status:"error",message:e instanceof Error?e.message:"Unknown error"})}try{let{error:r}=await e.rpc("exec_sql",{sql:`
          CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
            sender_id UUID,
            content TEXT NOT NULL,
            message_type VARCHAR(50) DEFAULT 'text',
            file_url TEXT,
            file_name TEXT,
            file_size INTEGER,
            reply_to UUID REFERENCES chat_messages(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_deleted BOOLEAN DEFAULT false,
            edited_at TIMESTAMP WITH TIME ZONE
          );
        `});r?s.push({table:"chat_messages",status:"error",message:r.message}):s.push({table:"chat_messages",status:"success",message:"テーブルを作成しました"})}catch(e){s.push({table:"chat_messages",status:"error",message:e instanceof Error?e.message:"Unknown error"})}try{let{error:r}=await e.rpc("exec_sql",{sql:`
          CREATE TABLE IF NOT EXISTS message_reactions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reaction_type VARCHAR(10) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(message_id, user_id, reaction_type)
          );
        `});r?s.push({table:"message_reactions",status:"error",message:r.message}):s.push({table:"message_reactions",status:"success",message:"テーブルを作成しました"})}catch(e){s.push({table:"message_reactions",status:"error",message:e instanceof Error?e.message:"Unknown error"})}return u.Z.json({message:"テーブルセットアップが完了しました",results:s},{status:200})}catch(e){return console.error("テーブルセットアップエラー:",e),u.Z.json({message:"サーバーエラーが発生しました",error:e instanceof Error?e.message:"Unknown error"},{status:500})}}let T=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/debug/setup-tables/route",pathname:"/api/debug/setup-tables",filename:"route",bundlePath:"app/api/debug/setup-tables/route"},resolvedPagePath:"/Users/sayuri/caddonworks/src/app/api/debug/setup-tables/route.ts",nextConfigOutput:"",userland:t}),{requestAsyncStorage:n,staticGenerationAsyncStorage:I,serverHooks:d,headerHooks:p,staticGenerationBailout:m}=T,l="/api/debug/setup-tables/route";function A(){return(0,E.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:I})}},6517:(e,s,r)=>{r.d(s,{OQ:()=>a,ST:()=>o});var t=r(32409);let a=(0,t.eI)("https://rxnozwuamddqlcwysxag.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjY4MDMsImV4cCI6MjA3MzM0MjgwM30.0sbl6zWJ1XalGTFbsgeMpth6yH-oQA_P1eTCc8lKoAU"),o=()=>{let e=process.env.SUPABASE_SERVICE_ROLE_KEY||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE";return(0,t.eI)("https://rxnozwuamddqlcwysxag.supabase.co",e,{auth:{autoRefreshToken:!1,persistSession:!1}})}}};var s=require("../../../../webpack-runtime.js");s.C(e);var r=e=>s(s.s=e),t=s.X(0,[1638,6206,2409],()=>r(64047));module.exports=t})();