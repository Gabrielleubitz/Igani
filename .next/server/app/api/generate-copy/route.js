"use strict";(()=>{var e={};e.id=278,e.ids=[278],e.modules={53524:e=>{e.exports=require("@prisma/client")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},55315:e=>{e.exports=require("path")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},38329:(e,r,t)=>{t.r(r),t.d(r,{originalPathname:()=>y,patchFetch:()=>x,requestAsyncStorage:()=>l,routeModule:()=>m,serverHooks:()=>g,staticGenerationAsyncStorage:()=>h});var s={};t.r(s),t.d(s,{POST:()=>d,dynamic:()=>p,runtime:()=>c});var n=t(49303),o=t(88716),a=t(60670),i=t(87070);let p="force-dynamic",c="nodejs";async function u(){let{OpenAI:e}=await t.e(214).then(t.bind(t,54214)),{prisma:r}=await t.e(331).then(t.bind(t,72331)),{GeneratedCopySchema:s}=await t.e(458).then(t.bind(t,76458));return{OpenAI:e,prisma:r,GeneratedCopySchema:s}}async function d(e){try{let r;let{orderId:t,answers:s}=await e.json();if(!t||!s)return i.NextResponse.json({error:"Missing orderId or answers"},{status:400});let{OpenAI:n,prisma:o,GeneratedCopySchema:a}=await u(),p=`You are a professional copywriter specializing in tech meetups and events. You create engaging, concise copy that resonates with builders, founders, and investors.

Guidelines:
- Write in a ${s.brand.tone} tone
- Keep email subjects under 55 characters
- Keep SMS messages under 140 characters  
- No emojis unless tone is "energetic"
- Focus on community, networking, and learning
- Use the brand name: ${s.brand.name}
- Location: ${s.location}
- Sample event: ${s.event.sampleName}

Return ONLY valid JSON matching this exact structure - no other text or formatting.`,c=`Generate copy for an event site with these details:

Brand: ${s.brand.name} - ${s.brand.tagline}
Tone: ${s.brand.tone}
Location: ${s.location}
Audience: ${s.audience.founders}% founders, ${s.audience.builders}% builders, ${s.audience.investors}% investors
Event Cadence: ${s.event.cadence}
Sample Event: ${s.event.sampleName}
Primary Color: ${s.colors.primary}

Create compelling copy that speaks to this specific audience and reflects the brand tone.`,d=new n({apiKey:process.env.OPENAI_API_KEY}),m=await d.chat.completions.create({model:"gpt-4",messages:[{role:"system",content:p},{role:"user",content:c}],response_format:{type:"json_object"},temperature:.7,max_tokens:2e3}),l=m.choices[0]?.message?.content;if(!l)throw Error("No response from OpenAI");try{r=JSON.parse(l)}catch(e){throw console.error("Failed to parse OpenAI response:",l),Error("Invalid JSON response from OpenAI")}let h=a.parse(r),g=await o.generatedCopy.upsert({where:{orderId:t},create:{orderId:t,site:h.site,emails:h.emails,sms:h.sms,theme:{...h.theme,colors:{...h.theme.colors,primary:s.colors.primary},brandName:s.brand.name}},update:{site:h.site,emails:h.emails,sms:h.sms,theme:{...h.theme,colors:{...h.theme.colors,primary:s.colors.primary},brandName:s.brand.name}}});return i.NextResponse.json({success:!0,generatedCopy:g})}catch(e){if(console.error("Copy generation error:",e),e instanceof Error)return i.NextResponse.json({error:e.message},{status:500});return i.NextResponse.json({error:"Failed to generate copy"},{status:500})}}let m=new n.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/generate-copy/route",pathname:"/api/generate-copy",filename:"route",bundlePath:"app/api/generate-copy/route"},resolvedPagePath:"/Users/gabriel/Downloads/igani/app/api/generate-copy/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:l,staticGenerationAsyncStorage:h,serverHooks:g}=m,y="/api/generate-copy/route";function x(){return(0,a.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:h})}}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[276,972],()=>t(38329));module.exports=s})();