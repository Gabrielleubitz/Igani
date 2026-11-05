/* Header navigation: current page, Platform dropdown, mobile menu. Same logic as the inline script on the static pages. */
(()=>{const f=(location.pathname.replace(/\/$/,"")||"/").replace(/\.html$/,"").replace(/^\/index$/,"/");
document.querySelectorAll(".hd__nav a,.hd__m a").forEach(a=>{if(a.getAttribute("href")===f){a.setAttribute("aria-current","page");const d=a.closest(".dd");if(d)d.querySelector(".dd__t").classList.add("on");const g=a.closest(".hd__g");if(g)g.open=true;}});
const dd=document.querySelector(".dd"),t=dd&&dd.querySelector(".dd__t");if(!dd)return;
const set=o=>{dd.classList.toggle("open",o);t.setAttribute("aria-expanded",o);};
t.addEventListener("click",e=>{e.stopPropagation();set(!dd.classList.contains("open"));});
dd.addEventListener("mouseenter",()=>set(true));dd.addEventListener("mouseleave",()=>set(false));
document.addEventListener("click",e=>{if(!dd.contains(e.target))set(false);});
dd.addEventListener("keydown",e=>{if(e.key==="Escape"){set(false);t.focus();}});
dd.addEventListener("focusout",e=>{if(!dd.contains(e.relatedTarget))set(false);});})();
