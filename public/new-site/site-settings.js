/* Keeps the new pages' contact details in step with Admin → Settings (email, WhatsApp, Israel and US office phones).
   The HTML has working defaults; this only replaces them when a value is saved in the admin. Fails quietly. */
(()=>{const digits=s=>String(s||"").replace(/[^\d+]/g,"");
const tel=s=>{let d=digits(s);if(d.startsWith("00"))d="+"+d.slice(2);return d.startsWith("+")?d:d.startsWith("0")?"+972"+d.slice(1):"+"+d;};
const wa=s=>{let d=String(s||"").replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);else if(d.startsWith("0"))d="972"+d.slice(1);return d;};
const setLinks=(sel,href,text,keepText)=>document.querySelectorAll(sel).forEach(a=>{a.setAttribute("href",href);if(text&&!keepText)a.textContent=text;});
fetch("/api/admin/site-settings",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(s=>{if(!s)return;
 const em=(s.businessEmail||"").trim();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))document.querySelectorAll('a[href^="mailto:info@igani.co"]').forEach(a=>{a.setAttribute("href","mailto:"+em);if(a.textContent.trim()==="info@igani.co")a.textContent=em;});
 const il=(s.officePhoneIsrael||"").trim();if(il.replace(/\D/g,"").length>=7)document.querySelectorAll('a[href="tel:+97293761325"]').forEach(a=>{a.setAttribute("href","tel:"+tel(il));a.childNodes.forEach(n=>{if(n.nodeType===3&&/09-376-1325/.test(n.textContent))n.textContent=n.textContent.replace("09-376-1325",il);});if(a.textContent.trim()==="09-376-1325")a.textContent=il;});
 const us=(s.officePhoneUs||"").trim();if(us.replace(/\D/g,"").length>=7)document.querySelectorAll('a[href="tel:+15706348730"]').forEach(a=>{a.setAttribute("href","tel:"+tel(us));a.childNodes.forEach(n=>{if(n.nodeType===3&&/\+1 \(570\) 634-8730/.test(n.textContent))n.textContent=n.textContent.replace("+1 (570) 634-8730",us);});if(a.textContent.trim()==="+1 (570) 634-8730")a.textContent=us;});
 const w=wa(s.whatsappNumber);if(w.length>=8)document.querySelectorAll('a[href^="https://wa.me/972584477757"]').forEach(a=>a.setAttribute("href","https://wa.me/"+w));
}).catch(()=>{});})();
