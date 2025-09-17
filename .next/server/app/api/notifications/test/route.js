"use strict";(()=>{var e={};e.id=2267,e.ids=[2267],e.modules={30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},57310:e=>{e.exports=require("url")},59796:e=>{e.exports=require("zlib")},47635:(e,r,t)=>{t.r(r),t.d(r,{headerHooks:()=>g,originalPathname:()=>_,patchFetch:()=>x,requestAsyncStorage:()=>p,routeModule:()=>d,serverHooks:()=>f,staticGenerationAsyncStorage:()=>m,staticGenerationBailout:()=>h});var s={};t.r(s),t.d(s,{GET:()=>u,POST:()=>l});var o=t(95419),i=t(69108),a=t(99678),n=t(78070);let c=(0,t(32409).eI)("https://rxnozwuamddqlcwysxag.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:!1,persistSession:!1}});async function u(e){try{let{data:e,error:r}=await c.from("notifications").select("id").limit(1);if(r)return console.error("notificationsテーブルエラー:",r),n.Z.json({success:!1,error:"notificationsテーブルが存在しません",details:r.message},{status:500});let{count:t,error:s}=await c.from("notifications").select("*",{count:"exact",head:!0});s&&console.error("通知数取得エラー:",s);let{data:o,error:i}=await c.from("notifications").select(`
        id,
        user_id,
        type,
        title,
        message,
        read_at,
        created_at,
        users!notifications_user_id_fkey (
          display_name,
          email
        )
      `).order("created_at",{ascending:!1}).limit(5);i&&console.error("最近の通知取得エラー:",i);let{data:a,error:u}=await c.from("memberships").select(`
        user_id,
        role,
        users!memberships_user_id_fkey (
          id,
          display_name,
          email
        )
      `).eq("role","OrgAdmin").limit(5);return u&&console.error("OrgAdmin取得エラー:",u),n.Z.json({success:!0,data:{tableExists:!0,notificationCount:t||0,recentNotifications:o||[],orgAdmins:a||[],errors:{tableError:r?.message||null,countError:s?.message||null,recentError:i?.message||null,orgAdminsError:u?.message||null}}})}catch(e){return console.error("通知テストAPIエラー:",e),n.Z.json({success:!1,error:"サーバーエラーが発生しました",details:e instanceof Error?e.message:"不明なエラー"},{status:500})}}async function l(e){try{let{user_id:r,type:t="bid_received",title:s,message:o,data:i={}}=await e.json();if(!r||!s||!o)return n.Z.json({success:!1,error:"user_id, title, messageは必須です"},{status:400});let{data:a,error:u}=await c.from("notifications").insert({user_id:r,type:t,title:s,message:o,data:i}).select().single();if(u)return console.error("通知作成エラー:",u),n.Z.json({success:!1,error:"通知の作成に失敗しました",details:u.message},{status:500});return n.Z.json({success:!0,notification:a})}catch(e){return console.error("通知テスト作成APIエラー:",e),n.Z.json({success:!1,error:"サーバーエラーが発生しました",details:e instanceof Error?e.message:"不明なエラー"},{status:500})}}let d=new o.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/notifications/test/route",pathname:"/api/notifications/test",filename:"route",bundlePath:"app/api/notifications/test/route"},resolvedPagePath:"/Users/sayuri/caddonworks/src/app/api/notifications/test/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:p,staticGenerationAsyncStorage:m,serverHooks:f,headerHooks:g,staticGenerationBailout:h}=d,_="/api/notifications/test/route";function x(){return(0,a.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:m})}}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[1638,6206,2409],()=>t(47635));module.exports=s})();