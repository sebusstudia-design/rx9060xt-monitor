'use strict';
let latest = window.MONITOR_SEED?.latest || {items:[]}, history = window.MONITOR_SEED?.history || {records:[]};
let status = window.MONITOR_SEED?.status || {ok:false};
let filter = 'all';
const $ = id => document.getElementById(id);
const fmt = n => Number(n).toLocaleString('pl-PL',{minimumFractionDigits:0,maximumFractionDigits:2});
const money = n => `${fmt(n)} zł`;
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const datePL = value => {if(!value) return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pl-PL',{timeZone:'Europe/Warsaw',day:'2-digit',month:'2-digit',year:'numeric'});};
const onlyDatePL = value => {if(!value) return '—'; const d = new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pl-PL',{timeZone:'Europe/Warsaw',day:'2-digit',month:'2-digit'});};
function budget(){const x=Number($('budget').value);return Number.isFinite(x)&&x>0?x:0;}
function savedLimit(){try{return localStorage.getItem('gpuBudget')}catch{return null}}
function saveLimit(value){try{localStorage.setItem('gpuBudget',value)}catch{}}
function buildPreviousMap(){const records=[...(history.records||[])].sort((a,b)=>a.date.localeCompare(b.date));const today=latest.updatedAt?.slice(0,10);const old=records.filter(r=>r.date<today);return old.length ? old[old.length-1].prices || {} : {};}
function changeFor(item){const previous=buildPreviousMap()[item.id];return previous>0?100*(item.price-previous)/previous:null;}
function isDrop(item){const c=changeFor(item);return c!==null&&c<=-0.01;}
function renderSummary(){
 const items=latest.items||[];const best=[...items].sort((a,b)=>a.price-b.price)[0];
 $('minPrice').textContent=best?money(best.price):'—';$('minModel').textContent=best?`${best.brand} · ${best.merchant}`:'Brak aktualnych ofert';
 $('modelCount').textContent=items.length; $('lastCheck').textContent=onlyDatePL(latest.updatedAt);$('lastCheckSub').textContent=latest.updatedAt?`Odczyt ${datePL(latest.updatedAt)}`:'Oczekiwanie na pomiar';
 const records=(history.records||[]).filter(r=>r.minPrice>0).sort((a,b)=>a.date.localeCompare(b.date));
 const today=latest.updatedAt?.slice(0,10);const base=records.filter(r=>r.date<=today).slice(-8)[0];const current=best?.price;
 if(base&&records.length>=8&&current>0){const pct=(current-base.minPrice)/base.minPrice*100;$('changeWeek').textContent=`${pct>0?'+':''}${pct.toFixed(1).replace('.',',')}%`; $('changeWeek').style.color=pct<0?'var(--lime)':pct>0?'var(--red)':'';}else{$('changeWeek').textContent='—';$('changeWeek').style.color='';}
 const checked=status.lastCheckedAt||latest.updatedAt;const isFresh=checked && (Date.now()-new Date(checked).getTime())<48*3600000;const live=$('liveBadge');
 const ok=status.ok && isFresh && latest.updatedAt;
 live.classList.toggle('warn',!ok);$('statusLabel').textContent=ok?'Odczyt aktualny':'Odczyt archiwalny / oczekuje';
 const messages=[];
 if(!status.ok && status.error) messages.push(`Ostatnie sprawdzenie nie powiodło się: ${status.error}. Pokazano ostatnie udane dane.`);
 if(!isFresh) messages.push(`Dane nie są aktualne (ostatni odczyt: ${datePL(latest.updatedAt)}). Uruchom automatyczny monitor na GitHub Pages, aby zbierać nowe ceny.`);
 $('errorBanner').style.display=messages.length?'block':'none';$('errorBanner').textContent=messages.join(' ');
}
function renderTarget(){const count=(latest.items||[]).filter(x=>x.price<=budget()).length;
 $('targetMatch').innerHTML=count?`<strong>${count} ${count===1?'oferta':count<5?'oferty':'ofert'} mieści się w limicie!</strong> Zobacz wyróżnione karty poniżej.`:`<strong>Brak ofert w Twoim limicie.</strong> Najtańsze modele pokażą się, gdy spadną poniżej ${escapeHtml(money(budget()))}.`;
}
function drawChart(){
 const all=(history.records||[]).filter(r=>Number.isFinite(r.minPrice)&&r.minPrice>0).slice(-45);
 if(!all.length){$('chartArea').innerHTML='<p class="chart-note">Brak pomiarów. Wykres pojawi się po pierwszej aktualizacji.</p>';return;}
 if(all.length===1){$('chartArea').innerHTML=`<div style="text-align:center;padding:24px 0"><strong style="font:700 32px 'Space Grotesk';color:var(--lime)">${escapeHtml(money(all[0].minPrice))}</strong><p class="chart-note">Pierwszy pomiar: ${escapeHtml(datePL(all[0].checkedAt||all[0].date+'T12:00:00+01:00'))}. Historia i wykres rozwiną się po kolejnych dniach.</p></div>`;return;}
 const values=all.map(x=>x.minPrice);const w=650,h=180,padTop=20,padBottom=25,min=Math.min(...values),max=Math.max(...values),spread=Math.max(max-min,60),lo=min-spread*.18,hi=max+spread*.2;
 const xy=values.map((v,i)=>[20+i*(w-40)/(values.length-1),padTop+(hi-v)/(hi-lo)*(h-padTop-padBottom)]);
 const p=xy.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)).join(' ');
 const area=p+` L${xy.at(-1)[0]},${h-padBottom} L${xy[0][0]},${h-padBottom} Z`;
 const grid=[.15,.5,.85].map(t=>`<line x1="10" y1="${(padTop+t*(h-padTop-padBottom)).toFixed(1)}" x2="640" y2="${(padTop+t*(h-padTop-padBottom)).toFixed(1)}" stroke="#30403a" stroke-dasharray="4 7"/>`).join('');
 const last=xy.at(-1),first=xy[0];
 $('chartArea').innerHTML=`<svg class="linechart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Najniższe ceny od ${escapeHtml(all[0].date)} do ${escapeHtml(all.at(-1).date)}"><defs><linearGradient id="fillgreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a6ee72" stop-opacity=".26"/><stop offset="100%" stop-color="#a6ee72" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#fillgreen)"/><path d="${p}" stroke="#b9f574" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${last[0]}" cy="${last[1]}" r="5" fill="#c1fa70" stroke="#16251d" stroke-width="3"/><text x="${first[0]}" y="176" fill="#91a7a0" font-size="12">${escapeHtml(all[0].date.slice(5))}</text><text x="${last[0]}" y="176" text-anchor="end" fill="#91a7a0" font-size="12">${escapeHtml(all.at(-1).date.slice(5))}</text></svg><p class="chart-note">${all.length} pomiarów · najniżej <strong style="color:var(--lime)">${money(min)}</strong> · najwyżej ${money(max)}</p>`;
}
function productCard(item){const change=changeFor(item),isBudget=item.price<=budget(),drop=isDrop(item),isDeal=isBudget||drop;
 const delta=change===null?'Brak porównania':change===0?'Bez zmian':`${change>0?'+':''}${change.toFixed(1).replace('.',',')}% vs ostatni pomiar`;
 const href=String(item.url||'');const safeURL=href.startsWith('https://tagdip.pl/p/')?href:'https://tagdip.pl/m/3/radeon-rx-9060-xt-16-gb';
 return `<article class="product ${isDeal?'deal':''}"><div class="cardtop"><span class="maker">${escapeHtml(item.brand||'GPU')}</span><span class="condition">NOWA · 16 GB</span></div><h3>${escapeHtml(item.name)}</h3><p class="store">${escapeHtml(item.merchant||'Porównaj sklepy')}</p><div class="cardfoot"><div class="numberline"><span class="price">${fmt(item.price)} <span>zł</span></span><span class="delta ${change<0?'down':change>0?'up':''}">${escapeHtml(delta)}</span></div>${isDeal?`<span class="dealmark">✦ ${isBudget?'W Twoim limicie':'Cena spadła od poprzedniego pomiaru'}</span>`:''}<a class="buy" href="${escapeHtml(safeURL)}" target="_blank" rel="noopener noreferrer" aria-label="Sprawdź ${escapeHtml(item.name)} w porównywarce">Porównaj i przejdź do sklepu <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a></div></article>`;
}
function renderCards(){const q=$('search').value.trim().toLowerCase(),sort=$('sort').value;let items=(latest.items||[]).filter(item=>`${item.name} ${item.brand} ${item.merchant}`.toLowerCase().includes(q));
 if(filter==='budget')items=items.filter(item=>item.price<=budget());if(filter==='drops')items=items.filter(isDrop);
 if(sort==='asc')items.sort((a,b)=>a.price-b.price);else if(sort==='desc')items.sort((a,b)=>b.price-a.price);else if(sort==='drop')items.sort((a,b)=>(changeFor(a)??999)-(changeFor(b)??999));else if(sort==='brand')items.sort((a,b)=>a.brand.localeCompare(b.brand,'pl'));
 $('offersCount').textContent=`(${items.length})`;$('cards').innerHTML=items.length?items.map(productCard).join(''):'<div class="empty"><strong>Brak ofert spełniających te kryteria.</strong><span>Zmień limit cenowy lub wybierz filtr „Wszystkie”.</span></div>';
}
function render(){renderSummary();renderTarget();drawChart();renderCards()}
async function loadData(){try{const stamp=Date.now();const [a,b,c]=await Promise.all([fetch(`./data/latest.json?${stamp}`,{cache:'no-store'}),fetch(`./data/history.json?${stamp}`,{cache:'no-store'}),fetch(`./data/status.json?${stamp}`,{cache:'no-store'})]);if(!a.ok||!b.ok||!c.ok)throw new Error('Błąd HTTP');const [la,hi,st]=await Promise.all([a.json(),b.json(),c.json()]);if(!Array.isArray(la.items)||!Array.isArray(hi.records))throw new Error('Niepoprawny plik');latest=la;history=hi;status=st}catch(err){if(window.MONITOR_SEED){latest=window.MONITOR_SEED.latest;history=window.MONITOR_SEED.history;status={ok:false,error:'Nie można odczytać plików danych z serwera'}};console.warn('Odczyt danych:',err)}render()}
$('budget').addEventListener('input',e=>{saveLimit(e.target.value);renderTarget();renderCards()});
$('search').addEventListener('input',renderCards);$('sort').addEventListener('change',renderCards);
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.filter;document.querySelectorAll('.tab').forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});renderCards()}));
$('refresh').addEventListener('click',loadData);
const saved=savedLimit();if(saved!==null&&Number.isFinite(Number(saved)))$('budget').value=saved;
render();loadData();
