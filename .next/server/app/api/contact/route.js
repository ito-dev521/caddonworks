"use strict";(()=>{var e={};e.id=386,e.ids=[386],e.modules={30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},16309:(e,o,t)=>{t.r(o),t.d(o,{headerHooks:()=>d,originalPathname:()=>$,patchFetch:()=>h,requestAsyncStorage:()=>u,routeModule:()=>i,serverHooks:()=>g,staticGenerationAsyncStorage:()=>p,staticGenerationBailout:()=>m});var s={};t.r(s),t.d(s,{POST:()=>c});var n=t(95419),r=t(69108),a=t(99678),l=t(78070);async function c(e){try{let{name:o,email:t,company:s,phone:n,inquiryType:r,subject:a,message:c,agreeToTerms:i}=await e.json();if(!o||!t||!r||!a||!c||!i)return l.Z.json({message:"必須項目が入力されていません"},{status:400});if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t))return l.Z.json({message:"正しいメールアドレスを入力してください"},{status:400});let u={demo:"デモ・資料請求",pricing:"料金について",technical:"技術的な質問",partnership:"パートナーシップ",support:"サポート",other:"その他"}[r]||r,p=`
お問い合わせを受け付けました。

【お問い合わせ内容】
お名前: ${o}
メールアドレス: ${t}
会社名: ${s||"未入力"}
電話番号: ${n||"未入力"}
お問い合わせ種別: ${u}
件名: ${a}

【お問い合わせ内容】
${c}

---
このメールは土木設計業務プラットフォームのお問い合わせフォームから送信されました。
送信日時: ${new Date().toLocaleString("ja-JP")}
    `.trim();console.log("=== お問い合わせメール ==="),console.log("送信先: info@ii-stylelab.com"),console.log("件名:",`[お問い合わせ] ${a}`),console.log("本文:"),console.log(p),console.log("========================");let g=`
${o} 様

この度は、土木設計業務プラットフォームにお問い合わせいただき、誠にありがとうございます。

以下の内容でお問い合わせを受け付けました。

【お問い合わせ内容】
件名: ${a}
お問い合わせ種別: ${u}

【お問い合わせ内容】
${c}

担当者より2営業日以内にご連絡いたします。
今しばらくお待ちください。

ご不明な点がございましたら、お気軽にお問い合わせください。

---
土木設計業務プラットフォーム運営事務局
Email: info@ii-stylelab.com
Tel: 03-1234-5678
受付時間: 平日 9:00-18:00
    `.trim();return console.log("=== 自動返信メール ==="),console.log("送信先:",t),console.log("件名: [自動返信] お問い合わせを受け付けました"),console.log("本文:"),console.log(g),console.log("===================="),l.Z.json({message:"お問い合わせを受け付けました"},{status:200})}catch(e){return console.error("お問い合わせ送信エラー:",e),l.Z.json({message:"サーバーエラーが発生しました"},{status:500})}}let i=new n.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/contact/route",pathname:"/api/contact",filename:"route",bundlePath:"app/api/contact/route"},resolvedPagePath:"/Users/sayuri/caddonworks/src/app/api/contact/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:u,staticGenerationAsyncStorage:p,serverHooks:g,headerHooks:d,staticGenerationBailout:m}=i,$="/api/contact/route";function h(){return(0,a.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:p})}}};var o=require("../../../webpack-runtime.js");o.C(e);var t=e=>o(o.s=e),s=o.X(0,[1638,6206],()=>t(16309));module.exports=s})();