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
// 빛은 카메라로 찍은 빛처럼(노출이 오르며 중심이 하얗게 날아가고 둘레로 번진다), 먼지는 공기 중에 떠 있는 입자처럼 그린다.
const tunnel=document.querySelector('#tunnel');
if(tunnel&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.documentElement.classList.contains('tunnel-off')){
 const root=document.documentElement,space=document.querySelector('#tunnel-space'),copy=document.querySelector('.hero-copy');
 const cv=tunnel.querySelector('.tunnel-light'),ctx=cv.getContext('2d'),wash=tunnel.querySelector('.tunnel-wash'),words=tunnel.querySelector('.tunnel-words'),cue=tunnel.querySelector('.tunnel-cue');
 const darkScreen=matchMedia('(prefers-color-scheme: dark)');
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),smooth=(a,b,v)=>{const x=clamp((v-a)/(b-a));return x*x*(3-2*x)};
 const smoother=(a,b,v)=>{const x=clamp((v-a)/(b-a));return x*x*x*(x*(x*6-15)+10)};
 // 앞으로 나아가는 거리는 스크롤을 따르고(런 동안 입자 하나가 LOOPS 번 곁을 지나간다), 손을 멈춘 뒤에도 잠깐 더 흐르다 잦아든다
 const LOOPS=5,PUSH=.9,KEEP=.9;
 let W=0,H=0,dpr=0,dust=[],wide=null,waiting=false,arrived=false,lastScroll=null,lastFlow=null,vel=0,flow=0;
 // 빛의 퍼짐: 하얗게 날아가는 중심, 그 둘레의 부드러운 번짐, 멀리까지 아주 엷게 남는 빛
 const spread=x=>Math.exp(-((x/.34)**2))+.38*Math.exp(-((x/.8)**2))+.012/(1+(x/1.3)**2);
 // 노출: 빛을 많이 받을수록 하얗게 차오르되, 넘치지 않고 서서히 포화된다
 const tone=e=>1-Math.exp(-e);
 const COOL=[125,174,211],WHITE=[244,245,246];
 // 입자의 색: 대부분 밝은 회색, 일부는 기준 파랑
 const COLORS=['239,239,239','125,174,211'];
 // 고운 입자(필름 결): 움직이지 않는 한 장을 그림판 위에 겹쳐 둔다. 겹치는 방식 때문에 검정 위에서는 보이지 않고
 // 빛 위에서만 아주 옅게 보여 띠를 지운다
 const grainTile=document.createElement('canvas');grainTile.width=grainTile.height=160;
 {const x=grainTile.getContext('2d'),d=x.createImageData(160,160);
  for(let i=0;i<d.data.length;i+=4){d.data[i]=d.data[i+1]=d.data[i+2]=122+Math.floor(Math.random()*13);d.data[i+3]=255}x.putImageData(d,0,0)}
 const grainLayer=document.createElement('div');
 grainLayer.style.cssText='position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;background:url('+grainTile.toDataURL()+') 0 0/'+(160/Math.min(devicePixelRatio||1,2))+'px';
 cv.after(grainLayer);
 // 공기 중의 먼지: 화면 너비의 갈래가 바뀔 때만 다시 뿌린다(주소창이 접힐 때마다 튀지 않게)
 const seed=()=>{dust=Array.from({length:wide?380:200},()=>({x:(Math.random()*2-1)*.95,y:(Math.random()*2-1)*.95,z:Math.random(),ph:Math.random()*6.283,blue:Math.random()<.28,lit:.6+Math.random()*.4}))};
 const size=()=>{
  dpr=Math.min(devicePixelRatio||1,2);
  W=innerWidth;H=innerHeight;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  if(wide!==(W>=720)){wide=W>=720;seed()}
 };
 const paint=(p,t,step,dark)=>{
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const cx=W/2,cy=H/2,far=Math.max(W,H);
  // 화면이 어두운 기기에서는 빛이 화면을 다 덮기 전에 잦아든다(끝이 어두운 화면이라서)
  const glow=dark?.9*(1-smooth(.4,.7,p)):1;
  // 빛: 멀리 있을 때는 천천히, 가까워질수록 빨리 커지고(예전과 같은 곡선), 노출은 뒤로 갈수록 오른다
  const R=far*.025*Math.pow(80,clamp(p/.72)),expo=2.4+9*smooth(.42,.74,p);
  if(glow>.01){
   let X=1;while(X<40&&tone(expo*spread(X))>.002)X*=1.25;
   const E=Math.min(R*X,far*1.6),g=ctx.createRadialGradient(cx,cy,0,cx,cy,E);
   // 빛은 그리는 네모의 끝(E)에서 정확히 0이 되게 한다(끝의 값을 덜어 낸다). 그러지 않으면 네모 밖과 안의 차이가
   // 어둠 위에 엷은 네모 테두리로 보인다. 네모가 화면보다 크면 덜지 않는다
   const Le=R*X>far*1.6?0:tone(expo*spread(E/R));
   for(let i=0;i<=36;i++){const s=(i/36)**2,L=tone(expo*spread(s*E/R)),k=Math.pow(L,1.2);
    g.addColorStop(s,'rgba('+Math.round(COOL[0]+(WHITE[0]-COOL[0])*k)+','+Math.round(COOL[1]+(WHITE[1]-COOL[1])*k)+','+Math.round(COOL[2]+(WHITE[2]-COOL[2])*k)+','+(Math.max(0,(L-Le)/(1-Le))*glow).toFixed(3)+')')}
   const x0=Math.max(0,cx-E),y0=Math.max(0,cy-E);
   ctx.fillStyle=g;ctx.fillRect(x0,y0,Math.min(W,cx+E)-x0,Math.min(H,cy+E)-y0);
  }
  // 먼지: 멀리 있는 것은 아주 작은 점, 가까이 올수록 크고 초점이 나간 흐릿한 원이 되어 화면 밖으로 스쳐 간다.
  // 빛을 받는 만큼만 보이고, 어둠 속의 먼지는 거의 보이지 않는다. 가만히 있을 때는 아주 천천히 떠다닌다
  const fade=1-smooth(.4,.62,p);
  if(fade>.01){
   const FX=W*.5,FY=H*.5,tm=performance.now()*.001,amb=.12+.25*smooth(0,.5,p);
   for(const q of dust){
    let z=(q.z-t)%1;if(z<=0)z+=1;z=.04+.96*z;   // 1 = 멀리, .04 = 눈앞
    const xw=q.x+.012*Math.sin(tm*.21+q.ph),yw=q.y+.012*Math.cos(tm*.17+q.ph*1.3);
    const sx=cx+xw*FX/z,sy=cy+yw*FY/z,r=Math.min(28,Math.max(.6,.75/Math.pow(z,1.3)))*(wide?1:.85);
    if(sx<-r||sx>W+r||sy<-r||sy>H+r)continue;
    const light=tone(expo*spread(Math.hypot(sx-cx,sy-cy)/R))*glow,big=r>2.2;
    let a=(amb+1.2*light)*q.lit*fade*smooth(1,.82,z)*smooth(.04,.09,z);
    if(big)a*=.45*Math.min(1,6/r);
    if(a<.008)continue;
    // 셔터가 열린 동안 움직인 만큼만, 진행 방향으로 아주 짧게 늘인다(선이 되지 않게 1.6배까지)
    const ux=sx-cx,uy=sy-cy,ul=Math.hypot(ux,uy)||1,c=ux/ul,s=uy/ul,e=1+.6*clamp(ul*Math.abs(step)/z/(2*r));
    ctx.globalAlpha=Math.min(1,a);
    const rgb=COLORS[q.blue?1:0];
    if(r*dpr<1.2){   // 아주 먼 점: 화면 점 둘 크기의 작은 네모(그 크기에서는 둥근 점과 같아 보인다)
     ctx.fillStyle='rgb('+rgb+')';ctx.fillRect(sx-1/dpr,sy-1/dpr,2/dpr,2/dpr);continue}
    ctx.beginPath();ctx.ellipse(sx,sy,r*e,r,Math.atan2(s,c),0,6.2832);
    if(!big){ctx.fillStyle='rgba('+rgb+',.8)';ctx.fill();continue}   // 작은 부드러운 점
    // 가까운 먼지: 초점이 나간 둥근 빛(가운데가 고르고 가장자리가 부드럽게 꺼진다)
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,r*e);
    g.addColorStop(0,'rgba('+rgb+',.7)');g.addColorStop(.6,'rgba('+rgb+',.66)');g.addColorStop(.82,'rgba('+rgb+',.4)');g.addColorStop(1,'rgba('+rgb+',0)');
    ctx.fillStyle=g;ctx.fill();
   }
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;
  }
  // 밝은 화면: 빛이 화면을 덮으면 노출이 넘쳐 하얗게 날아간다
  if(!dark){const ow=smooth(.6,.74,p);if(ow>0){ctx.globalAlpha=ow;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}}
 };
 // 넘친 빛이 가라앉는 동안: 겹이 빛을 더하는 방식이 되어, 하얗게 날아갔던 밑의 첫 화면이 밝기를 되찾으며 드러난다
 const settle=w=>{ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);if(w>0){ctx.globalAlpha=w;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}};
 const request=()=>{if(!waiting){waiting=true;requestAnimationFrame(draw)}};
 const draw=()=>{
  waiting=false;
  const p=clamp(scrollY/(space.offsetHeight||1)); // 0 = 맨 위(어둠), 1 = 다 밝아짐
  const ts=p*LOOPS;if(lastScroll===null)lastScroll=ts;
  vel=vel*KEEP+(ts-lastScroll)*(1-KEEP);lastScroll=ts;flow+=vel*PUSH;
  const t=ts+flow;if(lastFlow===null)lastFlow=t;
  const step=t-lastFlow;lastFlow=t;
  const dark=darkScreen.matches||root.hasAttribute('data-forced-dark');
  const over=!dark&&p>=.76;
  if(dark){
   // 어두운 화면: 바탕색(어둠)으로 가라앉은 뒤 걷힌다
   tunnel.style.mixBlendMode='';
   wash.style.opacity=smooth(.52,.76,p).toFixed(3);
   tunnel.style.opacity=(1-smoother(.74,.98,p)).toFixed(3);
   if(p<1)paint(p,t,step,true);
  }else{
   wash.style.opacity='0';
   tunnel.style.opacity='1';
   tunnel.style.mixBlendMode=over?'screen':'';
   if(over)settle(1-smoother(.76,.98,p));else paint(p,t,step,false);
  }
  tunnel.style.visibility=p>=.98?'hidden':'visible';
  // 공기 중의 먼지는 가만히 있을 때도 아주 천천히 움직이므로, 빛 겹이 보이는 동안은 계속 그린다
  if(Math.abs(vel)>.0003||(p<.76&&!document.hidden))request();
  words.style.opacity=(1-smooth(.05,.2,p)).toFixed(3);
  cue.style.opacity=(1-smooth(.02,.1,p)).toFixed(3);
  if(!arrived&&p>.8){arrived=true;copy.classList.remove('wait')}
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
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)request()});
}
