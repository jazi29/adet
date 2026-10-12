var WD=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
var S={habits:[],sessions:[],run:null};
try{var raw=localStorage.getItem('streak2')||localStorage.getItem('streak1');if(raw)S=Object.assign(S,JSON.parse(raw))}catch(e){}
S.habits.forEach(function(h,i){if(!h.id)h.id='h'+Date.now()+i;
  if(!h.log){h.log={};(h.days||[]).forEach(function(k){h.log[k]=1});h.goal=1;h.unit='x';delete h.days}});
S.tasks=S.tasks||[];
if(S.run&&typeof S.run.h==='number')S.run=null;
function save(){try{localStorage.setItem('streak2',JSON.stringify(S))}catch(e){}}
var $=function(i){return document.getElementById(i)};
var key=function(d){return d.toLocaleDateString('sv')};
function esc(s){return s.replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fmt(ms){ms=Math.max(0,Math.ceil(ms/1000));var m=Math.floor(ms/60),s=ms%60;return (m<10?'0':'')+m+':'+(s<10?'0':'')+s}
function addD(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x}
function mondayOf(d){var x=new Date(d);x.setHours(12);return addD(x,-((x.getDay()+6)%7))}
var TODAY=key(new Date()),sel=TODAY,tab='today',dur=25,timer=null;
function hab(id){return S.habits.filter(function(h){return h.id===id})[0]}
function val(h,k){return h.log[k]||0}
function ok(h,k){return val(h,k)>=h.goal}
function nOk(k){return S.habits.filter(function(h){return ok(h,k)}).length}
function allOk(k){return S.habits.length>0&&nOk(k)===S.habits.length}
function streakOf(h){var d=new Date(),n=0;if(!ok(h,key(d)))d=addD(d,-1);while(ok(h,key(d))){n++;d=addD(d,-1)}return n}
function bestOf(h){var a=Object.keys(h.log).filter(function(k){return ok(h,k)}).sort(),b=0,c=0,p=null;
  a.forEach(function(k){var t=new Date(k+'T00:00:00');if(p&&Math.round((t-p)/864e5)===1)c++;else c=1;p=t;if(c>b)b=c});return b}
function taskRow(t){return '<div class="row"><button class="ck sq'+(t.done?' on':'')+'" data-tc="'+t.id+'" aria-label="Выполнено">'+CK+'</button><div class="m"><div class="n'+(t.done?' dn':'')+'">'+esc(t.title)+'</div></div><button class="ib" data-td="'+t.id+'" aria-label="Удалить"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div>'}
function drawTasks(){
  var a=S.tasks.filter(function(t){return !t.done}),d=S.tasks.filter(function(t){return t.done});
  var h=a.length?a.map(taskRow).join(''):'<div class="empty">Задач нет.<br>Добавь первую выше.</div>';
  if(d.length)h+='<div class="sec">Выполнено · '+d.length+'</div>'+d.map(taskRow).join('')+'<button class="btn d" data-clr="1">Очистить выполненные</button>';
  $('tlist').innerHTML=h;
}
function addTask(){var v=$('tin').value.trim();if(!v){$('tin').focus();return}S.tasks.push({id:'t'+Date.now(),title:v,done:false});$('tin').value='';save();drawTasks()}
$('tadd').onclick=addTask;$('tin').onkeydown=function(e){if(e.key==='Enter')addTask()};
$('tlist').onclick=function(e){
  var c=e.target.closest('[data-tc]');if(c){var t=S.tasks.filter(function(x){return x.id===c.dataset.tc})[0];if(t){t.done=!t.done;save();drawTasks()}return}
  var x=e.target.closest('[data-td]');if(x){S.tasks=S.tasks.filter(function(t){return t.id!==x.dataset.td});save();drawTasks();return}
  if(e.target.closest('[data-clr]')){S.tasks=S.tasks.filter(function(t){return !t.done});save();drawTasks()}};
function bump(h,k){var v=val(h,k);v=v>=h.goal?0:(h.unit==='min'?h.goal:v+1);if(v)h.log[k]=v;else delete h.log[k]}
function pl(n){var a=n%10,b=n%100;return b>10&&b<20?'дней':a===1?'день':a>1&&a<5?'дня':'дней'}
function heat(weeks,cell,attr){
  var now=new Date(),st=addD(mondayOf(now),-(weeks-1)*7),h='';
  for(var i=0;i<weeks*7;i++){var k=key(addD(st,i));
    if(k>TODAY){h+='<div class="c f"></div>';continue}
    h+='<div class="c l'+cell(k)+'"'+(attr?' data-k="'+k+'"':'')+'></div>'}
  return h}
function hmHTML(f,weeks){
  var st=addD(mondayOf(new Date()),-(weeks-1)*7),ml='',g='';
  for(var i=0;i<weeks;i++){var m0=addD(st,i*7);ml+='<span>'+(m0.getDate()<=7?m0.toLocaleDateString('ru',{month:'short'}).replace('.',''):'')+'</span>'}
  for(var j=0;j<weeks*7;j++){var k=key(addD(st,j)),fu=k>TODAY,lv=fu?0:f(k);
    g+='<div class="c'+(lv?' l'+lv:'')+(fu?' fu':'')+(k===TODAY?' t':'')+'" data-k="'+k+'"></div>'}
  return '<div class="hw"><div class="hl"><span>Пн</span><span></span><span>Ср</span><span></span><span>Пт</span><span></span><span></span></div><div class="hs"><div class="ml">'+ml+'</div><div class="hm2">'+g+'</div></div></div><div class="cap"></div>'}
function mountHM(el,f,txt){
  function draw(){var sc=el.querySelector('.hs'),p=sc?sc.scrollLeft:0;el.innerHTML=hmHTML(f,53);sc=el.querySelector('.hs');sc.scrollLeft=draw.done?p:0;if(draw.done===undefined)draw.end()}
  draw.end=function(){var sc=el.querySelector('.hs');if(sc&&sc.clientWidth){sc.scrollLeft=1e5;draw.done=true}};
  el.onclick=function(e){var k=e.target.dataset.k;if(!k||k>TODAY)return;el.querySelector('.cap').textContent=new Date(k+'T12:00:00').toLocaleDateString('ru',{weekday:'long',day:'numeric',month:'long'})+' — '+txt(k)};
  draw();return draw}
var CK='<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>';
var TI='<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2.5h6"/></svg>';

/* TODAY */
function drawToday(){
  var m=mondayOf(new Date(sel+'T12:00:00')),w='';
  for(var i=0;i<7;i++){var d=addD(m,i),k=key(d),fu=k>TODAY;
    w+='<button class="day'+(k===sel?' on':'')+(fu?' fu':'')+'" data-d="'+k+'"'+(fu?' disabled':'')+'>'+WD[i]+'<b class="'+(allOk(k)?'full':'')+'">'+d.getDate()+'</b></button>'}
  $('week').innerHTML=w;
  var sd=new Date(sel+'T12:00:00');
  $('ttl').textContent=sel===TODAY?'Сегодня':sd.toLocaleDateString('ru',{day:'numeric',month:'long'});
  $('dt').textContent=sel===TODAY?sd.toLocaleDateString('ru',{weekday:'long',day:'numeric',month:'long'}):sd.toLocaleDateString('ru',{weekday:'long'});
  var h='';if(!S.habits.length)h='<div class="empty">Пока пусто.<br>Нажми + и добавь первую привычку.</div>';
  S.habits.forEach(function(x){var v=val(x,sel),st=streakOf(x),s;
    s=x.unit==='min'?v+' / '+x.goal+' мин':x.goal>1?v+' / '+x.goal:'';
    if(st)s+=(s?' · ':'')+st+' '+pl(st)+' подряд';
    h+='<div class="row" data-o="'+x.id+'"><div class="m"><div class="n">'+esc(x.name)+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>'
      +(x.unit==='min'?'<button class="ib" data-f="'+x.id+'" aria-label="Фокус">'+TI+'</button>':'')
      +'<button class="ck'+(ok(x,sel)?' on':v?' part':'')+'" data-c="'+x.id+'"'+(sel===TODAY?'':' disabled')+' aria-label="Отметить">'+CK+'</button></div>'});
  $('list').innerHTML=h;
}
$('week').onclick=function(e){var b=e.target.closest('[data-d]');if(b){sel=b.dataset.d;drawToday()}};
$('list').onclick=function(e){
  var c=e.target.closest('[data-c]');if(c){if(sel!==TODAY)return;bump(hab(c.dataset.c),sel);save();refresh();return}
  var f=e.target.closest('[data-f]');if(f){openFocus(f.dataset.f);return}
  var o=e.target.closest('[data-o]');if(o)detail(o.dataset.o)};

/* SHEETS */
function sheet(html){closeSheet();var o=document.createElement('div');o.className='ov';o.id='ov';o.innerHTML='<div class="sheet">'+html+'</div>';
  o.onclick=function(e){if(e.target===o)closeSheet()};document.body.appendChild(o)}
function closeSheet(){var o=$('ov');if(o)o.remove()}
function addSheet(){
  var timed=false;
  sheet('<h3>Новая привычка</h3><input id="nin" placeholder="Название" maxlength="30"><div class="sw"><span>Цель в минутах</span><button class="tg" id="tg" aria-label="Переключить"></button></div><input id="ng" type="number" min="1" value="1" inputmode="numeric" class="hide" placeholder="Минут в день"><button class="btn" id="nsave">Добавить</button>');
  $('tg').onclick=function(){timed=!timed;this.classList.toggle('on',timed);$('ng').classList.toggle('hide',!timed);if(timed)$('ng').value=15};
  $('nsave').onclick=function(){var v=$('nin').value.trim();if(!v){$('nin').focus();return}
    S.habits.push({id:'h'+Date.now(),name:v,unit:timed?'min':'x',goal:timed?Math.max(1,parseInt($('ng').value)||15):1,log:{}});save();closeSheet();refresh()};
}
$('add').onclick=addSheet;
function detail(id){
  var x=hab(id);if(!x)return;var n30=0;
  for(var i=0;i<30;i++)if(ok(x,key(addD(new Date(),-i))))n30++;
  sheet('<h3>'+esc(x.name)+'</h3><div class="st3"><div><b>'+streakOf(x)+'</b><span>серия</span></div><div><b>'+bestOf(x)+'</b><span>лучшая</span></div><div><b>'+Math.round(n30/30*100)+'%</b><span>за 30 дней</span></div></div>'
   +'<div id="dcal"></div><p class="note">Календарь заполняется сам по твоим отметкам и фокус-сессиям.</p>'
   +(x.unit==='min'?'<button class="btn" id="dfocus">Запустить фокус</button>':'')+'<button class="btn d" id="ddel">Удалить привычку</button>');
  mountHM($('dcal'),function(k){return ok(x,k)?4:val(x,k)?2:0},function(k){return val(x,k)+' / '+x.goal+(x.unit==='min'?' мин':'')});
  if($('dfocus'))$('dfocus').onclick=function(){closeSheet();openFocus(id)};
  var armed=false,dd=$('ddel');
  dd.onclick=function(){
    if(!armed){armed=true;dd.textContent='Нажми ещё раз — удалить вместе с историей';setTimeout(function(){armed=false;dd.textContent='Удалить привычку'},4000);return}
    S.habits=S.habits.filter(function(h){return h.id!==id});S.sessions=S.sessions.filter(function(t){return t.h!==id});
    if(S.run&&S.run.h===id)S.run.h=null;
    save();closeSheet();refresh()};
}

/* STATS */
function drawStats(){
  var done=0,n=S.habits.length,tot=n*30;
  for(var i=0;i<30;i++)done+=nOk(key(addD(new Date(),-i)));
  var p=tot?Math.round(done/tot*100):0;
  $('bp').innerHTML=p+'<small>%</small>';
  $('bl').textContent=n?done+' из '+tot+' отметок выполнено':'Добавь привычки, чтобы увидеть итоги';
  drawAllCal();
  var h='';S.habits.forEach(function(x){var c=0;for(var i=0;i<30;i++)if(ok(x,key(addD(new Date(),-i))))c++;var q=Math.round(c/30*100);
    h+='<div class="pr"><div><span>'+esc(x.name)+'</span><span>'+q+'%</span></div><div class="bar"><u style="width:'+q+'%"></u></div></div>'});
  $('rates').innerHTML=h;
  $('k1').textContent=S.sessions.reduce(function(a,s){return a+s.m},0);
  $('k2').textContent=S.sessions.length;
  $('k3').textContent=S.sessions.reduce(function(a,s){return s.d===TODAY?a+s.m:a},0);
}

/* FOCUS */
function drawChips(){$('chips').innerHTML=[15,25,45,60].map(function(m){return '<button class="chip'+(m===dur?' on':'')+'" data-m="'+m+'">'+m+'</button>'}).join('')}
$('chips').onclick=function(e){var m=e.target.dataset.m;if(m&&!S.run){dur=+m;drawChips();$('ft').textContent=fmt(dur*60000)}};
function drawSel(){var v=$('hsel').value,h='<option value="">Без привычки</option>';S.habits.forEach(function(x){h+='<option value="'+x.id+'">'+esc(x.name)+'</option>'});$('hsel').innerHTML=h;$('hsel').value=v}
function openFocus(id){
  drawSel();if(id)$('hsel').value=id;
  var x=id&&hab(id);if(x&&x.unit==='min'&&!S.run){dur=[15,25,45,60].indexOf(x.goal)>=0?x.goal:dur;drawChips()}
  $('fs').classList.remove('hide');drawFocus();tick();
}
$('tm').onclick=function(){openFocus()};
$('fx').onclick=function(){$('fs').classList.add('hide');tick()};
function drawFocus(){
  var r=!!S.run;$('chips').classList.toggle('hide',r);$('hsel').classList.toggle('hide',r);
  $('go').textContent=r?'Остановить':'Начать';$('go').className='btn'+(r?' stop':'');
  if(!r){$('fu').style.width='0';if(!$('fl').dataset.k){$('ft').textContent=fmt(dur*60000);$('fl').textContent=''}}
}
function tick(){
  var r=S.run,b=$('run');
  if(!r){b.classList.add('hide');return}
  var left=r.end-Date.now();if(left<=0){finish(true);return}
  var x=r.h&&hab(r.h),name=x?x.name:'Фокус';
  $('ft').textContent=fmt(left);$('fu').style.width=(100*(1-left/(r.mins*60000)))+'%';$('fl').textContent=name;$('fl').dataset.k=1;
  b.textContent='Фокус '+fmt(left)+' · '+name;b.classList.toggle('hide',tab!=='today'||!$('fs').classList.contains('hide'));
}
function start(){$('fl').dataset.k='';S.run={mins:dur,end:Date.now()+dur*60000,h:$('hsel').value||null};save();drawFocus();tick();clearInterval(timer);timer=setInterval(tick,1000)}
function finish(done){
  clearInterval(timer);var r=S.run;if(!r)return;S.run=null;$('run').classList.add('hide');
  if(done){S.sessions.push({d:TODAY,m:r.mins,h:r.h});var x=r.h&&hab(r.h);if(x)x.log[TODAY]=val(x,TODAY)+(x.unit==='min'?r.mins:1);try{navigator.vibrate&&navigator.vibrate(200)}catch(e){}}
  save();$('fl').dataset.k='';drawFocus();refresh();
  if(done){$('fu').style.width='100%';$('ft').textContent='00:00';$('fl').textContent='Готово: +'+r.mins+' мин';$('fl').dataset.k=1}
}
$('go').onclick=function(){S.run?finish(false):start()};
$('run').onclick=function(){openFocus()};
document.addEventListener('visibilitychange',function(){if(document.hidden)return;
  var nt=key(new Date());if(nt!==TODAY){if(sel===TODAY)sel=nt;TODAY=nt;refresh()}tick()});

/* NAV */
function show(t){tab=t;['today','tasks','stats'].forEach(function(k){$('s-'+k).classList.toggle('hide',k!==t)});
  [].forEach.call($('nav').children,function(b){b.classList.toggle('on',b.dataset.t===t)});tick();refresh();if(t==='stats'&&!drawAllCal.done)drawAllCal.end()}
$('nav').onclick=function(e){var b=e.target.closest('[data-t]');if(b)show(b.dataset.t)};
function refresh(){drawToday();drawTasks();drawStats()}

var drawAllCal=mountHM($('allcal'),function(k){var n=S.habits.length,c=nOk(k),f=n?c/n:0;return f===0?0:f<.5?1:f<.75?2:f<1?3:4},function(k){return nOk(k)+' из '+S.habits.length});
if(S.run){if(Date.now()>=S.run.end)finish(true);else timer=setInterval(tick,1000)}
drawChips();drawSel();refresh();tick();

/* offline + install support (works on https) */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
}
