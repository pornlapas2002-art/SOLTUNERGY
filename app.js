(()=>{
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
$('#yr').textContent=new Date().getFullYear();

/* ================= i18n ================= */
/* Dictionary keys are the Russian source strings (window.I18N in i18n.js).
   Rich blocks with inline markup use data-i18n-html="key" → window.I18N_HTML[key][lang]. */
const LANGS=['ru','en','th','zh'];
const D=window.I18N||{}, H=window.I18N_HTML||{};
const urlLang=new URLSearchParams(location.search).get('lang');
let lang=LANGS.includes(urlLang)?urlLang:(LANGS.includes(store.get('sol_lang'))?store.get('sol_lang'):'ru');
const missing=window.__i18nMissing=new Set();
const t=s=>{if(lang==='ru'||!s)return s;const e=D[s]||D[s.replace(/\u00a0/g,' ')];if(e&&e[lang])return e[lang];if(/[А-Яа-яЁё]/.test(s))missing.add(s);return s};
window.t=t;
const SKIP='script,style,#grid,#quiz,#modalBody,#cmpBar,#leadForm .ok';
const textNodes=[],attrNodes=[];
function collect(){
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>{
    if(!n.nodeValue.trim())return NodeFilter.FILTER_REJECT;
    const p=n.parentElement;if(!p||p.closest(SKIP)||p.closest('[data-i18n-html]'))return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT}});
  let n;while((n=w.nextNode())){const m=n.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);textNodes.push({n,a:m[1],s:m[2],b:m[3]})}
  $$('[alt],[placeholder],[aria-label]').forEach(el=>['alt','placeholder','aria-label'].forEach(at=>{if(el.hasAttribute(at)&&!el.closest(SKIP))attrNodes.push({el,at,s:el.getAttribute(at)})}));
  $$('[data-i18n-html]').forEach(el=>el.__ru=el.innerHTML);
}
const META={
  ru:{title:document.title,desc:$('meta[name=description]').content},
  en:{title:'Soltunergy — solar systems for homes and businesses in Thailand',desc:'Soltunergy — turnkey design, supply and installation of solar power systems for homes, villas, hotels and businesses. System matching based on your electricity bill.'},
  th:{title:'Soltunergy — ระบบโซลาร์เซลล์สำหรับบ้านและธุรกิจในประเทศไทย',desc:'Soltunergy ออกแบบ จัดหา และติดตั้งระบบโซลาร์แบบครบวงจรสำหรับบ้าน วิลล่า โรงแรม และธุรกิจ แนะนำระบบตามค่าไฟของคุณ'},
  zh:{title:'Soltunergy — 泰国家庭与企业太阳能系统',desc:'Soltunergy 为住宅、别墅、酒店和企业提供太阳能系统设计、供货与安装一站式服务，根据电费账单为您匹配系统。'}
};
function applyStatic(){
  document.documentElement.lang=lang==='zh'?'zh-Hans':lang;
  textNodes.forEach(x=>x.n.nodeValue=x.a+t(x.s)+x.b);
  attrNodes.forEach(x=>x.el.setAttribute(x.at,t(x.s)));
  $$('[data-i18n-html]').forEach(el=>{const k=el.dataset.i18nHtml;el.innerHTML=lang==='ru'?el.__ru:((H[k]&&H[k][lang])||el.__ru)});
  document.title=META[lang].title;$('meta[name=description]').content=META[lang].desc;
  $$('[data-l]').forEach(b=>b.classList.toggle('on',b.dataset.l===lang));
  const cl=$('#cLang');if(cl&&!cl.dataset.touched)cl.selectedIndex=['ru','th','en','zh'].indexOf(lang);
}
$('#cLang').addEventListener('change',e=>e.target.dataset.touched=1);
function setLang(l){
  if(!LANGS.includes(l)||l===lang)return;
  lang=l;store.set('sol_lang',l);
  const u=new URL(location.href);if(l==='ru')u.searchParams.delete('lang');else u.searchParams.set('lang',l);history.replaceState(null,'',u);
  applyStatic();renderGrid();updCmp();render();
  if(modal.classList.contains('show'))closeModal();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-l]');if(b)setLang(b.dataset.l)});

/* ================= UI ================= */
const hdr=$('#hdr');
const onScroll=()=>hdr.classList.toggle('solid',scrollY>40||document.body.classList.contains('menu-open'));
addEventListener('scroll',onScroll,{passive:true});onScroll();
$('#burger').onclick=()=>{document.body.classList.toggle('menu-open');onScroll()};
$$('#mnav a').forEach(a=>a.onclick=()=>{document.body.classList.remove('menu-open');onScroll()});

const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -40px'});
$$('.rv').forEach((el,i)=>{el.style.transitionDelay=(i%4)*70+'ms';io.observe(el)});

const px=$$('[data-px]');
const doPx=()=>px.forEach(img=>{const r=img.parentElement.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;const p=(r.top+r.height)/(innerHeight+r.height);img.style.transform=`translateY(${-p*23}%)`});
addEventListener('scroll',doPx,{passive:true});doPx();

const solImgs=$$('#solImg img');
$$('.sol-item').forEach(it=>{const act=()=>{$$('.sol-item').forEach(x=>x.classList.toggle('on',x===it));solImgs.forEach((im,i)=>im.classList.toggle('on',i==it.dataset.i));$('#solTag').textContent=it.dataset.tag};it.addEventListener('mouseenter',act);it.addEventListener('click',act)});

const track=$('#track');
$$('.slider-nav button').forEach(b=>b.onclick=()=>{const w=track.firstElementChild.offsetWidth+24;track.scrollBy({left:w*b.dataset.dir,behavior:'smooth'})});

const tImgs=$$('#tabsImg img');
$$('.tab').forEach(x=>x.onclick=()=>{$$('.tab').forEach(y=>y.classList.toggle('on',y===x));tImgs.forEach((im,i)=>im.classList.toggle('on',i==x.dataset.i))});

$$('.qa button').forEach(b=>b.onclick=()=>{const q=b.parentElement,on=q.classList.contains('on');$$('.qa').forEach(x=>x.classList.remove('on'));if(!on)q.classList.add('on')});

/* ================= packages ================= */
const P=()=>`<span class="pending">${t('уточняется')}</span>`;
const kWu=()=>t('кВт');
const forWhom={5:'Небольшой дом',10:'Типичный дом',15:'Большой дом / вилла',20:'Дом + домашний офис',25:'Средний бизнес',30:'Бизнес / здание'};
const tiers={
  Essential:{type:'ongrid',typeTxt:'On-Grid',battery:'Опционально, по проекту',extra:'Базовый мониторинг инвертора'},
  Signature:{type:'hybrid',typeTxt:'Hybrid-ready',battery:'Подготовка под батарею',extra:'Приложение и мониторинг'},
  Prestige:{type:'hybrid',typeTxt:'Hybrid',battery:'Рекомендуется, ёмкость по проекту',extra:'Smart Energy, приоритет сервиса'}
};
const pkgs=[];
['Essential','Signature','Prestige'].forEach(tr=>[5,10,15,20,25,30].forEach(kw=>pkgs.push({id:tr[0]+kw,tier:tr,kw,...tiers[tr],phase:kw<=5?'1 фаза':kw<=10?'1 или 3 фазы':'3 фазы'})));
let fTier='Signature',fSize='all',fType='all';
const cmp=new Set();
const vis=p=>{const n=Math.min(6,Math.round(p.kw/5)+1);let s='';for(let i=0;i<n;i++)s+=`<svg width="${26+p.kw/3}" height="${40+p.kw}" viewBox="0 0 30 50"><rect x="1" y="1" width="28" height="48" rx="2" fill="#172B3B"/><path d="M1 13h28M1 25h28M1 37h28M10 1v48M20 1v48" stroke="#2f4a5e" stroke-width="1"/></svg>`;
  s+=`<svg width="34" height="44" viewBox="0 0 34 44"><rect x="1" y="1" width="32" height="42" rx="5" fill="#fff" stroke="#d8dcd8"/><rect x="11" y="16" width="12" height="7" rx="1.5" fill="#123E32"/><circle cx="14" cy="19.5" r="1.2" fill="#C5A46D"/></svg>`;
  if(p.type==='hybrid')s+=`<svg width="30" height="58" viewBox="0 0 30 58"><rect x="1" y="1" width="28" height="56" rx="4" fill="#f4f4f1" stroke="#d8dcd8"/><path d="M1 20h28M1 38h28" stroke="#d8dcd8"/><rect x="13" y="6" width="4" height="9" rx="2" fill="#C5A46D"/></svg>`;
  return s};
function renderGrid(){
  const list=pkgs.filter(p=>(!fTier||p.tier===fTier)&&(fSize==='all'||p.kw==fSize)&&(fType==='all'||p.type===fType));
  $('#grid').innerHTML=list.length?list.map(p=>`
  <article class="pk">
    <div class="pk-top"><div class="tier-n">${p.tier}</div><div class="kw">${p.kw}<small>${kWu()}</small></div><div class="for">${t(forWhom[p.kw])}</div><div class="pk-vis">${vis(p)}</div></div>
    <div class="pk-body">
      <div class="spec"><div><span>${t('Тип системы')}</span><b>${p.typeTxt}</b></div><div><span>${t('Фазность')}</span><b>${t(p.phase)}</b></div><div><span>${t('Батарея')}</span><b>${t(p.battery)}</b></div><div><span>${t('Бренды')}</span><b>${t('На выбор')}</b></div></div>
      <div class="price"><b>${t('Цена по запросу')}</b><label class="cmp-check"><input type="checkbox" data-c="${p.id}" ${cmp.has(p.id)?'checked':''}> ${t('Сравнить')}</label></div>
      <div class="pk-act"><button class="btn btn-line" data-d="${p.id}">${t('Подробнее')}</button><a href="#contact" class="btn btn-green">${t('Запросить')}</a></div>
    </div>
  </article>`).join(''):`<div class="empty">${t('Нет пакетов по выбранным фильтрам.')}</div>`;
}
$$('.tier').forEach(x=>x.onclick=()=>{fTier=fTier===x.dataset.tier?null:x.dataset.tier;$$('.tier').forEach(y=>y.classList.toggle('on',y.dataset.tier===fTier));renderGrid()});
[['#fSize',v=>fSize=v],['#fType',v=>fType=v]].forEach(([g,set])=>$$(g+' .pill').forEach(b=>b.onclick=()=>{$$(g+' .pill').forEach(x=>x.classList.toggle('on',x===b));set(b.dataset.v);renderGrid()}));

const rows=p=>[
  ['grp','Общее'],['Пакет',`${p.tier} ${p.kw} ${kWu()}`,1],['Подходит для',t(forWhom[p.kw]),1],['Тип системы',p.typeTxt,1],['Фазность',t(p.phase),1],['Цена',t('По запросу — после обследования'),1],
  ['grp','Солнечные панели'],['Бренд / модель',P(),1],['Мощность панели, Wp',P(),1],['Количество',P(),1],['DC, kWp',P(),1],
  ['grp','Инвертор'],['Бренд / модель',P(),1],['AC, кВт',P(),1],
  ['grp','Батарея'],['Модель / ёмкость, kWh',t(p.battery),1],
  ['grp','Гарантии и работы'],['Гарантия на изделие',P(),1],['Гарантия на мощность',P(),1],['Гарантия на монтаж',P(),1],['Мониторинг',t(p.extra),1],['Сроки, состав работ, НДС, разрешения',t('Указываются в предложении'),1]
];
const modal=$('#modal');
const openModal=h=>{$('#modalBody').innerHTML=h;modal.classList.add('show');document.body.style.overflow='hidden'};
const closeModal=()=>{modal.classList.remove('show');document.body.style.overflow=''};
modal.onclick=e=>{if(e.target===modal||e.target.closest('.modal-x')||e.target.closest('[data-close]'))closeModal()};
addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
$('#grid').addEventListener('click',e=>{
  const d=e.target.closest('[data-d]');if(!d)return;
  const p=pkgs.find(x=>x.id===d.dataset.d);
  openModal(`<span class="label">${t('Карточка пакета')}</span><h2 style="margin-top:10px"><span class="serif">${p.tier}</span> ${p.kw} ${kWu()}</h2><table class="mtable">${rows(p).map(r=>r[0]==='grp'?`<tr class="grp"><td colspan="2">${t(r[1])}</td></tr>`:`<tr><th>${t(r[0])}</th><td>${r[1]}</td></tr>`).join('')}</table><div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap"><a href="#contact" class="btn btn-green" data-close>${t('Запросить предложение')}</a><a href="#find" class="btn btn-line" data-close>${t('Подобрать по счёту')}</a></div>`);
});
$('#grid').addEventListener('change',e=>{
  const c=e.target.dataset.c;if(!c)return;
  if(e.target.checked){if(cmp.size>=3){e.target.checked=false;alert(t('Можно сравнить не более 3 пакетов'));return}cmp.add(c)}else cmp.delete(c);
  updCmp();
});
function updCmp(){$('#cmpTxt').textContent=`${t('Выбрано для сравнения:')} ${cmp.size} / 3`;$('#cmpClear').textContent=t('Сбросить');$('#cmpGo').textContent=t('Сравнить');$('#cmpBar').classList.toggle('show',cmp.size>0);$('#cmpGo').disabled=cmp.size<2;$('#cmpGo').style.opacity=cmp.size<2?.5:1}
$('#cmpClear').onclick=()=>{cmp.clear();updCmp();renderGrid()};
$('#cmpGo').onclick=()=>{
  const ps=[...cmp].map(id=>pkgs.find(p=>p.id===id));const rs=ps.map(rows);
  openModal(`<span class="label">${t('Сравнение')}</span><h2 style="margin-top:10px">${t('Сравнение пакетов')}</h2><div style="overflow-x:auto"><table class="mtable"><thead><tr><th></th>${ps.map(p=>`<th>${p.tier} ${p.kw} ${kWu()}</th>`).join('')}</tr></thead>${rs[0].map((r,i)=>r[0]==='grp'?`<tr class="grp"><td colspan="${ps.length+1}">${t(r[1])}</td></tr>`:`<tr><th>${t(r[0])}</th>${rs.map(x=>`<td>${x[i][1]}</td>`).join('')}</tr>`).join('')}</table></div><p style="font-size:13px;color:var(--muted);margin-top:16px">${t('Неизвестные значения помечены «уточняется» — мы не подставляем непроверенные цифры.')}</p>`);
};

/* ================= quiz ================= */
/* Answers are stored as option indices, so they survive a language switch. */
const Q=[
  {k:'bill',t:'Какой у вас средний счёт за электричество в месяц?',h:'Можно указать точную сумму ниже',o:['До 3 000 ฿','3 000–5 000 ฿','5 000–10 000 ฿','10 000–20 000 ฿','Более 20 000 ฿'],extra:{k:'billExact',l:'Точная сумма, ฿ (необязательно)',type:'number'}},
  {k:'time',t:'Когда вы больше всего потребляете электричество?',o:['Днём','Вечером','Ночью','Круглосуточно']},
  {k:'object',t:'Какой у вас объект?',o:['Дом','Вилла','Офис','Магазин','Отель','Производство','Другое'],extra:{k:'province',l:'Провинция / район объекта',type:'text'}},
  {k:'daytime',t:'Как используется объект днём?',o:['Люди весь день','Частично','Днём пустует','Работает 24 часа']},
  {k:'devices',t:'Какие крупные потребители у вас есть?',h:'Можно выбрать несколько',multi:1,o:['Кондиционеры','Водонагреватели','Бассейн / насосы','Электромобиль (EV)','Бытовая техника','Оборудование / станки','Другое']},
  {k:'backup',t:'Нужно ли резервное питание при отключениях?',o:['Не нужно','Только важные приборы','Всё здание','Батарея — в будущем']},
  {k:'plans',t:'Планируете ли рост потребления?',h:'Можно выбрать несколько',multi:1,none:4,o:['Электромобиль','Больше кондиционеров','Бассейн','Расширение здания','Не планирую']},
  {k:'budget',t:'Какой бюджет для вас комфортен?',h:'Бюджет не определяет размер системы — его определяет потребление',o:['До 150 000 ฿','150 000–300 000 ฿','300 000–500 000 ฿','Более 500 000 ฿'],un:'Пока не определён'}
];
Q.forEach(q=>q.opts=[...q.o,q.un||'Не знаю']);
const labels={bill:'Счёт в месяц',time:'Пик потребления',object:'Объект',daytime:'Использование днём',devices:'Потребители',backup:'Резерв',plans:'Планы',budget:'Бюджет'};
const arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const okIcon='<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 12 5 5 9-10"/></svg></div>';
const clip='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7L14 5.5a3.3 3.3 0 0 1 4.7 4.7L10 19"/></svg>';
let st=store.get('sol_quiz2')||{step:0,a:{}};
const quiz=$('#quiz');
const save=()=>store.set('sol_quiz2',st);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtNum=n=>Number(n).toLocaleString({ru:'ru-RU',en:'en-US',th:'th-TH',zh:'zh-CN'}[lang]);
function render(){
  const n=Q.length;
  if(st.step<n){
    const q=Q[st.step],v=st.a[q.k],last=q.opts.length-1;
    const sel=i=>q.multi?(v||[]).includes(i):v===i;
    quiz.innerHTML=`<div class="q-top"><span>${t('Вопрос')} ${st.step+1} / ${n}</span><span>${Math.round(st.step/n*100)}%</span></div><div class="q-bar"><i style="width:${st.step/n*100}%"></i></div>
    <div class="q-title">${t(q.t)}</div><div class="q-hint">${t(q.h||'Выберите один вариант')}</div>
    <div class="opts">${q.opts.map((o,i)=>`<button class="opt ${q.multi?'multi':''} ${i===last?'unsure':''} ${sel(i)?'on':''}" data-i="${i}"><span class="box"></span>${t(o)}</button>`).join('')}</div>
    ${q.extra?`<div class="field"><label for="qx">${t(q.extra.l)}</label><input class="inp" id="qx" type="${q.extra.type}" value="${esc(st.a[q.extra.k]||'')}"></div>`:''}
    <div class="q-nav"><button class="back" ${st.step?'':'disabled'}>← ${t('Назад')}</button><button class="btn btn-green next">${t(st.step===n-1?'Мой Energy Profile':'Далее')} ${arrow}</button></div>`;
    const nextBtn=$('.next',quiz);
    const ok=()=>{const x=st.a[q.k];return q.multi?(x&&x.length):x!==undefined};
    const upd=()=>{nextBtn.disabled=!ok();nextBtn.style.opacity=ok()?1:.45};upd();
    $$('.opt',quiz).forEach(b=>b.onclick=()=>{
      const i=+b.dataset.i,excl=i===last||i===q.none;
      if(q.multi){let arr=st.a[q.k]||[];if(excl)arr=arr.includes(i)?[]:[i];else{arr=arr.filter(x=>x!==last&&x!==q.none);arr=arr.includes(i)?arr.filter(x=>x!==i):[...arr,i]}st.a[q.k]=arr;$$('.opt',quiz).forEach(x=>x.classList.toggle('on',arr.includes(+x.dataset.i)))}
      else{st.a[q.k]=i;$$('.opt',quiz).forEach(x=>x.classList.toggle('on',x===b))}
      save();upd();
      if(!q.multi&&!q.extra)setTimeout(()=>{st.step++;save();render()},220);
    });
    const qx=$('#qx',quiz);if(qx)qx.oninput=()=>{st.a[q.extra.k]=qx.value;save()};
    nextBtn.onclick=()=>{if(!ok())return;st.step++;save();render()};
    $('.back',quiz).onclick=()=>{st.step--;save();render()};
  } else if(st.step===n){
    const a=st.a;
    const val=q=>{const x=a[q.k];if(x===undefined)return '—';return (Array.isArray(x)?x:[x]).map(i=>t(q.opts[i])).join(', ')};
    const rowsP=Q.map(q=>{let v=val(q);if(q.k==='bill'&&a.billExact)v+=` (≈ ${fmtNum(a.billExact)} ฿)`;if(q.k==='object'&&a.province)v+=` · ${esc(a.province)}`;return `<div><span>${t(labels[q.k])}</span><b>${v}</b></div>`}).join('');
    const hybridHint=[1,2,3].includes(a.backup);
    quiz.innerHTML=`<div class="q-top"><span>${t('Готово')}</span><span>100%</span></div><div class="q-bar"><i style="width:100%"></i></div>
    <div class="q-title">${t('Ваш Energy Profile')}</div><div class="q-hint">${t('Проверьте ответы — их получит инженер')}</div>
    <div class="profile">${rowsP}</div>
    <div class="status"><span class="dot"></span><div><b>${t('Ожидает оценки инженера.')}</b> ${t('Мощность, цена, выработка и окупаемость будут рассчитаны после проверки данных.')}${hybridHint?' '+t('По вашим ответам инженер рассмотрит вариант Hybrid Ready — это лишь направление, не окончательное решение.'):''}</div></div>
    <div class="q-nav"><button class="back">← ${t('Изменить ответы')}</button><button class="btn btn-gold next">${t('Отправить инженеру')} ${arrow}</button></div>`;
    $('.back',quiz).onclick=()=>{st.step=0;save();render()};
    $('.next',quiz).onclick=()=>{st.step++;save();render()};
  } else if(st.step===n+1){
    const f=st.form||{};
    quiz.innerHTML=`<div class="q-title">${t('Куда отправить рекомендацию?')}</div><div class="q-hint">${t('Инженер свяжется с вами после проверки профиля')}</div>
    <form id="qForm" novalidate>
      <div class="two"><div class="field"><label for="qn">${t('Имя *')}</label><input class="inp" id="qn" required autocomplete="name" value="${esc(f.qn||'')}"></div><div class="field"><label for="qc">${t('Телефон или email *')}</label><input class="inp" id="qc" required value="${esc(f.qc||'')}"></div></div>
      <div class="two"><div class="field"><label for="ql">${t('Язык общения')}</label><select class="inp" id="ql">${['Русский','ไทย','English','中文'].map((o,i)=>`<option ${(f.ql!==undefined?+f.ql:['ru','th','en','zh'].indexOf(lang))===i?'selected':''} value="${i}">${o}</option>`).join('')}</select></div><div class="field"><label for="qa">${t('Адрес / район')}</label><input class="inp" id="qa" value="${esc(f.qa??(st.a.province||''))}"></div></div>
      <div class="field"><label>${t('Счёт или фото крыши (необязательно)')}</label><label class="file">${clip}<span>${t('Прикрепить файл')}</span><input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple></label></div>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="consent"><input type="checkbox" id="qok"> <span>${t('Согласен(на) на обработку персональных данных (PDPA) и')} <a href="#contact">${t('Политику конфиденциальности')}</a>.</span></label>
      <div class="err" id="qErr"></div>
      <div class="q-nav" style="padding-top:12px"><button type="button" class="back">← ${t('Назад')}</button><button class="btn btn-green">${t('Отправить заявку')}</button></div>
    </form>`;
    bindFiles(quiz);
    ['qn','qc','ql','qa'].forEach(id=>$('#'+id).addEventListener('input',e=>{st.form={...(st.form||{}),[id]:e.target.value};save()}));
    $('.back',quiz).onclick=()=>{st.step--;save();render()};
    $('#qForm').onsubmit=async e=>{e.preventDefault();
      const fileInp=$('#qForm .file input');
      const err=!$('#qn').value.trim()||!$('#qc').value.trim()?t('Укажите имя и контакт'):checkContact($('#qc').value)||checkFiles(fileInp)||(!$('#qok').checked?t('Нужно согласие на обработку данных'):'');
      $('#qErr').textContent=err;if(err)return;
      const fd=new FormData();
      fd.append('source','quiz');fd.append('name',$('#qn').value);fd.append('contact',$('#qc').value);
      fd.append('lang',$('#ql').selectedOptions[0].textContent);fd.append('area',$('#qa').value);
      fd.append('answers',JSON.stringify(quizPayload()));fd.append('rules_version',RULES_VERSION);
      fd.append('website',$('#qForm [name=website]').value);
      const res=await submitLead(fd,fileInp,$('#qForm button.btn'),$('#qErr'));
      if(!res)return;
      st.ref=res;st.form={};st.step++;save();render();
    };
  } else {
    const inModal=quiz.closest('#qModal');
    quiz.innerHTML=`<div class="ok thanks">${okIcon}<div class="q-title">${t('Спасибо за заявку!')}</div><p class="thanks-sub">${t('Мы получили ваши ответы. Инженер изучит Energy Profile и свяжется с вами в ближайшее рабочее время.')}</p><div class="num">${st.ref}</div><p style="color:var(--muted);max-width:400px;margin:0 auto;font-size:14px">${t('Сохраните номер заявки — статус:')} <b>new → reviewing</b></p><div class="thanks-act">${inModal?`<button class="btn btn-green" id="qClose">${t('Закрыть')}</button>`:''}<button class="btn btn-line" id="qAgain">${t('Пройти заново')}</button></div></div>`;
    const qc=$('#qClose');if(qc)qc.onclick=()=>closeQuiz();
    $('#qAgain').onclick=()=>{st={step:0,a:{}};save();render()};
  }
}
const refNo=()=>{const d=new Date();return 'SOL-'+String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'-'+Math.random().toString(36).slice(2,6).toUpperCase()};
function bindFiles(ctx){$$('.file input',ctx).forEach(i=>i.onchange=()=>{i.previousElementSibling.textContent=i.files.length?[...i.files].map(f=>f.name).join(', '):t('Прикрепить файл')})}

/* ================= lead submission ================= */
/* Sends to the Supabase Edge Function from config.js; without a URL runs in demo mode. */
const CFG=window.SOL_CONFIG||{};
const RULES_VERSION='none'; // engineer sizing rules are not approved yet → manual review
const MAX_FILES=5,MAX_MB=10,TYPES=['image/jpeg','image/png','application/pdf'];
function checkContact(v){v=v.trim();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)||/^[+\d][\d\s()\-]{6,}$/.test(v)?'':t('Укажите корректный телефон или email')}
function checkFiles(inp){const fs=inp?[...inp.files]:[];if(fs.length>MAX_FILES)return t('Не более 5 файлов');if(fs.some(f=>!TYPES.includes(f.type)))return t('Допустимы только JPG, PNG или PDF');if(fs.some(f=>f.size>MAX_MB*1048576))return t('Каждый файл — не больше 10 МБ');return ''}
function quizPayload(){
  const a=st.a;
  return {answers:a,profile:Q.map(q=>{const x=a[q.k];let v=x===undefined?'—':(Array.isArray(x)?x:[x]).map(i=>q.opts[i]).join(', ');if(q.k==='bill'&&a.billExact)v+=` (≈ ${a.billExact} ฿)`;if(q.k==='object'&&a.province)v+=` · ${a.province}`;return {q:labels[q.k],a:v}})};
}
const ERR={required:'Укажите имя и контакт',contact:'Укажите корректный телефон или email',consent:'Нужно согласие на обработку данных',file_type:'Допустимы только JPG, PNG или PDF',file_size:'Каждый файл — не больше 10 МБ',files_count:'Не более 5 файлов',rate_limit:'Слишком много заявок. Попробуйте позже или напишите нам в LINE.'};
async function submitLead(fd,fileInp,btn,errEl){
  if(fileInp)[...fileInp.files].forEach(f=>fd.append('files',f));
  fd.append('site_lang',lang);fd.append('consent','true');
  const label=btn.innerHTML;btn.disabled=true;btn.style.opacity=.6;btn.textContent=t('Отправляем…');
  const done=()=>{btn.disabled=false;btn.style.opacity=1;btn.innerHTML=label};
  if(!CFG.submitUrl){ // demo mode
    console.warn('[Soltunergy] SOL_CONFIG.submitUrl пуст — заявка не отправлена (демо-режим).');
    await new Promise(r=>setTimeout(r,500));done();return refNo();
  }
  try{
    const r=await fetch(CFG.submitUrl,{method:'POST',body:fd,headers:CFG.anonKey?{Authorization:'Bearer '+CFG.anonKey,apikey:CFG.anonKey}:{}});
    const j=await r.json().catch(()=>({}));
    if(r.ok&&j.ok&&j.ref){done();return j.ref}
    errEl.textContent=t(ERR[j.error]||'Не удалось отправить заявку. Попробуйте ещё раз или напишите нам в LINE.');
  }catch(e){errEl.textContent=t('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.')}
  done();return null;
}

/* contact form */
let leadRef=null;
$('#leadForm').onsubmit=async e=>{e.preventDefault();const f=e.target;
  const fileInp=$('.file input',f);
  const err=!f.name.value.trim()||!f.contact.value.trim()?t('Укажите имя и телефон или email'):checkContact(f.contact.value)||checkFiles(fileInp)||(!$('.consent input',f).checked?t('Нужно согласие на обработку данных'):'');
  $('#cErr').textContent=err;if(err)return;
  const fd=new FormData();
  fd.append('source','contact');fd.append('name',f.name.value);fd.append('contact',f.contact.value);
  fd.append('area',f.area.value);fd.append('lang',f.lang.value);fd.append('message',f.msg.value);fd.append('website',f.website.value);
  const ref=await submitLead(fd,fileInp,$('button.btn',f),$('#cErr'));
  if(!ref)return;
  leadRef=ref;
  const ok=document.createElement('div');ok.className='ok';ok.dataset.lead='1';
  [...f.children].forEach(c=>c.style.display='none');f.appendChild(ok);renderLeadOk();
};
function renderLeadOk(){const ok=$('#leadForm .ok');if(ok)ok.innerHTML=`${okIcon}<h3>${t('Спасибо! Заявка отправлена')}</h3><div class="num">${leadRef}</div><p style="color:var(--muted)">${t('Мы свяжемся с вами в ближайшее рабочее время.')}</p>`}

/* ================= quiz in a glass modal ================= */
/* "Find my system" links open the questionnaire in an overlay instead of scrolling to #find.
   The #quiz node itself is moved into the modal (state and handlers stay intact) and put back on close. */
const qModal=$('#qModal'),qSlot=$('#qmSlot');
const qHome=document.createComment('quiz-home');quiz.parentNode.insertBefore(qHome,quiz);
let qLastFocus=null;
function openQuiz(){
  if(qModal.classList.contains('show'))return;
  qLastFocus=document.activeElement;
  document.body.classList.remove('menu-open');onScroll();
  if(modal.classList.contains('show'))closeModal();
  if(st.step>Q.length+1){st={step:0,a:{}};save()} // finished earlier → start fresh
  qSlot.appendChild(quiz);render();
  qModal.classList.add('show');document.body.style.overflow='hidden';
  requestAnimationFrame(()=>qModal.classList.add('in'));
  setTimeout(()=>$('.qm-x',qModal).focus({preventScroll:true}),50);
}
function closeQuiz(){
  if(!qModal.classList.contains('show'))return;
  qModal.classList.remove('in');
  setTimeout(()=>{qModal.classList.remove('show');qHome.parentNode.insertBefore(quiz,qHome.nextSibling);render();document.body.style.overflow='';qLastFocus&&qLastFocus.focus&&qLastFocus.focus({preventScroll:true})},350);
}
document.addEventListener('click',e=>{const a=e.target.closest('a[href="#find"]');if(!a)return;e.preventDefault();openQuiz()});
qModal.addEventListener('click',e=>{if(e.target===qModal||e.target.closest('.qm-x'))closeQuiz()});
addEventListener('keydown',e=>{if(e.key==='Escape')closeQuiz()});

/* decorative floating leaves (eco accent) */
const LEAF='<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2"><path d="M88 12C42 12 12 40 12 88c46 0 76-30 76-76z" fill="currentColor" fill-opacity=".18"/><path d="M12 88 64 36M36 64h18M50 50V34"/></svg>';
[['#about',[[88,6,90,-20],[4,62,56,30]]],['#why',[[92,70,70,15]]],['#packages',[[2,10,64,-35],[94,48,48,25]]],['#process',[[90,8,80,40]]],['#faq',[[3,70,70,-10]]],['#contact',[[92,12,90,-25]]]].forEach(([sel,list])=>{
  const sec=$(sel);if(!sec)return;
  list.forEach(([x,y,size,rot],i)=>{const l=document.createElement('span');l.className='leaf';l.setAttribute('aria-hidden','true');l.innerHTML=LEAF;
    Object.assign(l.style,{left:x+'%',top:y+'%',width:size+'px',height:size+'px',animationDelay:(-i*3)+'s'});l.style.setProperty('--rot',rot+'deg');sec.appendChild(l)});
});

/* init */
collect();
const preLang=lang;lang='ru';
applyStatic();renderGrid();updCmp();render();bindFiles(document);
if(preLang!=='ru'){lang='';setLang(preLang)}
const _set=setLang;setLang=l=>{_set(l);renderLeadOk()};
})();
