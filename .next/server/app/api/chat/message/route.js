"use strict";(()=>{var e={};e.id=1216,e.ids=[1216],e.modules={30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},57310:e=>{e.exports=require("url")},59796:e=>{e.exports=require("zlib")},34479:(e,t,s)=>{s.r(t),s.d(t,{headerHooks:()=>_,originalPathname:()=>h,patchFetch:()=>f,requestAsyncStorage:()=>p,routeModule:()=>l,serverHooks:()=>m,staticGenerationAsyncStorage:()=>c,staticGenerationBailout:()=>g});var a={};s.r(a),s.d(a,{GET:()=>o});var r=s(95419),i=s(69108),n=s(99678),u=s(78070),d=s(32409);async function o(e){try{let t=(0,d.eI)("https://rxnozwuamddqlcwysxag.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjY4MDMsImV4cCI6MjA3MzM0MjgwM30.0sbl6zWJ1XalGTFbsgeMpth6yH-oQA_P1eTCc8lKoAU"),{data:{session:s},error:a}=await t.auth.getSession();if(a||!s)return u.Z.json({message:"認証が必要です"},{status:401});let{searchParams:r}=new URL(e.url),i=r.get("message_id");if(!i)return u.Z.json({message:"メッセージIDが必要です"},{status:400});let{data:n,error:o}=await t.from("chat_messages").select(`
        id,
        content,
        message_type,
        file_url,
        file_name,
        file_size,
        created_at,
        updated_at,
        edited_at,
        is_deleted,
        sender_id,
        users!inner (
          id,
          display_name,
          avatar_url
        )
      `).eq("id",i).eq("is_deleted",!1).single();if(o)return console.error("メッセージ取得エラー:",o),u.Z.json({message:"メッセージの取得に失敗しました"},{status:500});if(!n)return u.Z.json({message:"メッセージが見つかりません"},{status:404});let l={id:n.id,content:n.content,message_type:n.message_type,file_url:n.file_url,file_name:n.file_name,file_size:n.file_size,created_at:n.created_at,updated_at:n.updated_at,edited_at:n.edited_at,is_deleted:n.is_deleted,sender:{id:n.users?.id,display_name:n.users?.display_name,avatar_url:n.users?.avatar_url}};return u.Z.json({message:l},{status:200})}catch(e){return console.error("メッセージ取得エラー:",e),u.Z.json({message:"サーバーエラーが発生しました"},{status:500})}}let l=new r.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/chat/message/route",pathname:"/api/chat/message",filename:"route",bundlePath:"app/api/chat/message/route"},resolvedPagePath:"/Users/sayuri/caddonworks/src/app/api/chat/message/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:p,staticGenerationAsyncStorage:c,serverHooks:m,headerHooks:_,staticGenerationBailout:g}=l,h="/api/chat/message/route";function f(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:c})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[1638,6206,2409],()=>s(34479));module.exports=a})();