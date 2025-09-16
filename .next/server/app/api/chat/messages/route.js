"use strict";(()=>{var e={};e.id=9402,e.ids=[9402],e.modules={30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},57310:e=>{e.exports=require("url")},59796:e=>{e.exports=require("zlib")},66060:(e,s,r)=>{r.r(s),r.d(s,{headerHooks:()=>g,originalPathname:()=>h,patchFetch:()=>j,requestAsyncStorage:()=>c,routeModule:()=>_,serverHooks:()=>p,staticGenerationAsyncStorage:()=>m,staticGenerationBailout:()=>f});var t={};r.r(t),r.d(t,{GET:()=>u,POST:()=>l});var a=r(95419),i=r(69108),n=r(99678),o=r(78070);let d=(0,r(32409).eI)("https://rxnozwuamddqlcwysxag.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:!1,persistSession:!1}});async function u(e){try{let{searchParams:s}=new URL(e.url),r=s.get("room_id");if(!r)return o.Z.json({message:"ルームIDが必要です"},{status:400});let t=r.replace("project_",""),a=e.headers.get("authorization");if(!a)return o.Z.json({message:"認証が必要です"},{status:401});let i=a.replace("Bearer ",""),{data:{user:n},error:u}=await d.auth.getUser(i);if(u||!n)return o.Z.json({message:"認証に失敗しました"},{status:401});let{data:l,error:_}=await d.from("users").select("id, email, display_name").eq("auth_user_id",n.id).single();if(_||!l)return o.Z.json({message:"ユーザープロフィールが見つかりません"},{status:403});let{data:c,error:m}=await d.from("projects").select("id, title, org_id, contractor_id").eq("id",t).single();if(m||!c)return o.Z.json({message:"プロジェクトが見つかりません"},{status:404});let{data:p}=await d.from("memberships").select("org_id, role").eq("user_id",l.id).single();if(!(p?.org_id===c.org_id||c.contractor_id===l.id))return o.Z.json({message:"このプロジェクトへのアクセス権限がありません"},{status:403});let{data:g,error:f}=await d.from("chat_messages").select(`
        id,
        message,
        sender_type,
        message_type,
        file_url,
        file_name,
        file_size,
        created_at,
        updated_at,
        users:sender_id (
          id,
          display_name,
          email,
          avatar_url
        )
      `).eq("project_id",t).order("created_at",{ascending:!0});if(f)return console.error("メッセージ取得エラー:",f),o.Z.json({message:"メッセージの取得に失敗しました"},{status:400});let h=g?.map(e=>({id:e.id,room_id:r,content:e.message,sender_id:e.users?.id,sender_name:e.users?.display_name||"Unknown",sender_email:e.users?.email,sender_avatar_url:e.users?.avatar_url,sender_type:e.sender_type,created_at:e.created_at,is_deleted:!1,message_type:e.message_type||"text",file_url:e.file_url,file_name:e.file_name,file_size:e.file_size}))||[];return o.Z.json({messages:h},{status:200})}catch(e){return console.error("チャットメッセージ取得エラー:",e),o.Z.json({message:"サーバーエラーが発生しました"},{status:500})}}async function l(e){try{let{room_id:s,content:r,message_type:t="text"}=await e.json();if(!s||!r)return o.Z.json({message:"必須項目が入力されていません"},{status:400});let a=s.replace("project_",""),i=e.headers.get("authorization");if(!i)return o.Z.json({message:"認証が必要です"},{status:401});let n=i.replace("Bearer ",""),{data:{user:u},error:l}=await d.auth.getUser(n);if(l||!u)return o.Z.json({message:"認証に失敗しました"},{status:401});let{data:_,error:c}=await d.from("users").select("id, email, display_name").eq("auth_user_id",u.id).single();if(c||!_)return o.Z.json({message:"ユーザープロフィールが見つかりません"},{status:403});let{data:m,error:p}=await d.from("projects").select("id, title, org_id, contractor_id").eq("id",a).single();if(p||!m)return o.Z.json({message:"プロジェクトが見つかりません"},{status:404});let{data:g}=await d.from("memberships").select("org_id, role").eq("user_id",_.id).single();if(!(g?.org_id===m.org_id||m.contractor_id===_.id))return o.Z.json({message:"このプロジェクトへのアクセス権限がありません"},{status:403});let f=g?.org_id===m.org_id?"client":"contractor",{data:h,error:j}=await d.from("chat_messages").insert({project_id:a,sender_id:_.id,sender_type:f,message:r,created_at:new Date().toISOString()}).select(`
        id,
        message,
        sender_type,
        created_at,
        users:sender_id (
          id,
          display_name,
          email,
          avatar_url
        )
      `).single();if(j)return console.error("メッセージ保存エラー:",j),o.Z.json({message:"メッセージの保存に失敗しました"},{status:400});let y={id:h.id,room_id:s,content:h.message,sender_id:h.users?.id,sender_name:h.users?.display_name||"Unknown",sender_email:h.users?.email,sender_avatar_url:h.users?.avatar_url,sender_type:h.sender_type,created_at:h.created_at,is_deleted:!1,message_type:t};return o.Z.json({message:"メッセージが送信されました",chat_message:y},{status:201})}catch(e){return console.error("チャットメッセージ送信エラー:",e),o.Z.json({message:"サーバーエラーが発生しました"},{status:500})}}let _=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/chat/messages/route",pathname:"/api/chat/messages",filename:"route",bundlePath:"app/api/chat/messages/route"},resolvedPagePath:"/Users/sayuri/caddonworks/src/app/api/chat/messages/route.ts",nextConfigOutput:"",userland:t}),{requestAsyncStorage:c,staticGenerationAsyncStorage:m,serverHooks:p,headerHooks:g,staticGenerationBailout:f}=_,h="/api/chat/messages/route";function j(){return(0,n.patchFetch)({serverHooks:p,staticGenerationAsyncStorage:m})}}};var s=require("../../../../webpack-runtime.js");s.C(e);var r=e=>s(s.s=e),t=s.X(0,[1638,6206,2409],()=>r(66060));module.exports=t})();