var WD=['Mo','Tu','We','Th','Fr','Sa','Su'];
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
var popId=null,newTaskId=null,rv='o',ro=0,actSel='all';
function buzz(){try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}}
function runAnim(el){if(!el)return;el.classList.remove('anim');void el.offsetWidth;el.classList.add('anim');setTimeout(function(){el.classList.remove('anim')},800)}
function countUp(){var el=$('bp'),to=+el.dataset.v||0,t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/700),e=1-Math.pow(1-k,3);el.innerHTML=Math.round(to*e)+'<small>%</small>';if(k<1)requestAnimationFrame(f)})(t0)}
function hab(id){return S.habits.filter(function(h){return h.id===id})[0]}
function val(h,k){return h.log[k]||0}
function ok(h,k){return val(h,k)>=h.goal}
function wi(k){return (new Date(k+'T12:00:00').getDay()+6)%7}
function sched(h,k){var d=h.dow;if(!d||!d.length||d.length>=7)return true;return d.indexOf(wi(k))>=0||ok(h,k)}
function sch(k){return S.habits.filter(function(h){return sched(h,k)})}
function nOk(k){return sch(k).filter(function(h){return ok(h,k)}).length}
function allOk(k){var s=sch(k);return s.length>0&&s.every(function(h){return ok(h,k)})}
function schedLabel(h){var d=h.dow;if(!d||!d.length||d.length>=7)return '';var s=d.slice().sort();
  if(s.join()==='0,1,2,3,4')return 'Weekdays';if(s.join()==='5,6')return 'Weekends';return s.map(function(i){return WD[i]}).join(' ')}
function dowHTML(arr){return '<div class="lb2">Repeat on</div><div class="dow" id="dow">'+WD.map(function(w,i){return '<button data-i="'+i+'"'+(arr.indexOf(i)>=0?' class="on"':'')+'>'+w+'</button>'}).join('')+'</div>'}
function toggleDow(arr,i){var j=arr.indexOf(i);if(j>=0){if(arr.length===1)return false;arr.splice(j,1)}else arr.push(i);arr.sort();return true}
function streakOf(h){var d=new Date(),n=0,t=key(d);if(sched(h,t)&&!ok(h,t))d=addD(d,-1);
  for(var g=0;g<800;g++){var k=key(d);if(ok(h,k))n++;else if(sched(h,k))break;d=addD(d,-1)}return n}
function bestOf(h){var ks=Object.keys(h.log).filter(function(k){return ok(h,k)}).sort();if(!ks.length)return 0;var d=new Date(ks[0]+'T12:00:00'),b=0,c=0;
  for(var g=0;g<2000;g++){var k=key(d);if(k>TODAY)break;if(ok(h,k)){c++;if(c>b)b=c}else if(sched(h,k))c=0;d=addD(d,1)}return b}
var UP='<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',DN='<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
function taskRow(t,i,arr){var mv='';
  if(!t.done&&arr&&arr.length>1)mv='<div class="mv"><button data-mu="'+t.id+'" aria-label="Move up"'+(i===0?' disabled':'')+'>'+UP+'</button><button data-md="'+t.id+'" aria-label="Move down"'+(i===arr.length-1?' disabled':'')+'>'+DN+'</button></div>';
  return '<div class="row'+(newTaskId===t.id?' new':'')+'"><button class="ck sq'+(t.done?' on':'')+(popId===t.id&&t.done?' pop':'')+'" data-tc="'+t.id+'" aria-label="Mark done">'+CK+'</button><div class="m"><div class="n'+(t.done?' dn':'')+'">'+esc(t.title)+'</div></div>'+mv+'<button class="ib" data-td="'+t.id+'" aria-label="Delete"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div>'}
function drawTasks(){
  var a=S.tasks.filter(function(t){return !t.done}),d=S.tasks.filter(function(t){return t.done});
  var h=a.length?a.map(taskRow).join(''):'<div class="empty">No tasks.<br>Add your first one above.</div>';
  if(d.length)h+='<div class="sec">Done · '+d.length+'</div>'+d.map(taskRow).join('')+'<button class="btn d" data-clr="1">Clear completed</button>';
  $('tlist').innerHTML=h;
}
function addTask(){var v=$('tin').value.trim();if(!v){$('tin').focus();return}var nid='t'+Date.now();S.tasks.push({id:nid,title:v,done:false});newTaskId=nid;$('tin').value='';save();drawTasks();newTaskId=null}
function moveTask(id,dir){
  var idx=[],p=-1;S.tasks.forEach(function(t,i){if(!t.done)idx.push(i)});
  idx.forEach(function(i,n){if(S.tasks[i].id===id)p=n});
  var q=p+dir;if(p<0||q<0||q>=idx.length)return;
  var a=idx[p],b=idx[q],t=S.tasks[a];S.tasks[a]=S.tasks[b];S.tasks[b]=t;
  buzz();newTaskId=id;save();drawTasks();newTaskId=null}
$('tadd').onclick=addTask;$('tin').onkeydown=function(e){if(e.key==='Enter')addTask()};
$('tlist').onclick=function(e){
  var mu=e.target.closest('[data-mu]');if(mu){if(!mu.disabled)moveTask(mu.dataset.mu,-1);return}
  var md=e.target.closest('[data-md]');if(md){if(!md.disabled)moveTask(md.dataset.md,1);return}
  var c=e.target.closest('[data-tc]');if(c){var t=S.tasks.filter(function(x){return x.id===c.dataset.tc})[0];if(t){t.done=!t.done;if(t.done){popId=t.id;buzz()}save();drawTasks();popId=null}return}
  var x=e.target.closest('[data-td]');if(x){var row=x.closest('.row'),id=x.dataset.td;row.classList.add('gone');setTimeout(function(){S.tasks=S.tasks.filter(function(t){return t.id!==id});save();drawTasks()},200);return}
  if(e.target.closest('[data-clr]')){S.tasks=S.tasks.filter(function(t){return !t.done});save();drawTasks()}};
function bump(h,k){var v=val(h,k);v=v>=h.goal?0:(h.unit==='min'?h.goal:v+1);if(v)h.log[k]=v;else delete h.log[k]}
function pl(n){return n===1?'day':'days'}
function heat(weeks,cell,attr){
  var now=new Date(),st=addD(mondayOf(now),-(weeks-1)*7),h='';
  for(var i=0;i<weeks*7;i++){var k=key(addD(st,i));
    if(k>TODAY){h+='<div class="c f"></div>';continue}
    h+='<div class="c l'+cell(k)+'"'+(attr?' data-k="'+k+'"':'')+'></div>'}
  return h}
function hmHTML(f,weeks){
  var st=addD(mondayOf(new Date()),-(weeks-1)*7),ml='',g='';
  for(var i=0;i<weeks;i++){var m0=addD(st,i*7);ml+='<span>'+(m0.getDate()<=7?m0.toLocaleDateString('en-US',{month:'short'}).replace('.',''):'')+'</span>'}
  for(var j=0;j<weeks*7;j++){var k=key(addD(st,j)),fu=k>TODAY,lv=fu?0:f(k);
    g+='<div class="c'+(lv?' l'+lv:'')+(fu?' fu':'')+(k===TODAY?' t':'')+'" data-k="'+k+'" style="animation-delay:'+Math.min(Math.floor(j/7)*14,260)+'ms"></div>'}
  return '<div class="hw"><div class="hl"><span>Mo</span><span></span><span>We</span><span></span><span>Fr</span><span></span><span></span></div><div class="hs"><div class="ml">'+ml+'</div><div class="hm2">'+g+'</div></div></div><div class="cap"></div>'}
function mountHM(el,f,txt){
  function draw(){el.innerHTML=hmHTML(f,17)}
  draw.end=function(){draw.done=true};
  el.onclick=function(e){var k=e.target.dataset.k;if(!k||k>TODAY)return;el.querySelector('.cap').textContent=new Date(k+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long'})+' — '+txt(k)};
  draw();return draw}
$('rates').onclick=function(e){var r=e.target.closest('[data-h]');if(!r)return;var id=r.dataset.h;actSel=actSel===id?'all':id;drawStats();
  if(actSel!=='all')$('acth').parentNode.scrollIntoView({behavior:'smooth',block:'start'})};
$('actall').onclick=function(){actSel='all';drawStats()};
var CK='<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>';
var TI='<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2.5h6"/></svg>';

/* TODAY */
function drawToday(){
  var m=mondayOf(new Date(sel+'T12:00:00')),w='';
  for(var i=0;i<7;i++){var d=addD(m,i),k=key(d),fu=k>TODAY;
    w+='<button class="day'+(k===sel?' on':'')+(k===TODAY?' t':'')+(fu?' fu':'')+'" data-d="'+k+'"'+(fu?' disabled':'')+'>'+WD[i]+'<b class="'+(allOk(k)?'full':'')+'">'+d.getDate()+'</b></button>'}
  $('week').innerHTML=w;
  var sd=new Date(sel+'T12:00:00');
  $('ttl').textContent=sel===TODAY?'Today':sd.toLocaleDateString('en-US',{day:'numeric',month:'long'});
  $('dt').textContent=sel===TODAY?sd.toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long'}):sd.toLocaleDateString('en-US',{weekday:'long'});
  var h='',vis=S.habits.filter(function(x){return sched(x,sel)});
  if(!S.habits.length)h='<div class="empty">No habits yet<br><button class="btn" data-add="1">Add your first habit</button></div>';
  else if(!vis.length)h='<div class="empty">No habits planned for this day</div>';
  vis.forEach(function(x){var v=val(x,sel),st=streakOf(x),s;
    s=x.unit==='min'?v+' / '+x.goal+' min':x.goal>1?v+' / '+x.goal:'';
    if(st)s+=(s?' · ':'')+st+' '+pl(st)+' in a row';var sl=schedLabel(x);if(sl)s+=(s?' · ':'')+sl;
    h+='<div class="row" data-o="'+x.id+'"><div class="m"><div class="n">'+esc(x.name)+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>'
      +(x.unit==='min'?'<button class="ib" data-f="'+x.id+'" aria-label="Focus">'+TI+'</button>':'')
      +'<button class="ck'+(ok(x,sel)?' on':v?' part':'')+(popId===x.id&&ok(x,sel)?' pop':'')+'" data-c="'+x.id+'"'+(sel===TODAY?'':' disabled')+' aria-label="Check in">'+CK+'</button></div>'});
  if(S.habits.length)h+='<button class="addrow" data-add="1">+ New habit</button>';
  var dn=vis.filter(function(x){return ok(x,sel)}).length,tt=vis.length,sm=$('sum');
  sm.classList.toggle('hide',!tt);
  if(tt)sm.innerHTML='<div class="sl"><b>'+dn+'<small>/'+tt+'</small></b><span>'+(dn===tt?'All done. Great work!':dn?'Keep going':'Time to start')+'</span></div><div class="pbar"><u style="width:'+Math.round(dn/tt*100)+'%"></u></div>';
  $('list').innerHTML=h;
}
$('week').onclick=function(e){var b=e.target.closest('[data-d]');if(b){sel=b.dataset.d;drawToday()}};
$('list').onclick=function(e){
  if(e.target.closest('[data-add]')){addSheet();return}
  var c=e.target.closest('[data-c]');if(c){if(sel!==TODAY)return;var hx=hab(c.dataset.c);bump(hx,sel);if(ok(hx,sel)){popId=hx.id;buzz()}save();refresh();popId=null;return}
  var f=e.target.closest('[data-f]');if(f){openFocus(f.dataset.f);return}
  var o=e.target.closest('[data-o]');if(o)detail(o.dataset.o)};

/* SHEETS */
function sheet(html){var old=$('ov');if(old)old.remove();var o=document.createElement('div');o.className='ov';o.id='ov';o.innerHTML='<div class="sheet">'+html+'</div>';
  o.onclick=function(e){if(e.target===o)closeSheet()};document.body.appendChild(o)}
function closeSheet(){var o=$('ov');if(!o)return;o.id='';o.classList.add('out');setTimeout(function(){o.remove()},240)}
function addSheet(){
  var timed=false,dsel=[0,1,2,3,4,5,6];
  sheet('<h3>New habit</h3><input id="nin" placeholder="Name" maxlength="30"><div class="sw"><span>Goal in minutes</span><button class="tg" id="tg" aria-label="Toggle"></button></div><input id="ng" type="number" min="1" value="1" inputmode="numeric" class="hide" placeholder="Minutes per day">'+dowHTML(dsel)+'<button class="btn" id="nsave">Add</button>');
  $('tg').onclick=function(){timed=!timed;this.classList.toggle('on',timed);$('ng').classList.toggle('hide',!timed);if(timed)$('ng').value=15};
  $('dow').onclick=function(e){var bt=e.target.closest('[data-i]');if(!bt)return;if(toggleDow(dsel,+bt.dataset.i))bt.classList.toggle('on');else toast('Keep at least one day')};
  $('nsave').onclick=function(){var v=$('nin').value.trim();if(!v){$('nin').focus();return}
    var hb={id:'h'+Date.now(),name:v,unit:timed?'min':'x',goal:timed?Math.max(1,parseInt($('ng').value)||15):1,log:{}};
    if(dsel.length<7)hb.dow=dsel.slice();S.habits.push(hb);save();closeSheet();refresh()};
}
$('add').onclick=addSheet;
function detail(id){
  var x=hab(id);if(!x)return;var n30=0,d30=0;
  for(var i=0;i<30;i++){var kk=key(addD(new Date(),-i));if(sched(x,kk)){d30++;if(ok(x,kk))n30++}}
  sheet('<h3>'+esc(x.name)+'</h3><div class="st3"><div><b>'+streakOf(x)+'</b><span>streak</span></div><div><b>'+bestOf(x)+'</b><span>best</span></div><div><b>'+Math.round((d30?n30/d30:0)*100)+'%</b><span>last 30 days</span></div></div>'
   +dowHTML(x.dow&&x.dow.length&&x.dow.length<7?x.dow:[0,1,2,3,4,5,6])+'<button class="btn o" id="dcalbtn">View report in Stats</button>'
   +(x.unit==='min'?'<button class="btn" id="dfocus">Start focus</button>':'')+'<button class="btn d" id="ddel">Delete habit</button>');
  $('dcalbtn').onclick=function(){actSel=id;closeSheet();$('seg2').querySelector('[data-v="o"]').click();show('stats')};
  $('dow').onclick=function(e){var bt=e.target.closest('[data-i]');if(!bt)return;var a=(x.dow&&x.dow.length&&x.dow.length<7)?x.dow.slice():[0,1,2,3,4,5,6];
    if(!toggleDow(a,+bt.dataset.i)){toast('Keep at least one day');return}
    if(a.length===7)delete x.dow;else x.dow=a;bt.classList.toggle('on');save();refresh()};
  if($('dfocus'))$('dfocus').onclick=function(){closeSheet();openFocus(id)};
  var armed=false,dd=$('ddel');
  dd.onclick=function(){
    if(!armed){armed=true;dd.textContent='Tap again to delete with history';setTimeout(function(){armed=false;dd.textContent='Delete habit'},4000);return}
    S.habits=S.habits.filter(function(h){return h.id!==id});S.sessions=S.sessions.filter(function(t){return t.h!==id});
    if(S.run&&S.run.h===id)S.run.h=null;
    save();closeSheet();refresh()};
}

/* STATS */
function drawStats(){
  var done=0,tot=0,n=S.habits.length;
  for(var i=0;i<30;i++){var kk=key(addD(new Date(),-i));done+=nOk(kk);tot+=sch(kk).length}
  var p=tot?Math.round(done/tot*100):0;
  $('bp').dataset.v=p;$('bp').innerHTML=p+'<small>%</small>';
  $('bl').textContent=n?done+' of '+tot+' check-ins done':'Add habits to see your stats';
  var h='';S.habits.forEach(function(x){var c=0,dn=0;for(var i=0;i<30;i++){var k=key(addD(new Date(),-i));if(sched(x,k)){dn++;if(ok(x,k))c++}}var q=dn?Math.round(c/dn*100):0;
    h+='<div class="pr'+(actSel===x.id?' sel':'')+'" data-h="'+x.id+'"><div><span>'+esc(x.name)+'</span><span>'+q+'%</span></div><div class="bar"><u style="width:'+q+'%"></u></div></div>'});
  $('rates').innerHTML=h;
  var ah=actSel==='all'?null:hab(actSel);if(!ah)actSel='all';
  $('acth').textContent=ah?'Activity · '+ah.name:'Activity';$('actall').classList.toggle('hide',!ah);$('actst').classList.toggle('hide',!ah);
  if(ah){var c30=0,d30=0;for(var j=0;j<30;j++){var k2=key(addD(new Date(),-j));if(sched(ah,k2)){d30++;if(ok(ah,k2))c30++}}
    var fmn=S.sessions.reduce(function(a,s){return s.h===ah.id?a+s.m:a},0);
    $('actst').innerHTML='<div><b>'+streakOf(ah)+'</b><span>streak</span></div><div><b>'+bestOf(ah)+'</b><span>best</span></div><div><b>'+(d30?Math.round(c30/d30*100):0)+'%</b><span>30 days</span></div><div><b>'+fmn+'</b><span>focus min</span></div>'}
  drawAllCal();
  $('k1').textContent=S.sessions.reduce(function(a,s){return a+s.m},0);
  $('k2').textContent=S.sessions.length;
  $('k3').textContent=S.sessions.reduce(function(a,s){return s.d===TODAY?a+s.m:a},0);
}

/* FOCUS */
function drawChips(){$('chips').innerHTML=[15,25,45,60].map(function(m){return '<button class="chip'+(m===dur?' on':'')+'" data-m="'+m+'">'+m+'<small>min</small></button>'}).join('')}
$('chips').onclick=function(e){var bt=e.target.closest('[data-m]'),m=bt&&bt.dataset.m;if(m&&!S.run){dur=+m;drawChips();$('fl').dataset.k='';drawFocus()}};
function drawSel(){var v=$('hsel').value,h='<option value="">No habit</option>';S.habits.forEach(function(x){h+='<option value="'+x.id+'">'+esc(x.name)+'</option>'});$('hsel').innerHTML=h;$('hsel').value=v}
function openFocus(id){
  drawSel();if(id)$('hsel').value=id;
  var x=id&&hab(id);if(x&&x.unit==='min'&&!S.run){dur=[15,25,45,60].indexOf(x.goal)>=0?x.goal:dur;drawChips()}
  $('fs').classList.remove('hide');drawFocus();tick();
}
$('tm').onclick=function(){openFocus()};
$('fx').onclick=function(){$('fs').classList.add('hide');tick()};
var CIR=728.85,PL='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/></svg>',SQ='<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none"/></svg>';
function setRing(p,instant){var d=$('dial');if(instant)d.classList.add('nt');
  $('arc').style.strokeDashoffset=CIR*(1-p);$('knob').style.transform='rotate('+(p*360)+'deg)';
  if(instant){void d.offsetWidth;d.classList.remove('nt')}}
function drawFocus(){
  var r=!!S.run;$('chips').classList.toggle('hide',r);$('hsel').classList.toggle('hide',r);$('fs').classList.toggle('going',r);
  $('go').innerHTML=r?SQ+'Stop':PL+'Start';$('go').className='btn'+(r?' stop':'');
  if(!r&&!$('fl').dataset.k){$('dial').classList.remove('done');setRing(0,true);$('ft').textContent=fmt(dur*60000);$('fl').textContent='Ready'}
}
function tick(){
  var r=S.run,b=$('run');
  if(!r){b.classList.add('hide');return}
  var left=r.end-Date.now();if(left<=0){finish(true);return}
  var x=r.h&&hab(r.h),name=x?x.name:'Focus';
  $('ft').textContent=fmt(left);setRing(1-left/(r.mins*60000));$('fl').textContent=name;$('fl').dataset.k=1;
  b.textContent='Focus '+fmt(left)+' · '+name;b.classList.toggle('hide',tab!=='today'||!$('fs').classList.contains('hide'));
}
function start(){$('fl').dataset.k='';S.run={mins:dur,end:Date.now()+dur*60000,h:$('hsel').value||null};save();drawFocus();tick();clearInterval(timer);timer=setInterval(tick,1000)}
function finish(done){
  clearInterval(timer);var r=S.run;if(!r)return;S.run=null;$('run').classList.add('hide');
  if(done){S.sessions.push({d:TODAY,m:r.mins,h:r.h});var x=r.h&&hab(r.h);if(x)x.log[TODAY]=val(x,TODAY)+(x.unit==='min'?r.mins:1);try{navigator.vibrate&&navigator.vibrate(200)}catch(e){}}
  save();$('fl').dataset.k='';drawFocus();refresh();
  if(done){setRing(1);$('dial').classList.add('done');$('ft').textContent='00:00';$('fl').textContent='Done: +'+r.mins+' min';$('fl').dataset.k=1}
}
$('go').onclick=function(){S.run?finish(false):start()};
$('run').onclick=function(){openFocus()};
document.addEventListener('visibilitychange',function(){if(document.hidden)return;
  var nt=key(new Date());if(nt!==TODAY){if(sel===TODAY)sel=nt;TODAY=nt;refresh()}tick()});

/* NAV */
function show(t){var prev=tab;tab=t;window.scrollTo(0,0);['today','tasks','stats'].forEach(function(k){$('s-'+k).classList.toggle('hide',k!==t)});
  [].forEach.call($('nav').children,function(b){b.classList.toggle('on',b.dataset.t===t)});tick();refresh();if(t==='stats'&&!drawAllCal.done)drawAllCal.end();runAnim({today:$('list'),tasks:$('tlist'),stats:$('rates')}[t]);if(t==='stats')countUp();slideIn(prev,t)}
function slideIn(a,b){if(a===b)return;var o=['today','tasks','stats'],c=o.indexOf(b)>o.indexOf(a)?'sl-r':'sl-l',s=$('s-'+b);s.classList.remove('sl-r','sl-l');void s.offsetWidth;s.classList.add(c);setTimeout(function(){s.classList.remove(c)},380)}
$('nav').onclick=function(e){var b=e.target.closest('[data-t]');if(b)show(b.dataset.t)};
function refresh(){drawToday();drawTasks();drawStats();if(rv!=='o')drawReport()}

var drawAllCal=mountHM($('allcal'),function(k){var h=actSel==='all'?null:hab(actSel);
  if(h)return !sched(h,k)?0:ok(h,k)?4:val(h,k)?2:0;
  var n=sch(k).length,c=nOk(k),f=n?c/n:0;return f===0?0:f<.5?1:f<.75?2:f<1?3:4},
  function(k){var h=actSel==='all'?null:hab(actSel);if(h)return val(h,k)+' / '+h.goal+(h.unit==='min'?' min':'');return nOk(k)+' of '+sch(k).length+' habits'});
if(S.run){if(Date.now()>=S.run.end)finish(true);else timer=setInterval(tick,1000)}
drawChips();drawSel();refresh();tick();runAnim($('list'));


/* ---------- reports: week / month / year ---------- */
function period(){
  var now=new Date(),keys=[],groups=[],gl=[],label;
  if(rv==='w'){var m=addD(mondayOf(now),ro*7);
    for(var i=0;i<7;i++){var k=key(addD(m,i));keys.push(k);groups.push([k]);gl.push(WD[i])}
    label=addD(m,0).toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+addD(m,6).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
  else if(rv==='m'){var f=new Date(now.getFullYear(),now.getMonth()+ro,1,12),n=new Date(f.getFullYear(),f.getMonth()+1,0).getDate();
    for(var j=1;j<=n;j++){var kk=key(new Date(f.getFullYear(),f.getMonth(),j,12));keys.push(kk);groups.push([kk]);gl.push(j===1||j%5===0?String(j):'')}
    label=f.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
  else{var y=now.getFullYear()+ro,MN=['J','F','M','A','M','J','J','A','S','O','N','D'];
    for(var a=0;a<12;a++){var dn=new Date(y,a+1,0).getDate(),g=[];for(var b=1;b<=dn;b++){var k3=key(new Date(y,a,b,12));g.push(k3);keys.push(k3)}groups.push(g);gl.push(MN[a])}
    label=String(y)}
  return {keys:keys,groups:groups,gl:gl,label:label}}
function pastOf(ks){return ks.filter(function(k){return k<=TODAY})}
function drawReport(){
  var P=period(),hs=S.habits,n=hs.length,past=pastOf(P.keys),
    done=past.reduce(function(a,k){return a+nOk(k)},0),poss=past.reduce(function(a,k){return a+sch(k).length},0),pct=poss?Math.round(done/poss*100):0,
    perfect=past.filter(allOk).length,set={},
    best=hs.reduce(function(a,h){var c=0,b=0;P.keys.forEach(function(k){if(k<=TODAY&&ok(h,k)){c++;if(c>b)b=c}else if(k<=TODAY&&sched(h,k))c=0});return Math.max(a,b)},0);
  P.keys.forEach(function(k){set[k]=1});
  var fm=S.sessions.reduce(function(a,s){return set[s.d]?a+s.m:a},0);
  var h='<div class="rng"><button id="rpv" aria-label="Previous">‹</button><span>'+P.label+'</span><button id="rnx" aria-label="Next"'+(ro>=0?' disabled':'')+'>›</button></div>';
  h+='<div class="card2"><div class="big sm">'+pct+'<small>%</small></div><p class="lead" style="margin-bottom:16px">'+(n?done+' of '+poss+' check-ins':'Add habits to see reports')+'</p><div class="bars'+(rv==='m'?' m':'')+'">'
   +P.groups.map(function(g,i){var ks=pastOf(g),d=ks.reduce(function(a,k){return a+nOk(k)},0),den=ks.reduce(function(a,k){return a+sch(k).length},0),p=den?Math.round(d/den*100):0;
     return '<div class="bc"><div class="bw"><u class="'+(den?'':'f')+'" style="height:'+(den?Math.max(p,3):3)+'%"></u></div><span>'+P.gl[i]+'</span></div>'}).join('')+'</div></div>';
  h+='<div class="st3"><div><b>'+perfect+'</b><span>perfect days</span></div><div><b>'+best+'</b><span>best streak</span></div><div><b>'+fm+'</b><span>focus min</span></div></div>';
  h+='<div class="sec">By habit</div><div class="card2">'+(n?hs.map(function(x){
    var pk=past.filter(function(k){return sched(x,k)}),d=pk.filter(function(k){return ok(x,k)}).length,p=pk.length?Math.round(d/pk.length*100):0;
    var cells=P.groups.map(function(g){var lv;
      if(rv==='y'){var q=pastOf(g).filter(function(k){return sched(x,k)}),r=q.length?q.filter(function(k){return ok(x,k)}).length/q.length:0;lv=!q.length?'fu':r===0?'':r<.25?'l1':r<.5?'l2':r<.75?'l3':'l4'}
      else{var k=g[0];lv=k>TODAY||!sched(x,k)?'fu':ok(x,k)?'l4':''}
      return '<div class="c '+lv+'"></div>'}).join('');
    return '<div class="rr"><div class="rh"><span>'+esc(x.name)+'</span><span>'+p+'%</span></div><div class="strip '+rv+'" style="grid-template-columns:repeat('+P.groups.length+',1fr)">'+cells+'</div></div>'}).join(''):'<p class="note" style="margin:0">No habits yet.</p>')+'</div>';
  $('rep').innerHTML=h;
}
$('rep').onclick=function(e){var b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.id==='rpv'){ro--;drawReport()}else if(b.id==='rnx'&&ro<0){ro++;drawReport()}};
$('seg2').onclick=function(e){var v=e.target.dataset.v;if(!v)return;rv=v;ro=0;
  [].forEach.call($('seg2').children,function(b){b.classList.toggle('on',b.dataset.v===v)});
  $('ovw').classList.toggle('hide',v!=='o');$('rep').classList.toggle('hide',v==='o');
  $('stp').textContent={o:'last 30 days',w:'weekly report',m:'monthly report',y:'yearly report'}[v];
  if(v!=='o')drawReport()};

/* ---------- backup: export / import ---------- */
function isStandalone(){return navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)}
function toast(msg){var t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.classList.add('out')},2300);setTimeout(function(){t.remove()},2700)}
function backupJSON(){return JSON.stringify({app:'habits',version:2,exported:new Date().toISOString(),habits:S.habits,tasks:S.tasks,sessions:S.sessions},null,2)}
function copyText(txt,ta){try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast('Copied')},function(){fallbackCopy()});return}}catch(e){}fallbackCopy();
  function fallbackCopy(){ta.focus();ta.select();ta.setSelectionRange(0,txt.length+1);var ok2=false;try{ok2=document.execCommand('copy')}catch(e){}toast(ok2?'Copied':'Select the text and copy it manually')}}
$('exp').onclick=function(){
  var data=backupJSON(),name='habits-backup-'+key(new Date())+'.json';
  try{var f=new File([data],name,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:'Habits backup'}).catch(function(){});return}}catch(e){}
  if(!isStandalone()){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){a.remove()},500);toast('Backup downloaded');return}
  sheet('<h3>Backup</h3><p class="note" style="margin:0">Copy this text and keep it somewhere safe (Notes, a message to yourself). You can paste it back with Import.</p><textarea id="bk" readonly></textarea><button class="btn" id="bkc">Copy backup</button>');
  $('bk').value=data;$('bkc').onclick=function(){copyText(data,$('bk'))}};
$('impb').onclick=function(){
  sheet('<h3>Import backup</h3><button class="btn o" id="ipf" style="margin-top:0">Choose file…</button><textarea id="ipt" placeholder="…or paste backup text here"></textarea><button class="btn" id="ipg">Import pasted text</button>');
  $('ipf').onclick=function(){$('imp').click()};
  $('ipg').onclick=function(){var v=$('ipt').value.trim();if(!v){$('ipt').focus();return}importData(v)}};
$('imp').onchange=function(){var f=this.files&&this.files[0];this.value='';if(!f)return;var r=new FileReader();r.onload=function(){importData(String(r.result))};r.onerror=function(){toast('Could not read the file')};r.readAsText(f)};
function importData(txt){
  var d;try{d=JSON.parse(txt)}catch(e){toast('This is not a valid backup');return}
  if(!d||!Array.isArray(d.habits)){toast('This is not a valid backup');return}
  var hs=d.habits.filter(function(h){return h&&h.name}).map(function(h,i){return {id:String(h.id||'h'+Date.now()+i),name:String(h.name).slice(0,30),unit:h.unit==='min'?'min':'x',goal:Math.max(1,parseInt(h.goal)||1),log:(h.log&&typeof h.log==='object')?h.log:{},dow:(Array.isArray(h.dow)&&h.dow.length&&h.dow.length<7)?h.dow.filter(function(n){return n>=0&&n<=6}).sort():undefined}});
  var ts=(Array.isArray(d.tasks)?d.tasks:[]).filter(function(t){return t&&t.title}).map(function(t,i){return {id:String(t.id||'t'+Date.now()+i),title:String(t.title).slice(0,60),done:!!t.done}});
  var ss=(Array.isArray(d.sessions)?d.sessions:[]).filter(function(s){return s&&s.d&&+s.m>0}).map(function(s){return {d:String(s.d),m:+s.m,h:s.h||null}});
  sheet('<h3>Import backup</h3><p class="note" style="margin:0 0 4px">Found '+hs.length+' habits, '+ts.length+' tasks and '+ss.length+' focus sessions.</p><button class="btn" id="imr">Replace my data</button><button class="btn o" id="imm">Merge with my data</button>');
  function end(){S.run=null;clearInterval(timer);save();closeSheet();refresh();tick();toast('Data imported')}
  $('imr').onclick=function(){S.habits=hs;S.tasks=ts;S.sessions=ss;end()};
  $('imm').onclick=function(){
    hs.forEach(function(h){var e=hab(h.id);if(!e)S.habits.push(h);else for(var k in h.log){if(!(k in e.log)||h.log[k]>e.log[k])e.log[k]=h.log[k]}});
    ts.forEach(function(t){if(!S.tasks.some(function(x){return x.id===t.id}))S.tasks.push(t)});
    var seen={};S.sessions.forEach(function(s){seen[s.d+'|'+s.m+'|'+s.h]=1});ss.forEach(function(s){if(!seen[s.d+'|'+s.m+'|'+s.h])S.sessions.push(s)});end()}}
function devInfo(){var p=document.createElement('div');p.style.cssText='position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';document.body.appendChild(p);
  var cs=getComputedStyle(p),t=parseFloat(cs.paddingTop)||0,b=parseFloat(cs.paddingBottom)||0;p.remove();
  $('dev').textContent=(isStandalone()?'app mode':'browser')+' · view '+innerWidth+'×'+innerHeight+' · app '+document.body.clientHeight+' · screen '+screen.width+'×'+screen.height+' · safe top '+t+' / bottom '+b}
devInfo();
window.addEventListener('resize',devInfo);

/* app-like: no pinch / double-tap zoom */
['gesturestart','gesturechange','gestureend'].forEach(function(t){
  window.addEventListener(t,function(e){e.preventDefault()},{passive:false,capture:true});
  document.addEventListener(t,function(e){e.preventDefault()},{passive:false})});
document.addEventListener('touchstart',function(e){if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false});
document.addEventListener('touchmove',function(e){if((e.touches&&e.touches.length>1)||(e.scale&&e.scale!==1))e.preventDefault()},{passive:false});
var lastTap=0;
document.addEventListener('touchend',function(e){var n=Date.now();
  if(n-lastTap<350&&!(e.target.closest&&e.target.closest('button,input,select,textarea,a,label,[data-k],[data-o],[data-h],[data-tc],[data-td]')))e.preventDefault();lastTap=n},{passive:false});

/* offline: service worker */
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}
