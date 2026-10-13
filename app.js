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
var popId=null,newTaskId=null,rv='o',ro=0;
function buzz(){try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}}
function runAnim(el){if(!el)return;el.classList.remove('anim');void el.offsetWidth;el.classList.add('anim');setTimeout(function(){el.classList.remove('anim')},800)}
function countUp(){var el=$('bp'),to=+el.dataset.v||0,t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/700),e=1-Math.pow(1-k,3);el.innerHTML=Math.round(to*e)+'<small>%</small>';if(k<1)requestAnimationFrame(f)})(t0)}
function hab(id){return S.habits.filter(function(h){return h.id===id})[0]}
function val(h,k){return h.log[k]||0}
function ok(h,k){return val(h,k)>=h.goal}
function nOk(k){return S.habits.filter(function(h){return ok(h,k)}).length}
function allOk(k){return S.habits.length>0&&nOk(k)===S.habits.length}
function streakOf(h){var d=new Date(),n=0;if(!ok(h,key(d)))d=addD(d,-1);while(ok(h,key(d))){n++;d=addD(d,-1)}return n}
function bestOf(h){var a=Object.keys(h.log).filter(function(k){return ok(h,k)}).sort(),b=0,c=0,p=null;
  a.forEach(function(k){var t=new Date(k+'T00:00:00');if(p&&Math.round((t-p)/864e5)===1)c++;else c=1;p=t;if(c>b)b=c});return b}
function taskRow(t){return '<div class="row'+(newTaskId===t.id?' new':'')+'"><button class="ck sq'+(t.done?' on':'')+(popId===t.id&&t.done?' pop':'')+'" data-tc="'+t.id+'" aria-label="Mark done">'+CK+'</button><div class="m"><div class="n'+(t.done?' dn':'')+'">'+esc(t.title)+'</div></div><button class="ib" data-td="'+t.id+'" aria-label="Delete"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div>'}
function drawTasks(){
  var a=S.tasks.filter(function(t){return !t.done}),d=S.tasks.filter(function(t){return t.done});
  var h=a.length?a.map(taskRow).join(''):'<div class="empty">No tasks.<br>Add your first one above.</div>';
  if(d.length)h+='<div class="sec">Done · '+d.length+'</div>'+d.map(taskRow).join('')+'<button class="btn d" data-clr="1">Clear completed</button>';
  $('tlist').innerHTML=h;
}
function addTask(){var v=$('tin').value.trim();if(!v){$('tin').focus();return}var nid='t'+Date.now();S.tasks.push({id:nid,title:v,done:false});newTaskId=nid;$('tin').value='';save();drawTasks();newTaskId=null}
$('tadd').onclick=addTask;$('tin').onkeydown=function(e){if(e.key==='Enter')addTask()};
$('tlist').onclick=function(e){
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
    g+='<div class="c'+(lv?' l'+lv:'')+(fu?' fu':'')+(k===TODAY?' t':'')+'" data-k="'+k+'"></div>'}
  return '<div class="hw"><div class="hl"><span>Mo</span><span></span><span>We</span><span></span><span>Fr</span><span></span><span></span></div><div class="hs"><div class="ml">'+ml+'</div><div class="hm2">'+g+'</div></div></div><div class="cap"></div>'}
function mountHM(el,f,txt){
  function draw(){el.innerHTML=hmHTML(f,17)}
  draw.end=function(){draw.done=true};
  el.onclick=function(e){var k=e.target.dataset.k;if(!k||k>TODAY)return;el.querySelector('.cap').textContent=new Date(k+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long'})+' — '+txt(k)};
  draw();return draw}
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
  var h='';if(!S.habits.length)h='<div class="empty">No habits yet<br><button class="btn" data-add="1">Add your first habit</button></div>';
  S.habits.forEach(function(x){var v=val(x,sel),st=streakOf(x),s;
    s=x.unit==='min'?v+' / '+x.goal+' min':x.goal>1?v+' / '+x.goal:'';
    if(st)s+=(s?' · ':'')+st+' '+pl(st)+' in a row';
    h+='<div class="row" data-o="'+x.id+'"><div class="m"><div class="n">'+esc(x.name)+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>'
      +(x.unit==='min'?'<button class="ib" data-f="'+x.id+'" aria-label="Focus">'+TI+'</button>':'')
      +'<button class="ck'+(ok(x,sel)?' on':v?' part':'')+(popId===x.id&&ok(x,sel)?' pop':'')+'" data-c="'+x.id+'"'+(sel===TODAY?'':' disabled')+' aria-label="Check in">'+CK+'</button></div>'});
  if(S.habits.length)h+='<button class="addrow" data-add="1">+ New habit</button>';
  var dn=S.habits.filter(function(x){return ok(x,sel)}).length,tt=S.habits.length,sm=$('sum');
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
  var timed=false;
  sheet('<h3>New habit</h3><input id="nin" placeholder="Name" maxlength="30"><div class="sw"><span>Goal in minutes</span><button class="tg" id="tg" aria-label="Toggle"></button></div><input id="ng" type="number" min="1" value="1" inputmode="numeric" class="hide" placeholder="Minutes per day"><button class="btn" id="nsave">Add</button>');
  $('tg').onclick=function(){timed=!timed;this.classList.toggle('on',timed);$('ng').classList.toggle('hide',!timed);if(timed)$('ng').value=15};
  $('nsave').onclick=function(){var v=$('nin').value.trim();if(!v){$('nin').focus();return}
    S.habits.push({id:'h'+Date.now(),name:v,unit:timed?'min':'x',goal:timed?Math.max(1,parseInt($('ng').value)||15):1,log:{}});save();closeSheet();refresh()};
}
$('add').onclick=addSheet;
function detail(id){
  var x=hab(id);if(!x)return;var n30=0;
  for(var i=0;i<30;i++)if(ok(x,key(addD(new Date(),-i))))n30++;
  sheet('<h3>'+esc(x.name)+'</h3><div class="st3"><div><b>'+streakOf(x)+'</b><span>streak</span></div><div><b>'+bestOf(x)+'</b><span>best</span></div><div><b>'+Math.round(n30/30*100)+'%</b><span>last 30 days</span></div></div>'
   +'<div id="dcal"></div><p class="note">The calendar fills in automatically from your check-ins and focus sessions.</p>'
   +(x.unit==='min'?'<button class="btn" id="dfocus">Start focus</button>':'')+'<button class="btn d" id="ddel">Delete habit</button>');
  mountHM($('dcal'),function(k){return ok(x,k)?4:val(x,k)?2:0},function(k){return val(x,k)+' / '+x.goal+(x.unit==='min'?' min':'')});
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
  var done=0,n=S.habits.length,tot=n*30;
  for(var i=0;i<30;i++)done+=nOk(key(addD(new Date(),-i)));
  var p=tot?Math.round(done/tot*100):0;
  $('bp').dataset.v=p;$('bp').innerHTML=p+'<small>%</small>';
  $('bl').textContent=n?done+' of '+tot+' check-ins done':'Add habits to see your stats';
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
function drawSel(){var v=$('hsel').value,h='<option value="">No habit</option>';S.habits.forEach(function(x){h+='<option value="'+x.id+'">'+esc(x.name)+'</option>'});$('hsel').innerHTML=h;$('hsel').value=v}
function openFocus(id){
  drawSel();if(id)$('hsel').value=id;
  var x=id&&hab(id);if(x&&x.unit==='min'&&!S.run){dur=[15,25,45,60].indexOf(x.goal)>=0?x.goal:dur;drawChips()}
  $('fs').classList.remove('hide');drawFocus();tick();
}
$('tm').onclick=function(){openFocus()};
$('fx').onclick=function(){$('fs').classList.add('hide');tick()};
function drawFocus(){
  var r=!!S.run;$('chips').classList.toggle('hide',r);$('hsel').classList.toggle('hide',r);
  $('go').textContent=r?'Stop':'Start';$('go').className='btn'+(r?' stop':'');
  if(!r){$('fu').style.width='0';if(!$('fl').dataset.k){$('ft').textContent=fmt(dur*60000);$('fl').textContent=''}}
}
function tick(){
  var r=S.run,b=$('run');
  if(!r){b.classList.add('hide');return}
  var left=r.end-Date.now();if(left<=0){finish(true);return}
  var x=r.h&&hab(r.h),name=x?x.name:'Focus';
  $('ft').textContent=fmt(left);$('fu').style.width=(100*(1-left/(r.mins*60000)))+'%';$('fl').textContent=name;$('fl').dataset.k=1;
  b.textContent='Focus '+fmt(left)+' · '+name;b.classList.toggle('hide',tab!=='today'||!$('fs').classList.contains('hide'));
}
function start(){$('fl').dataset.k='';S.run={mins:dur,end:Date.now()+dur*60000,h:$('hsel').value||null};save();drawFocus();tick();clearInterval(timer);timer=setInterval(tick,1000)}
function finish(done){
  clearInterval(timer);var r=S.run;if(!r)return;S.run=null;$('run').classList.add('hide');
  if(done){S.sessions.push({d:TODAY,m:r.mins,h:r.h});var x=r.h&&hab(r.h);if(x)x.log[TODAY]=val(x,TODAY)+(x.unit==='min'?r.mins:1);try{navigator.vibrate&&navigator.vibrate(200)}catch(e){}}
  save();$('fl').dataset.k='';drawFocus();refresh();
  if(done){$('fu').style.width='100%';$('ft').textContent='00:00';$('fl').textContent='Done: +'+r.mins+' min';$('fl').dataset.k=1}
}
$('go').onclick=function(){S.run?finish(false):start()};
$('run').onclick=function(){openFocus()};
document.addEventListener('visibilitychange',function(){if(document.hidden)return;
  var nt=key(new Date());if(nt!==TODAY){if(sel===TODAY)sel=nt;TODAY=nt;refresh()}tick()});

/* NAV */
function show(t){tab=t;['today','tasks','stats'].forEach(function(k){$('s-'+k).classList.toggle('hide',k!==t)});
  [].forEach.call($('nav').children,function(b){b.classList.toggle('on',b.dataset.t===t)});tick();refresh();if(t==='stats'&&!drawAllCal.done)drawAllCal.end();runAnim({today:$('list'),tasks:$('tlist'),stats:$('rates')}[t]);if(t==='stats')countUp()}
$('nav').onclick=function(e){var b=e.target.closest('[data-t]');if(b)show(b.dataset.t)};
function refresh(){drawToday();drawTasks();drawStats();if(rv!=='o')drawReport()}

var drawAllCal=mountHM($('allcal'),function(k){var n=S.habits.length,c=nOk(k),f=n?c/n:0;return f===0?0:f<.5?1:f<.75?2:f<1?3:4},function(k){return nOk(k)+' of '+S.habits.length});
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
    done=past.reduce(function(a,k){return a+nOk(k)},0),poss=past.length*n,pct=poss?Math.round(done/poss*100):0,
    perfect=past.filter(allOk).length,set={},
    best=hs.reduce(function(a,h){var c=0,b=0;P.keys.forEach(function(k){if(k<=TODAY&&ok(h,k)){c++;if(c>b)b=c}else c=0});return Math.max(a,b)},0);
  P.keys.forEach(function(k){set[k]=1});
  var fm=S.sessions.reduce(function(a,s){return set[s.d]?a+s.m:a},0);
  var h='<div class="rng"><button id="rpv" aria-label="Previous">‹</button><span>'+P.label+'</span><button id="rnx" aria-label="Next"'+(ro>=0?' disabled':'')+'>›</button></div>';
  h+='<div class="card2"><div class="big sm">'+pct+'<small>%</small></div><p class="lead" style="margin-bottom:16px">'+(n?done+' of '+poss+' check-ins':'Add habits to see reports')+'</p><div class="bars'+(rv==='m'?' m':'')+'">'
   +P.groups.map(function(g,i){var ks=pastOf(g),d=ks.reduce(function(a,k){return a+nOk(k)},0),p=ks.length&&n?Math.round(d/(ks.length*n)*100):0;
     return '<div class="bc"><div class="bw"><u class="'+(ks.length&&n?'':'f')+'" style="height:'+(ks.length&&n?Math.max(p,3):3)+'%"></u></div><span>'+P.gl[i]+'</span></div>'}).join('')+'</div></div>';
  h+='<div class="st3"><div><b>'+perfect+'</b><span>perfect days</span></div><div><b>'+best+'</b><span>best streak</span></div><div><b>'+fm+'</b><span>focus min</span></div></div>';
  h+='<div class="sec">By habit</div><div class="card2">'+(n?hs.map(function(x){
    var d=past.filter(function(k){return ok(x,k)}).length,p=past.length?Math.round(d/past.length*100):0;
    var cells=P.groups.map(function(g){var lv;
      if(rv==='y'){var q=pastOf(g),r=q.length?q.filter(function(k){return ok(x,k)}).length/q.length:0;lv=!q.length?'fu':r===0?'':r<.25?'l1':r<.5?'l2':r<.75?'l3':'l4'}
      else{var k=g[0];lv=k>TODAY?'fu':ok(x,k)?'l4':''}
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
  var hs=d.habits.filter(function(h){return h&&h.name}).map(function(h,i){return {id:String(h.id||'h'+Date.now()+i),name:String(h.name).slice(0,30),unit:h.unit==='min'?'min':'x',goal:Math.max(1,parseInt(h.goal)||1),log:(h.log&&typeof h.log==='object')?h.log:{}}});
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
  $('dev').textContent=(isStandalone()?'app mode':'browser')+' · view '+innerWidth+'×'+innerHeight+' · screen '+screen.width+'×'+screen.height+' · safe top '+t+' / bottom '+b}
devInfo();window.addEventListener('resize',devInfo);

/* offline + install support (works on https) */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
}
