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
