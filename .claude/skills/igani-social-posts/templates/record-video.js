const {chromium}=require('playwright');const fs=require('fs');(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:540,height:675},deviceScaleFactor:2})).newPage();
await p.goto('file://'+process.cwd()+'/crm.html',{waitUntil:'networkidle'});await p.waitForTimeout(800);fs.mkdirSync('f',{recursive:true});
const N=210;for(let i=0;i<N;i++){await p.evaluate(t=>window.render(t),i/30);await p.screenshot({path:'f/'+String(i).padStart(4,'0')+'.jpg',type:'jpeg',quality:96});}
await b.close()})();
