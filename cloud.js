/* ADET cloud (Supabase): sign in + automatic two-way sync. Plain fetch, no libraries.

   Local data (localStorage 'streak2', unchanged format) stays the source of truth and works offline.
   Sync = 3-way merge between: this device (S), the cloud, and a "base" snapshot of the last sync
   (localStorage 'adet_base', never part of backups). Per item (habit / task / check-in / focus session):
     only this device changed -> push;  only the cloud changed -> pull;  both -> see MERGE RULES.
   MERGE RULES: edit beats delete (nothing is lost); two different check-in values -> the larger one;
   two different edits of the same habit/task -> this device wins.
   SAFETY: a device with no base never deletes anything; if a sync would remove many habits/tasks/check-ins
   (here or in the cloud) it pauses and asks; a snapshot goes to 'streak2_preimport' before the cloud
   removes anything here; sync is off while saved data is unreadable (loadErr). */
(function(){
var API='https://hentiyzcxqwvhekxocmh.supabase.co',PK='sb_publishable_gYLz8iJ1Uy4s7RNVGpuAtQ_NCPcfWjy',AK='adet_auth',BK='adet_base';
var auth=null;try{auth=JSON.parse(localStorage.getItem(AK))}catch(e){}
if(!auth||!auth.at||!auth.rt)auth=null;
var busy=false,running=null,dirty=false,timer=null,status='',lastOk=0,lastTry=0;

/* ---------- auth + http ---------- */
function setAuth(a){auth=a;try{if(a)localStorage.setItem(AK,JSON.stringify(a));else localStorage.removeItem(AK)}catch(e){}}
function setSession(j){if(!j||!j.access_token)throw new Error('No session returned. Check the email and password');
  setAuth({at:j.access_token,rt:j.refresh_token,exp:Date.now()+(+j.expires_in||3600)*1000,email:(j.user&&j.user.email)||(auth&&auth.email)||''})}
function isNet(e){return !!(e&&e.net)}   /* only a failed fetch counts as 'no connection'; real code errors keep their message */
function errText(e){return (e&&e.message)||'Something went wrong'}
function msgOf(j,st){return (j&&(j.msg||j.error_description||j.message||(typeof j.error==='string'&&j.error)))||('Error '+st)}
function api(path,o){o=o||{};var h={apikey:PK,'Content-Type':'application/json'};
  if(o.token)h.Authorization='Bearer '+o.token;if(o.prefer)h.Prefer=o.prefer;
  return fetch(API+path,{method:o.method||'GET',headers:h,body:o.body?JSON.stringify(o.body):undefined}).then(function(r){
    return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}
      if(!r.ok)throw new Error(msgOf(j,r.status));return j})},function(e){var x=new Error('No connection to the server ('+(e&&e.message||'fetch failed')+')');x.net=true;throw x})}
function token(){
  if(!auth)return Promise.reject(new Error('Sign in first'));
  if(auth.exp-Date.now()>60000)return Promise.resolve(auth.at);
  return api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:auth.rt}}).then(function(j){setSession(j);return auth.at},function(e){
    if(isNet(e))throw e;
    setAuth(null);render();throw new Error('Session expired. Sign in again')})}
function rest(method,path,body,prefer){return token().then(function(t){return api('/rest/v1/'+path,{method:method,token:t,body:body,prefer:prefer})})}
function fetchAll(table,qs){var out=[],off=0;
  return (function page(){return rest('GET',table+'?'+qs+'&limit=1000&offset='+off).then(function(rows){rows=rows||[];out=out.concat(rows);
    if(rows.length<1000)return out;off+=1000;return page()})})()}
function chunks(a,n){var r=[];for(var i=0;i<a.length;i+=n)r.push(a.slice(i,i+n));return r}
function seq(list,fn){return list.reduce(function(p,x){return p.then(function(){return fn(x)})},Promise.resolve())}
function upsert(table,conflict,rows,ret){if(!rows.length)return Promise.resolve([]);var res=[];
  return seq(chunks(rows,500),function(c){return rest('POST',table+'?on_conflict='+conflict,c,'resolution=merge-duplicates,return='+(ret?'representation':'minimal')).then(function(r){if(r)res=res.concat(r)})}).then(function(){return res})}
function inList(a){return encodeURIComponent('in.('+a.map(function(x){return '"'+String(x).replace(/"/g,'')+'"'}).join(',')+')')}
function softDel(table,col,vals,extra){var now=new Date().toISOString();
  return seq(chunks(vals,100),function(c){return rest('PATCH',table+'?'+col+'='+inList(c)+(extra||''),{deleted_at:now},'return=minimal')})}

function signIn(email,pw){return api('/auth/v1/token?grant_type=password',{method:'POST',body:{email:email,password:pw}}).then(function(j){setSession(j);render()})}
function signUp(email,pw){return api('/auth/v1/signup',{method:'POST',body:{email:email,password:pw}}).then(function(j){
  if(!j||!j.access_token)throw new Error('Account created, but email confirmation is still on in Supabase. Turn off "Confirm email" and sign in');
  setSession(j);render()})}
function signOut(){var t=auth&&auth.at;setAuth(null);clearTimeout(timer);render();if(t)api('/auth/v1/logout',{method:'POST',token:t}).catch(function(){})}

/* ---------- state (local and cloud in the same shape) ----------
   {h:{_id:json}, t:{_id:json}, l:{_hid|date:'n'}, s:{_d|m|h|n:'1'}, to:[task ids in order]}  (keys prefixed '_' on purpose) */
function intOr(v,d){v=Math.round(+v);return isFinite(v)?v:d}
function dowOf(d){return (d&&d.length&&d.length<7)?d.slice().sort(function(a,b){return a-b}):null}
function hval(name,unit,goal,dow){return JSON.stringify([String(name).slice(0,30),unit==='min'?'min':'x',Math.max(1,intOr(goal,1)),dowOf(dow)])}
function tval(title,done){return JSON.stringify([String(title).slice(0,60),done?1:0])}
function sessList(){var seen={},out=[];
  S.sessions.forEach(function(s,i){var m=Math.min(1440,intOr(s&&s.m,0));if(!s||!DKEY.test(String(s.d))||m<1)return;
    var b=s.d+'|'+m+'|'+(s.h||''),n=seen[b]=(seen[b]||0)+1;out.push({i:i,key:'_'+b+'|'+n,d:s.d,m:m,h:s.h||null})});return out}
function localState(){var o={h:{},t:{},l:{},s:{},to:[]};
  S.habits.forEach(function(h){o.h['_'+h.id]=hval(h.name,h.unit,h.goal,h.dow);
    for(var k in (h.log||{})){var v=intOr(h.log[k],0);if(DKEY.test(k)&&v>0)o.l['_'+h.id+'|'+k]=String(v)}});
  S.tasks.forEach(function(t){o.t['_'+t.id]=tval(t.title,t.done);o.to.push(t.id)});
  sessList().forEach(function(x){o.s[x.key]='1'});return o}
function cloudState(R){var o={h:{},t:{},l:{},s:{},to:[],hs:[]},u2l={},l2u={},dead={};
  R.habits.forEach(function(r){var id=r.legacy_id||r.id;l2u[id]=r.id;u2l[r.id]=id;if(r.deleted_at){dead[r.id]=1;return}
    o.h['_'+id]=hval(r.name,r.unit,r.goal,r.dow);o.hs.push(id)});
  R.logs.forEach(function(r){if(r.deleted_at||dead[r.habit_id]||!u2l[r.habit_id])return;o.l['_'+u2l[r.habit_id]+'|'+r.log_date]=String(r.value)});
  R.tasks.forEach(function(r){if(r.deleted_at)return;var id=r.legacy_id||r.id;o.t['_'+id]=tval(r.title,r.done);o.to.push(id)});
  R.sess.forEach(function(r){if(r.deleted_at||!r.legacy_key||(r.habit_id&&dead[r.habit_id]))return;o.s['_'+r.legacy_key]='1'});
  o.l2u=l2u;return o}
/* the baseline belongs to ONE account: after signing in as a different user it is ignored (nothing gets deleted because of it) */
function uidOf(){try{var p=auth.at.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p)).sub||''}catch(e){return ''}}
function loadBase(){try{var b=JSON.parse(localStorage.getItem(BK));if(b&&b.h&&b.t&&b.l&&b.s&&b.uid&&b.uid===uidOf())return b}catch(e){}return {h:{},t:{},l:{},s:{},to:[],none:true}}
function setBase(st){try{localStorage.setItem(BK,JSON.stringify({uid:uidOf(),h:st.h,t:st.t,l:st.l,s:st.s,to:st.to,at:Date.now()}))}catch(e){}}
function resetBase(){try{localStorage.removeItem(BK)}catch(e){}}

/* ---------- 3-way merge of one class ---------- */
function merge(B,L,C,kind){var o={final:{},toL:{set:{},del:[]},toC:{set:{},del:[]}},keys={};
  [B,L,C].forEach(function(m){for(var k in m)keys[k]=1});
  for(var k in keys){var b=B[k],l=L[k],c=C[k],f;
    if(l===c)f=l;
    else if(l===b){f=c;if(c===undefined)o.toL.del.push(k);else o.toL.set[k]=c}
    else if(c===b){f=l;if(l===undefined)o.toC.del.push(k);else o.toC.set[k]=l}
    else if(l===undefined){f=c;o.toL.set[k]=c}                 /* deleted here, edited in cloud: keep */
    else if(c===undefined){f=l;o.toC.set[k]=l}                 /* edited here, deleted in cloud: keep */
    else{f=(kind==='l')?String(Math.max(+l,+c)):l;if(f!==l)o.toL.set[k]=f;if(f!==c)o.toC.set[k]=f}
    if(f!==undefined)o.final[k]=f}
  return o}
function count(m){var n=0;for(var k in m)n++;return n}
function mass(del,base){return (del>=3&&del*2>base)||(base>=2&&del>=base)}
function calcOrder(Bo,Lo,Co,finalT){var inF={},inB={},inL={};
  for(var k in finalT)inF[k.slice(1)]=1;Bo.forEach(function(x){inB[x]=1});Lo.forEach(function(x){inL[x]=1});
  function common(a){return a.filter(function(x){return inF[x]&&inB[x]&&inL[x]}).join('|')}
  var reordered=common(Lo)!==common(Bo),res=[],seen={};
  (reordered?Lo:Co).concat(Co,Lo).forEach(function(id){if(inF[id]&&!seen[id]){seen[id]=1;res.push(id)}});
  return res}

/* ---------- apply cloud changes to this device ---------- */
function findH(id){for(var i=0;i<S.habits.length;i++)if(S.habits[i].id===id)return S.habits[i]}
function splitL(k){var i=k.indexOf('|');return [k.slice(1,i),k.slice(i+1)]}
function applyLocal(M,C,order,tasksChanged){
  window.__cloudApply=true;
  try{
    var hdel={};
    M.h.toL.del.forEach(function(k){var id=k.slice(1);hdel[id]=1;S.habits=S.habits.filter(function(x){return x.id!==id});
      S.sessions=S.sessions.filter(function(x){return x.h!==id});if(S.run&&S.run.h===id)S.run.h=null});
    C.hs.forEach(function(id){var v=M.h.toL.set['_'+id];if(v===undefined)return;var a=JSON.parse(v),h=findH(id);
      if(!h){h={id:id,name:a[0],unit:a[1],goal:a[2],log:{}};S.habits.push(h)}else{h.name=a[0];h.unit=a[1];h.goal=a[2]}
      if(a[3])h.dow=a[3];else delete h.dow});
    M.t.toL.del.forEach(function(k){var id=k.slice(1);S.tasks=S.tasks.filter(function(x){return x.id!==id})});
    for(var k in M.t.toL.set){var id=k.slice(1),a=JSON.parse(M.t.toL.set[k]),t=null;
      S.tasks.forEach(function(x){if(x.id===id)t=x});
      if(!t){t={id:id,title:a[0],done:!!a[1]};S.tasks.push(t)}else{t.title=a[0];t.done=!!a[1]}}
    if(tasksChanged){var map={};S.tasks.forEach(function(t){map[t.id]=t});var re=[];order.forEach(function(id){if(map[id]){re.push(map[id]);delete map[id]}});
      for(var r in map)re.push(map[r]);S.tasks=re}
    for(var lk in M.l.toL.set){var p=splitL(lk),h=findH(p[0]);if(h){h.log=h.log||{};h.log[p[1]]=+M.l.toL.set[lk]}}
    M.l.toL.del.forEach(function(lk){var p=splitL(lk),h=findH(p[0]);if(h&&h.log)delete h.log[p[1]]});
    for(var sk in M.s.toL.set){var q=sk.slice(1).split('|');if(q[2]&&!findH(q[2]))continue;S.sessions.push({d:q[0],m:+q[1],h:q[2]||null})}
    if(M.s.toL.del.length){var dk={};M.s.toL.del.forEach(function(x){dk[x]=1});var drop={};sessList().forEach(function(x){if(dk[x.key])drop[x.i]=1});
      S.sessions=S.sessions.filter(function(x,i){return !drop[i]})}
    save();
  }finally{window.__cloudApply=false}
  try{refresh()}catch(e){}}

/* ---------- push this device's changes to the cloud ---------- */
function createdOn(h){var ks=Object.keys(h.log||{}).filter(function(k){return DKEY.test(k)}).sort(),t=key(new Date());return (ks.length&&ks[0]<t)?ks[0]:t}
function pushCloud(M,hmap,finalOrder,orderChanged){
  var hdelSet={};M.h.toC.del.forEach(function(k){hdelSet[k.slice(1)]=1});
  var hrows=[],ids=[];
  for(var k in M.h.toC.set){var id=k.slice(1),h=findH(id);if(!h)continue;var a=JSON.parse(M.h.toC.set[k]);
    hrows.push({legacy_id:id,name:a[0],unit:a[1],goal:a[2],dow:a[3],sort_order:S.habits.indexOf(h),created_on:createdOn(h),deleted_at:null})}
  return upsert('habits','user_id,legacy_id',hrows,true).then(function(rows){
    rows.forEach(function(r){hmap[r.legacy_id]=r.id});
    var lrows=[];for(var lk in M.l.toC.set){var p=splitL(lk);if(hmap[p[0]])lrows.push({habit_id:hmap[p[0]],log_date:p[1],value:+M.l.toC.set[lk],deleted_at:null})}
    return upsert('habit_logs','habit_id,log_date',lrows)
  }).then(function(){
    var byH={};M.l.toC.del.forEach(function(lk){var p=splitL(lk);if(hdelSet[p[0]]||!hmap[p[0]])return;(byH[hmap[p[0]]]=byH[hmap[p[0]]]||[]).push(p[1])});
    return seq(Object.keys(byH),function(u){return softDel('habit_logs','log_date',byH[u],'&habit_id=eq.'+encodeURIComponent(u))})
  }).then(function(){
    var ld=M.h.toC.del.map(function(k){return k.slice(1)});return ld.length?softDel('habits','legacy_id',ld):0
  }).then(function(){
    var set={};for(var k2 in M.t.toC.set)set[k2.slice(1)]=1;if(orderChanged)finalOrder.forEach(function(id){set[id]=1});
    var rows=[];S.tasks.forEach(function(t){if(!set[t.id])return;rows.push({legacy_id:t.id,title:String(t.title).slice(0,60),done:!!t.done,done_at:t.done?new Date().toISOString():null,position:finalOrder.indexOf(t.id),deleted_at:null})});
    return upsert('tasks','user_id,legacy_id',rows)
  }).then(function(){var td=M.t.toC.del.map(function(k){return k.slice(1)});return td.length?softDel('tasks','legacy_id',td):0
  }).then(function(){
    var rows=[];for(var sk in M.s.toC.set){var q=sk.slice(1).split('|');rows.push({legacy_key:sk.slice(1),habit_id:q[2]?(hmap[q[2]]||null):null,session_date:q[0],minutes:+q[1],deleted_at:null})}
    return upsert('focus_sessions','user_id,legacy_key',rows)
  }).then(function(){var sd=M.s.toC.del.filter(function(k){return !hdelSet[k.slice(1).split('|')[2]]}).map(function(k){return k.slice(1)});return sd.length?softDel('focus_sessions','legacy_key',sd):0})}

/* ---------- one sync run ---------- */
function fetchCloud(){return Promise.all([
  fetchAll('habits','select=id,legacy_id,name,unit,goal,dow,sort_order,deleted_at&order=sort_order,created_at'),
  fetchAll('habit_logs','select=habit_id,log_date,value,deleted_at&order=habit_id,log_date'),
  fetchAll('tasks','select=id,legacy_id,title,done,position,deleted_at&order=position,created_at'),
  fetchAll('focus_sessions','select=legacy_key,habit_id,deleted_at&order=id')]).then(function(r){return {habits:r[0],logs:r[1],tasks:r[2],sess:r[3]}})}

function doSync(opt){
  return fetchCloud().then(function(R){
    var C=cloudState(R),B=loadBase(),L=localState();
    var M={h:merge(B.h,L.h,C.h),t:merge(B.t,L.t,C.t),l:merge(B.l,L.l,C.l,'l'),s:merge(B.s,L.s,C.s)};
    /* check-ins of a deleted habit go away with the habit; don't count or send them one by one */
    function dropOf(a,h){var d={};h.del.forEach(function(k){d[k.slice(1)]=1});a.del=a.del.filter(function(k){return !d[splitL(k)[0]]})}
    dropOf(M.l.toC,M.h.toC);dropOf(M.l.toL,M.h.toL);
    var baseHT=count(B.h)+count(B.t),baseL=count(B.l);
    if(!opt.force&&!B.none){
      var dC=M.h.toC.del.length+M.t.toC.del.length,dL=M.h.toL.del.length+M.t.toL.del.length;
      if(mass(dC,baseHT)||(M.l.toC.del.length>=30&&M.l.toC.del.length*2>baseL))return {paused:true,kind:'local',n:dC||M.l.toC.del.length};
      if(mass(dL,baseHT)||(M.l.toL.del.length>=30&&M.l.toL.del.length*2>baseL))return {paused:true,kind:'cloud',n:dL||M.l.toL.del.length}}
    var order=calcOrder(B.to||[],L.to,C.to,M.t.final);
    var cOrderF=C.to.filter(function(id){return M.t.final['_'+id]!==undefined});
    var orderChangedForCloud=order.join()!==cOrderF.join(),orderChangedLocal=order.join()!==L.to.filter(function(id){return M.t.final['_'+id]!==undefined}).join();
    var removes=M.h.toL.del.length+M.t.toL.del.length+M.l.toL.del.length+M.s.toL.del.length;
    var pulls=removes+count(M.h.toL.set)+count(M.t.toL.set)+count(M.l.toL.set)+count(M.s.toL.set);
    if(removes)snap();
    if(pulls||orderChangedLocal)applyLocal(M,C,order,orderChangedLocal);
    var pushes=M.h.toC.del.length+M.t.toC.del.length+M.l.toC.del.length+M.s.toC.del.length+count(M.h.toC.set)+count(M.t.toC.set)+count(M.l.toC.set)+count(M.s.toC.set);
    var fin={h:M.h.final,t:M.t.final,l:M.l.final,s:M.s.final,to:order};
    return (pushes||orderChangedForCloud?pushCloud(M,C.l2u,order,orderChangedForCloud):Promise.resolve()).then(function(){
      setBase(fin);return {ok:true,pulled:pulls,pushed:pushes,habits:count(M.h.final),tasks:count(M.t.final),cloudHabits:count(C.h),hereHabits:count(L.h)}})})}

function setStatus(s){status=s;var e=$('cl-st');if(e)e.textContent=s}
function sync(opt){opt=opt||{};
  if(!auth)return Promise.resolve({skip:'signed out'});
  if(typeof loadErr!=='undefined'&&loadErr){setStatus('Sync is off: saved data could not be read');return Promise.resolve({skip:'unreadable'})}
  if(running){dirty=true;return running}
  clearTimeout(timer);lastTry=Date.now();setStatus('Syncing…');
  running=doSync(opt).then(function(r){running=null;
    if(r.paused){setStatus('Sync paused: '+(r.kind==='local'?'this device removed many items':'the cloud is missing many items'));return r}
    lastOk=Date.now();setStatus('Synced '+new Date(lastOk).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' · '+r.habits+' habits, '+r.tasks+' tasks · received '+r.pulled+', sent '+r.pushed+' (cloud had '+r.cloudHabits+' habits, this device had '+r.hereHabits+')');
    if(dirty){dirty=false;return sync()}return r},
    function(e){running=null;dirty=false;setStatus(isNet(e)?'Offline. Will sync when connected':'Sync error: '+errText(e));return {error:errText(e)}});
  return running}
function changed(){if(!auth)return;if(running){dirty=true;return}clearTimeout(timer);timer=setTimeout(function(){sync()},window.ADET_SYNC_DELAY||2500)}

/* ---------- upload / restore (recovery tools) ---------- */
function upload(){return fetchCloud().then(function(R){var C=cloudState(R),L=localState(),hmap=C.l2u;
  var M={h:{toC:{set:{},del:[]}},l:{toC:{set:{},del:[]}},t:{toC:{set:{},del:[]}},s:{toC:{set:{},del:[]}}};
  for(var k in L.h)M.h.toC.set[k]=L.h[k];for(var k1 in L.l)M.l.toC.set[k1]=L.l[k1];for(var k2 in L.t)M.t.toC.set[k2]=L.t[k2];for(var k3 in L.s)M.s.toC.set[k3]='1';
  return pushCloud(M,hmap,L.to,true).then(function(){return fetchCloud()}).then(function(R2){
    var C2=cloudState(R2),bad=0;
    ['h','t','l','s'].forEach(function(c){for(var kk in L[c])if(C2[c][kk]!==L[c][kk])bad++});
    if(!bad)setBase({h:L.h,t:L.t,l:L.l,s:L.s,to:L.to});
    return {ok:bad===0,bad:bad,habits:count(L.h),logs:count(L.l),tasks:count(L.t),sess:count(L.s)}})})}
function restore(){
  return fetchCloud().then(function(R){
    var C=cloudState(R),u2h={},habits=[];
    R.habits.forEach(function(r){if(r.deleted_at)return;var id=r.legacy_id||r.id,o={id:id,name:r.name,unit:r.unit,goal:r.goal,log:{}};if(r.dow&&r.dow.length)o.dow=r.dow;u2h[r.id]=o;habits.push(o)});
    R.logs.forEach(function(l){var h=u2h[l.habit_id];if(h&&!l.deleted_at)h.log[l.log_date]=l.value});
    var tasks=[];R.tasks.forEach(function(t){if(!t.deleted_at)tasks.push({id:t.legacy_id||t.id,title:t.title,done:!!t.done})});
    var sessions=[];Object.keys(C.s).forEach(function(k){var q=k.slice(1).split('|');if(q[2]&&!findHById(habits,q[2]))return;sessions.push({d:q[0],m:+q[1],h:q[2]||null})});
    if(!habits.length&&!tasks.length&&!sessions.length)return {empty:true};
    return {data:{app:'habits',version:2,exported:new Date().toISOString(),habits:habits,tasks:tasks,sessions:sessions}}})}
function findHById(a,id){for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i]}

/* ---------- UI (existing sheet / card styles) ---------- */
function counts(){var L=localState();return count(L.h)+' habits, '+count(L.l)+' check-ins, '+count(L.t)+' tasks, '+count(L.s)+' focus sessions'}
function render(){var b=$('cloudbox');if(!b)return;
  b.innerHTML=auth
    ?'<p class="note" style="margin-top:0">Signed in as '+esc(auth.email||'')+'</p><p class="note" id="cl-st">'+esc(status||'')+'</p><div class="two" style="margin-top:12px"><button class="btn o" id="cl-sy">Sync now</button><button class="btn o" id="cl-dn">Restore</button></div><button class="btn o" id="cl-up">Upload this device to cloud</button><button class="btn d" id="cl-out">Sign out</button>'
    :'<p class="note" style="margin-top:0">Keep your data in the cloud and in sync across devices.</p><button class="btn" id="cl-in" style="margin-top:12px">Sign in</button>'}
function info(title,text,extra){sheet('<h3>'+title+'</h3><p class="note" style="margin:0 0 6px">'+text+'</p>'+(extra||'<button class="btn o" id="cl-x">Close</button>'));if($('cl-x'))$('cl-x').onclick=closeSheet}
function loginSheet(){
  sheet('<h3>Sign in</h3><input id="cl-e" type="email" placeholder="Email" autocomplete="email" autocapitalize="off"><input id="cl-p" type="password" placeholder="Password (min 6)" autocomplete="current-password" style="margin-top:10px"><button class="btn" id="cl-go">Sign in</button><button class="btn o" id="cl-new">Create account</button>');
  function go(fn){if(busy)return;var e=$('cl-e').value.trim(),p=$('cl-p').value;if(!e||!p){toast('Enter email and password');return}
    busy=true;fn(e,p).then(function(){busy=false;closeSheet();toast('Signed in');sync()},function(x){busy=false;toast(errText(x))})}
  $('cl-go').onclick=function(){go(signIn)};$('cl-new').onclick=function(){go(signUp)}}
function uploadSheet(){
  info('Upload this device','This device has '+counts()+'.<br>Uploading adds or updates these in the cloud. Nothing on this device changes and nothing is deleted in the cloud.','<button class="btn" id="cl-ok">Upload</button><button class="btn o" id="cl-x">Cancel</button>');
  $('cl-x').onclick=closeSheet;
  $('cl-ok').onclick=function(){if(busy)return;busy=true;info('Uploading…','Please wait.','');
    upload().then(function(v){busy=false;setStatus(v.ok?'Uploaded and verified':'Upload not fully verified');
      info(v.ok?'Uploaded':'Uploaded, but check failed',v.ok?'Verified: '+v.habits+' habits, '+v.logs+' check-ins, '+v.tasks+' tasks, '+v.sess+' sessions are in the cloud.':v.bad+' items could not be confirmed. Run Upload again.')},
      function(x){busy=false;info('Upload failed',esc(errText(x))+'. Your data on this device is unchanged.')})}}
function restoreSheet(){if(busy)return;busy=true;info('Loading…','Reading your cloud copy.','');
  restore().then(function(r){busy=false;if(r.empty){info('Cloud is empty','Nothing to restore yet. Use Upload on the device that has your data.');return}
    importData(JSON.stringify(r.data))},function(x){busy=false;info('Restore failed',esc(errText(x))+'. Your data on this device is unchanged.')})}
function syncNow(){setStatus('Syncing…');sync().then(function(r){
  if(r&&r.paused){
    if(r.kind==='local')info('Apply your deletions?','Since the last sync this device removed '+r.n+' items. Apply that to the cloud?','<button class="btn" id="cl-f">Apply</button><button class="btn o" id="cl-x">Cancel</button>');
    else info('Cloud is missing items','The cloud no longer has '+r.n+' items that this device has. You can remove them here too, or put this device\'s data back into the cloud.','<button class="btn" id="cl-u">Restore cloud from this device</button><button class="btn o" id="cl-f">Remove them here</button><button class="btn o" id="cl-x">Cancel</button>');
    if($('cl-x'))$('cl-x').onclick=closeSheet;
    if($('cl-f'))$('cl-f').onclick=function(){closeSheet();sync({force:true}).then(function(){toast('Synced')})};
    if($('cl-u'))$('cl-u').onclick=function(){uploadSheet()}}
  else if(r&&r.error)toast(r.error)})}

var box=$('cloudbox');
if(box)box.onclick=function(e){var id=e.target.id;
  if(id==='cl-in')loginSheet();else if(id==='cl-up')uploadSheet();else if(id==='cl-dn')restoreSheet();else if(id==='cl-sy')syncNow();
  else if(id==='cl-out'){signOut();toast('Signed out')}};
render();
if(lastOk)setStatus('');
document.addEventListener('visibilitychange',function(){if(!document.hidden&&auth&&Date.now()-lastTry>15000)sync()});
window.addEventListener('online',function(){if(auth)sync()});
if(auth)setTimeout(function(){sync()},800);
window.Cloud={signIn:signIn,signUp:signUp,signOut:signOut,sync:sync,changed:changed,resetBase:resetBase,upload:upload,restore:restore,isIn:function(){return !!auth},status:function(){return status}};
})();
