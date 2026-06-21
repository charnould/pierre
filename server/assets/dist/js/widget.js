var l=!1,o=!1,w=null,h=null,B="",C="",v=[],d=[],k,H,u="cubic-bezier(0.34, 1.28, 0.64, 1)",f="cubic-bezier(0.4, 0, 0.2, 1)",x=150,_={open:{scrim:300,shell:400,shellDelay:0,launcher:160,launcherDelay:40,content:180,contentDelay:200,close:160,closeDelay:160},close:{scrim:220,shell:280,shellDelay:0,launcher:180,launcherDelay:0,content:100,contentDelay:0,close:100,closeDelay:0}},F="12px",P=0.97,K=2,q=12,G="0 2px 8px rgba(0, 0, 0, 0.04), 0 16px 48px -12px rgba(15, 23, 42, 0.18)",U=`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,W=`
.pierre-ia,
#pierre-ia {
  margin: 0;
  z-index: 9997;
  cursor: pointer;
  font-family: system-ui, Segoe UI, Roboto, Ubuntu, Helvetica Neue, sans-serif;
  transition: transform 0.2s cubic-bezier(0.215, 0.61, 0.355, 1), opacity 0.2s ease;
  position: fixed;
  bottom: 24px;
  right: 24px;
  touch-action: manipulation;
}
.pierre-ia:focus-visible,
#pierre-ia:focus-visible {
  outline: 2px solid rgba(0, 122, 255, 0.85);
  outline-offset: 3px;
}
.pierre-ia.pierre-ia--disabled,
#pierre-ia.pierre-ia--disabled {
  pointer-events: none;
}
#pierre-wrapper {
  z-index: 9998;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  display: flex;
  position: fixed;
  inset: 0;
  opacity: 0;
  isolation: isolate;
  background:
    radial-gradient(
      ellipse 95% 85% at 50% 45%,
      rgba(8, 12, 20, 0.1) 0%,
      rgba(8, 12, 20, 0.42) 100%
    ),
    rgba(10, 14, 22, 0.26);
  backdrop-filter: blur(18px) brightness(0.65) saturate(0.72);
  -webkit-backdrop-filter: blur(18px) brightness(0.65) saturate(0.72);
}
@supports not (backdrop-filter: blur(1px)) {
  #pierre-wrapper {
    background: rgba(10, 14, 22, 0.55);
  }
}
#pierre-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.06;
  pointer-events: none;
  mix-blend-mode: soft-light;
  background-image: ${U};
  background-size: 220px 220px;
}
#pierre-iframe-container {
  position: relative;
  z-index: 1;
  overflow: hidden;
  border-radius: ${F};
  background: #fff;
  box-shadow: ${G};
  max-width: calc(100vw - 32px);
  max-height: 90dvh;
}
#pierre-iframe-content {
  opacity: 0;
  line-height: 0;
}
#pierre-iframe {
  display: block;
  z-index: 9999;
  width: min(600px, calc(100vw - 32px));
  border: none;
  height: min(700px, 90dvh);
  background: #fff;
}
#pierre-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: rgba(0, 0, 0, 0.55);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  z-index: 10000;
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0;
  outline: none;
  box-shadow: none;
  transition: background 0.15s ease, opacity 0.15s ease, color 0.15s ease;
}
#pierre-close:focus,
#pierre-close:focus-visible {
  outline: none;
  box-shadow: none;
}
#pierre-close:hover {
  background: rgba(255, 255, 255, 0.92);
  color: rgba(0, 0, 0, 0.78);
  opacity: 1;
}
@media (max-width: 600px) {
  #pierre-iframe-container {
    box-shadow: none;
    border-radius: 0;
    max-width: 100vw;
    max-height: 100dvh;
  }
  #pierre-iframe {
    width: 100vw;
    height: 100dvh;
  }
  #pierre-close {
    top: max(12px, env(safe-area-inset-top));
    right: max(12px, env(safe-area-inset-right));
  }
}
@media (prefers-reduced-motion: reduce) {
  #pierre-wrapper {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: rgba(10, 14, 22, 0.52);
  }
  #pierre-wrapper::before {
    display: none;
  }
  .pierre-ia,
  #pierre-ia {
    transition: opacity 0.15s ease;
  }
}
`,c=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,Y=()=>window.matchMedia("(max-width: 600px)").matches,p=(e)=>e.finished.catch(()=>{return}),j=()=>new Promise((e)=>requestAnimationFrame(()=>requestAnimationFrame(()=>e()))),b=(e)=>e.closest(".pierre-ia")??e.closest("#pierre-ia"),V=(e)=>{let t=e.style.transform;if(t&&t!=="none")return t;let n=getComputedStyle(e).transform;return n!=="none"?n:""},g=(e,t)=>{let n=`scale(${t})`;if(!e||e==="none")return n;return`${e} ${n}`},L=(e)=>{if(!e.dataset.pierreBaseTransform)e.dataset.pierreBaseTransform=V(e)},T=(e,t)=>{if(o)return;L(e);let n=e.dataset.pierreBaseTransform??"";if(t==="hidden"){e.style.opacity="0",e.style.transform=g(n,0.92);return}e.style.opacity="";let r=t==="pressed"?0.96:t==="hover"?1.08:1;e.style.transform=r===1?n:g(n,r)},X=(e)=>{e.style.opacity="",e.style.transform=e.dataset.pierreBaseTransform??"",e.style.pointerEvents="",e.classList.remove("pierre-ia--disabled"),e.removeAttribute("aria-hidden")},D=()=>document.querySelectorAll(".pierre-ia, #pierre-ia"),J=(e)=>{D().forEach((t)=>{if(t===e)return;t.style.opacity="0",t.style.pointerEvents="none",t.setAttribute("aria-hidden","true"),t.classList.add("pierre-ia--disabled")})},A=()=>{D().forEach(X)},Q=(e)=>e>400?1.016:1.022,y=(e,t,n)=>`translate3d(${e}px, ${t}px, 0) scale(${n})`,S=(e,t)=>{let n=e.getBoundingClientRect(),r=n.left+n.width/2,i=n.top+n.height/2,a=t.left+t.width/2,s=t.top+t.height/2,m=r-a,E=i-s;return{tx:m,ty:E,scale:Math.min(n.width/t.width,n.height/t.height),dist:Math.hypot(m,E)}},Z=(e,t)=>{let{tx:n,ty:r,scale:i,dist:a}=e;if(t==="in"){let s=Q(a);return[{transform:y(n,r,i)},{transform:y(0,0,s),offset:0.72},{transform:y(0,0,1)}]}return[{transform:y(0,0,1)},{transform:y(n,r,i)}]},ee=(e,t,n,r)=>{let i=t==="in"?u:f;return e.animate(t==="in"?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],{duration:c()?x:n,delay:r,easing:c()?"ease":i,fill:"forwards"})},R=(e,t)=>{if(e===t||e.id==="pierre-iframe")return!0;let n=e;return n.classList.contains("pierre-ia")||n.id==="pierre-ia"},te=(e)=>{for(let t of document.body.children){if(R(t,e))continue;if(d.push(t),d.length>=q)break}},ne=async(e,t,n)=>{if(c()||d.length===0)return;let r=e==="in"?u:f,i=`scale(${P})`,a=`blur(${K}px)`,s=Y();await Promise.all(d.map((m)=>{m.style.transformOrigin="center center",m.style.willChange=s?"transform":"transform, filter";let E=e==="in"?s?[{transform:"scale(1)"},{transform:i}]:[{transform:"scale(1)",filter:"blur(0px)"},{transform:i,filter:a}]:s?[{transform:i},{transform:"scale(1)"}]:[{transform:i,filter:a},{transform:"scale(1)",filter:"blur(0px)"}];return p(m.animate(E,{duration:t,delay:n,easing:r,fill:"forwards"}))}))},re=()=>{for(let e of d)e.style.willChange=""},I=()=>{for(let e of d)e.style.transform="",e.style.filter="",e.style.transformOrigin="",e.style.willChange="";d.length=0},ie=(e,t,n,r,i)=>{let a=n==="in"?u:f;if(e.style.transformOrigin="center center",e.style.willChange="transform",c())return e.animate(n==="in"?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],{duration:x,easing:"ease",fill:"forwards"});return e.animate(Z(t,n),{duration:r,delay:i,easing:a,fill:"forwards"})},ae=(e,t,n,r)=>{L(e);let i=e.dataset.pierreBaseTransform??"",a=t==="in"?u:f;if(c())return e.animate([],{duration:0});if(t==="in")return e.animate([{opacity:1,transform:i||"none"},{opacity:0,transform:g(i,0.92),offset:0.7},{opacity:0,transform:g(i,0.92)}],{duration:n,delay:r,easing:a,fill:"forwards"});return e.animate([{opacity:0,transform:g(i,0.92)},{opacity:1,transform:i||"none"}],{duration:n,delay:r,easing:a,fill:"forwards"})},oe=(e,t,n,r)=>{let i=t==="in"?u:f;if(c())return e.animate(t==="in"?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],{duration:x,delay:r,easing:"ease",fill:"forwards"});return e.animate(t==="in"?[{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"translateY(0)"}]:[{opacity:1,transform:"translateY(0)"},{opacity:0,transform:"translateY(8px)"}],{duration:n,delay:r,easing:i,fill:"forwards"})},se=(e,t,n,r)=>{let i=t==="in"?u:f;if(c())return e.animate(t==="in"?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],{duration:x,delay:r,easing:"ease",fill:"forwards"});return e.animate(t==="in"?[{opacity:0,transform:"scale(0.88)"},{opacity:1,transform:"scale(1)"}]:[{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(0.88)"}],{duration:n,delay:r,easing:i,fill:"forwards"})},O=async(e,t)=>{let n=t==="in"?_.open:_.close;await Promise.all([p(ee(e.wrapper,t,n.scrim,t==="in"?0:0)),ne(t,n.scrim,0),p(ie(e.container,e.metrics,t,n.shell,n.shellDelay)),p(ae(e.launcher,t,n.launcher,n.launcherDelay)),p(oe(e.content,t,n.content,n.contentDelay)),p(se(e.close,t,n.close,n.closeDelay))])},le=()=>{let e=window.innerWidth-document.documentElement.clientWidth;if(B=document.body.style.paddingRight,C=document.documentElement.style.overscrollBehavior,document.body.style.overflow="hidden",document.documentElement.style.overscrollBehavior="none",e>0)document.body.style.paddingRight=`${e}px`},$=()=>{document.body.style.overflow="",document.body.style.paddingRight=B,document.documentElement.style.overscrollBehavior=C},ce=(e)=>{for(let t of document.body.children){if(R(t,e))continue;if("inert"in t)t.inert=!0,v.push(t);else t.setAttribute("aria-hidden","true"),v.push(t)}},z=()=>{for(let e of v)if("inert"in e)e.inert=!1;else e.removeAttribute("aria-hidden");v.length=0},de=(e)=>{let t=()=>{let n=e.querySelector("#pierre-close");return n?[n]:[]};h=(n)=>{if(n.key!=="Tab")return;let r=t();if(!r.length)return;let i=r[0],a=r[r.length-1];if(n.shiftKey&&document.activeElement===i)n.preventDefault(),a.focus();else if(!n.shiftKey&&document.activeElement===a)n.preventDefault(),i.focus()},e.addEventListener("keydown",h)},N=(e)=>{if(h)e.removeEventListener("keydown",h),h=null},me=()=>{if(c())return;if("vibrate"in navigator)navigator.vibrate(5)},pe=()=>{document.querySelectorAll(".pierre-ia, #pierre-ia").forEach(L)},ue=async(e)=>{if(l||o)return;let t=document.getElementById("pierre-iframe");if(!t)return;o=!0,w=e,L(e),e.classList.add("pierre-ia--disabled");let n=document.createElement("div");n.id="pierre-wrapper",n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true"),n.setAttribute("aria-label","Assistant PIERRE");let r=document.createElement("div");r.id="pierre-iframe-container";let i=document.createElement("div");i.id="pierre-iframe-content",t.style.display="block",i.appendChild(t);let a=document.createElement("button");a.type="button",a.id="pierre-close",a.setAttribute("aria-label","Fermer"),a.innerHTML='<span aria-hidden="true">✕</span>',r.append(a,i),n.appendChild(r),document.body.appendChild(n),le(),te(n),ce(n),J(e),de(n),me();try{await j();let s=S(e,r.getBoundingClientRect());await O({wrapper:n,container:r,content:i,close:a,launcher:e,metrics:s},"in"),r.style.willChange="",re(),a.focus(),l=!0}catch{N(n),z(),I(),$(),A(),t.style.display="none",document.body.appendChild(t),n.remove(),w=null}finally{o=!1}},M=async()=>{if(!l||o)return;o=!0;let e=document.getElementById("pierre-wrapper"),t=document.getElementById("pierre-iframe-container"),n=document.getElementById("pierre-iframe-content"),r=document.getElementById("pierre-close"),i=document.getElementById("pierre-iframe"),a=w;if(!e||!t||!n||!r||!i||!a){o=!1;return}let s=S(a,t.getBoundingClientRect());await O({wrapper:e,container:t,content:n,close:r,launcher:a,metrics:s},"out"),N(e),z(),I(),$(),i.style.display="none",document.body.appendChild(i),t.style.transform="",t.style.opacity="",t.style.borderRadius="",t.style.boxShadow="",t.style.transformOrigin="",t.style.willChange="",n.style.opacity="",n.style.transform="",r.style.opacity="",r.style.transform="",A(),a.focus(),e.remove(),w=null,l=!1,o=!1};document.addEventListener("DOMContentLoaded",()=>{let e=document.createElement("style");e.innerText=W,document.head.appendChild(e);let t=document.querySelector(".pierre-ia, #pierre-ia");k=t?.dataset.configuration??"default",H=t?.dataset.url??"https://assistant.pierre-ia.org";let n=document.createElement("iframe");n.src=`${H}/?config=${k}`,n.style.display="none",n.id="pierre-iframe",document.body.appendChild(n),pe()});document.addEventListener("pointerover",(e)=>{let t=b(e.target);if(!t||l||o)return;T(t,"hover")},!0);document.addEventListener("pointerout",(e)=>{let t=b(e.target);if(!t||l||o)return;let n=e.relatedTarget;if(n&&t.contains(n))return;T(t,"rest")},!0);document.addEventListener("pointerdown",(e)=>{let t=b(e.target);if(!t||l||o)return;T(t,"pressed")},!0);document.addEventListener("pointerup",(e)=>{let t=b(e.target);if(!t||l||o)return;T(t,"hover")},!0);document.addEventListener("click",(e)=>{let t=e.target,n=b(t);if(n&&!l&&!o){ue(n);return}if(!l||o)return;if(t.id==="pierre-wrapper"&&!t.closest("#pierre-iframe-container")){M();return}if(t.closest("#pierre-close"))M()});document.addEventListener("keydown",(e)=>{if(l&&!o&&e.key==="Escape")M()});
