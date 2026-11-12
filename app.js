// 브라우저가 밝은 화면을 스스로 어둡게 바꿔 그릴 때는 로고를 흰 글씨로 바꾼다.
// 밝은 색으로 고정한 칸의 바탕(canvas)이 어둡게 읽히면 그런 경우다.
(()=>{
 const probe=document.createElement('div');
 probe.style.cssText='display:none;background-color:canvas;color-scheme:light';
 document.documentElement.append(probe);
 const rgb=/^rgb\((\d+), (\d+), (\d+)\)$/.exec(getComputedStyle(probe).backgroundColor);
 probe.remove();
 if(!rgb||+rgb[1]+ +rgb[2]+ +rgb[3]>=384)return;
 document.documentElement.setAttribute('data-forced-dark','');
 document.querySelectorAll('.wordmark picture,.footer-logo picture').forEach(picture=>{
  picture.querySelectorAll('source').forEach(source=>source.remove());
  const img=picture.querySelector('img');img.src=img.getAttribute('src').replace('-ink.','-white.');
 });
})();
const menu=document.querySelector('#menu'),mobile=document.querySelector('#mobile-nav');
function closeMenu(){mobile.hidden=true;menu.setAttribute('aria-expanded','false');menu.querySelector('span').textContent='＋';markScrolled()}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));mobile.hidden=!open;menu.querySelector('span').textContent=open?'−':'＋'});
mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mobile.hidden){closeMenu();menu.focus()}});
window.addEventListener('pageshow',()=>{if(location.hash.startsWith('#product-'))document.querySelector(location.hash)?.focus({preventScroll:true})});
// The sticky header only draws its rule once content is underneath it.
const markScrolled=()=>document.documentElement.classList.toggle('is-scrolled',window.scrollY>8||!mobile.hidden);
markScrolled();window.addEventListener('scroll',markScrolled,{passive:true});menu.addEventListener('click',markScrolled);

// PAGE 미리 보기. 카드를 누르면 아래에서 한 장이 올라온다.
// 스크립트가 없으면 미리 보기의 틀은 hidden 상태로 남는다.
const sheet=document.querySelector('#pv-sheet');
if(sheet){
 const root=document.documentElement,scrim=document.querySelector('#pv-scrim'),zone=sheet.querySelector('.pv-drag');
 const $=id=>document.getElementById(id);
 const others=()=>[...document.body.children].filter(el=>el!==sheet&&el!==scrim&&el.tagName!=='SCRIPT');
 let opener=null;
 sheet.hidden=false;scrim.hidden=false; // 이제부터는 CSS(visibility·transform)가 감춘다
 const openSheet=link=>{
  const card=link.closest('.product');opener=link;
  const code=card.querySelector('.product-meta span').textContent.trim(),name=card.querySelector('h3').textContent.trim();
  $('pv-code').textContent=code;$('pv-name').textContent=name;$('pv-num').textContent=code.replace('PAGE_','');
  $('pv-num').style.viewTransitionName='page-'+code.replace('PAGE_',''); // 열려 있는 동안은 이 숫자가 그 이름을 갖는다
  $('pv-scene').textContent=card.querySelector('.card-scene').textContent.trim();
  $('pv-text').textContent=card.dataset.note||'';
  sheet.style.transform='';root.setAttribute('data-pv-open','');
  others().forEach(el=>{el.inert=true});
  $('pv-close').focus({preventScroll:true});
 };
 const closeSheet=()=>{
  if(!root.hasAttribute('data-pv-open'))return;
  root.removeAttribute('data-pv-open');others().forEach(el=>{el.inert=false});
  $('pv-num').style.viewTransitionName=''; // 이름을 카드의 숫자에게 돌려준다
  sheet.style.transform='';if(opener)opener.focus({preventScroll:true});
 };
 document.querySelectorAll('.product .card-link').forEach(link=>link.addEventListener('click',e=>{
  if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return; // 새 탭으로 열기 등은 그대로 둔다
  e.preventDefault();openSheet(link);
 }));
 scrim.addEventListener('click',closeSheet);$('pv-close').addEventListener('click',closeSheet);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
 window.addEventListener('pageshow',e=>{if(e.persisted)closeSheet()}); // 뒤로 가기로 돌아왔을 때 열린 채 남지 않게

 // 끌어서 닫기: 끄는 동안 1:1, 놓은 속도로 도착점을 예측, 위쪽 경계는 부드럽게 저항
 const project=(v,d=.998)=>(v/1000)*d/(1-d),rubber=(over,dim,c=.55)=>(over*dim*c)/(dim+c*Math.abs(over));
 zone.addEventListener('pointerdown',e=>{
  if(e.target.closest('button,a'))return;
  try{zone.setPointerCapture(e.pointerId)}catch(err){}
  const startY=e.clientY,h=sheet.offsetHeight;let last={y:e.clientY,t:e.timeStamp},v=0,moved=false;
  const move=ev=>{
   let dy=ev.clientY-startY;if(!moved&&Math.abs(dy)<4)return;moved=true;
   sheet.style.transition='none';if(dy<0)dy=-rubber(-dy,h);sheet.style.transform='translateY('+dy+'px)';
   const dt=ev.timeStamp-last.t;if(dt>0)v=(ev.clientY-last.y)/dt*1000;last={y:ev.clientY,t:ev.timeStamp};
  };
  const up=ev=>{
   zone.removeEventListener('pointermove',move);zone.removeEventListener('pointerup',up);zone.removeEventListener('pointercancel',up);
   if(!moved)return;
   if(ev.timeStamp-last.t>80)v=0; // 멈췄다가 놓으면 던진 것이 아니다
   const landing=Math.max(0,ev.clientY-startY)+project(v);
   sheet.style.transition='';if(landing>h*.5)closeSheet();else sheet.style.transform='';
  };
  zone.addEventListener('pointermove',move);zone.addEventListener('pointerup',up);zone.addEventListener('pointercancel',up);
 });
}

// 첫 화면을 여는 빛(홈 화면에만 있다). 스크롤은 그대로 두고, 화면 위에 얹은 한 겹의 빛만 바꾼다.
// 이 스크립트가 4초 안에 준비되지 않으면 화면의 머리 부분에 있는 짧은 스크립트가 이 겹을 치우고 tunnel-off 를 남긴다.
const tunnel=document.querySelector('#tunnel');
if(tunnel&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.documentElement.classList.contains('tunnel-off')){
 const root=document.documentElement,space=document.querySelector('#tunnel-space'),copy=document.querySelector('.hero-copy');
 const cv=tunnel.querySelector('.tunnel-light'),ctx=cv.getContext('2d'),wash=tunnel.querySelector('.tunnel-wash'),words=tunnel.querySelector('.tunnel-words'),cue=tunnel.querySelector('.tunnel-cue');
 const darkScreen=matchMedia('(prefers-color-scheme: dark)');
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),smooth=(a,b,v)=>{const x=clamp((v-a)/(b-a));return x*x*(3-2*x)};
 // 먼지는 터널을 지나는 동안 다섯 번쯤 스쳐 가고(LOOPS), 빠를수록 꼬리가 길어지며(TAIL),
 // 손을 멈춘 뒤에도 잠깐 더 흘러가다 잦아든다(PUSH, KEEP).
 const LOOPS=5,TAIL=2.6,PUSH=.9,KEEP=.9;
 let W=0,H=0,dust=[],wide=null,waiting=false,arrived=false,lastScroll=null,lastFlow=null,vel=0,flow=0;
 const size=()=>{
  const dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  // 먼지는 처음 한 번, 그리고 화면 폭의 갈래가 바뀔 때만 다시 뿌린다(주소창이 접힐 때마다 튀지 않게)
  if(wide!==(W>=720)){
   wide=W>=720;
   dust=Array.from({length:wide?180:95},()=>{const bright=Math.random()<.14; // 일곱에 하나는 길고 밝은 빛줄기
    return{a:Math.random()*Math.PI*2,d:Math.random(),m:.65+Math.random()*.9,w:(.6+Math.random())*(bright?1.5:1),o:(.3+Math.random()*.6)*(bright?1.4:1),blue:Math.random()<.3}});
  }
 };
 const paint=(p,t,step)=>{
  ctx.clearRect(0,0,W,H);
  const cx=W/2,cy=H/2,far=Math.max(W,H);
  // 터널 끝의 빛: 멀리 있을 때는 천천히, 가까워질수록 빨리 커진다.
  // 화면이 어두운 기기에서는 빛이 화면을 다 덮기 전에 잦아든다(끝이 어두운 화면이라서).
  const glow=darkScreen.matches||root.hasAttribute('data-forced-dark')?.9*(1-smooth(.4,.7,p)):1;
  if(glow>.01){
   const g=ctx.createRadialGradient(cx,cy,0,cx,cy,far*.025*Math.pow(80,clamp(p/.72)));
   g.addColorStop(0,'#efefef');g.addColorStop(.22,'#efefef');g.addColorStop(.38,'#dbe6ee');g.addColorStop(.58,'rgba(125,174,211,.72)');g.addColorStop(.76,'rgba(37,79,114,.42)');g.addColorStop(1,'rgba(0,0,0,0)');
   ctx.globalAlpha=glow;ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  }
  // 먼지는 빛 쪽에서 나와 가장자리로 흘러간다. 가만히 있을 때는 거의 보이지 않고, 움직일 때 밝아진다.
  const fade=1-smooth(.4,.62,p);if(fade<=.01)return;
  const r0=far*.03,k=Math.log(Math.hypot(W,H)*.56/r0),lit=.14+.86*smooth(0,.02,Math.abs(step));
  ctx.lineCap='round';
  for(const q of dust){
   let f=(q.d+t*q.m)%1;if(f<0)f+=1;
   const alpha=Math.min(1,q.o*smooth(0,.2,f)*(1-smooth(.86,1,f))*fade*lit);if(alpha<.02)continue;
   const r=r0*Math.exp(k*f),tail=r0*Math.exp(k*clamp(f-clamp(step*TAIL*q.m,-.16,.16))),cos=Math.cos(q.a),sin=Math.sin(q.a);
   ctx.strokeStyle=(q.blue?'rgba(125,174,211,':'rgba(239,239,239,')+alpha.toFixed(3)+')';
   ctx.lineWidth=q.w*(.5+1.5*f)*(wide?1:.7);
   ctx.beginPath();ctx.moveTo(cx+cos*tail,cy+sin*tail);ctx.lineTo(cx+cos*r+.01,cy+sin*r+.01);ctx.stroke();
  }
 };
 const request=()=>{if(!waiting){waiting=true;requestAnimationFrame(draw)}};
 const draw=()=>{
  waiting=false;
  const p=clamp(scrollY/(space.offsetHeight||1)); // 0 = 맨 위(어둠), 1 = 다 밝아짐
  // 스크롤이 민 만큼 나아가고, 손의 빠르기가 남아 있는 동안은 조금 더 흘러간다
  const ts=p*LOOPS;if(lastScroll===null)lastScroll=ts;
  vel=vel*KEEP+(ts-lastScroll)*(1-KEEP);lastScroll=ts;flow+=vel*PUSH;
  const t=ts+flow;if(lastFlow===null)lastFlow=t;
  const step=t-lastFlow;lastFlow=t; // 이번 장면에서 움직인 만큼이 꼬리의 길이가 된다
  if(p<1)paint(p,t,step);
  if(Math.abs(vel)>.0003)request();
  words.style.opacity=(1-smooth(.05,.2,p)).toFixed(3);
  cue.style.opacity=(1-smooth(.02,.1,p)).toFixed(3);
  wash.style.opacity=smooth(.56,.72,p).toFixed(3);
  if(!arrived&&p>.8){arrived=true;copy.classList.remove('wait')}
  // 다 밝아지면 이 겹이 걷히면서 밑에서 올라오던 첫 화면이 드러난다
  tunnel.style.opacity=(1-smooth(.76,.97,p)).toFixed(3);
  tunnel.style.visibility=p>=.97?'hidden':'visible';
  // 머리줄: 어두울 때는 흰 글씨, 중간 밝기에서는 물러나고, 밝아지면 평소대로
  root.classList.toggle('in-tunnel',p<.24);
  root.classList.toggle('tunnel-mid',p>=.24&&p<.76);
 };
 if(!root.classList.contains('js-tunnel'))root.classList.add('js-tunnel','tunnel-late');
 root.classList.add('tunnel-on');
 size();
 if(root.classList.contains('tunnel-late')){
  // 브라우저가 스크롤 자리를 되돌린 뒤에 그린다. 첫 화면의 글은 숨기지 않는다.
  arrived=true;addEventListener('load',()=>setTimeout(draw,0));
 }else{copy.classList.add('wait');draw()}
 addEventListener('scroll',request,{passive:true});
 addEventListener('resize',()=>{size();request()});
 addEventListener('pageshow',e=>{if(e.persisted)request()});
}
