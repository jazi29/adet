/* ADET cloud (Supabase) - sign in, upload a copy, restore a copy.
   Plain fetch, no libraries. Local data (localStorage 'streak2') stays the source of truth:
   this file never changes or deletes local data by itself. Restore goes through the existing
   import screen (preview, snapshot, two-tap Replace). The session lives in its own key 'adet_auth'
   and is never part of a backup. */
(function(){
var API='https://hentiyzcxqwvhekxocmh.supabase.co',PK='sb_publishable_gYLz8iJ1Uy4s7RNVGpuAtQ_NCPcfWjy',AK='adet_auth';
var auth=null;try{auth=JSON.parse(localStorage.getItem(AK))}catch(e){}
if(!auth||!auth.at||!auth.rt)auth=null;
var busy=false;

function setAuth(a){auth=a;try{if(a)localStorage.setItem(AK,JSON.stringify(a));else localStorage.removeItem(AK)}catch(e){}}
function setSession(j){if(!j||!j.access_token)throw new Error('No session returned. Check the email and password');
  setAuth({at:j.access_token,rt:j.refresh_token,exp:Date.now()+(+j.expires_in||3600)*1000,email:(j.user&&j.user.email)||(auth&&auth.email)||''})}
function errText(e){return e&&e.name==='TypeError'?'No connection':(e&&e.message)||'Something went wrong'}
function msgOf(j,st){return (j&&(j.msg||j.error_description||j.message||(typeof j.error==='string'&&j.error)))||('Error '+st)}

function api(path,o){o=o||{};var h={apikey:PK,'Content-Type':'application/json'};
  if(o.token)h.Authorization='Bearer '+o.token;if(o.prefer)h.Prefer=o.prefer;
  return fetch(API+path,{method:o.method||'GET',headers:h,body:o.body?JSON.stringify(o.body):undefined}).then(function(r){
    return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}
      if(!r.ok)throw new Error(msgOf(j,r.status));return j})})}

function token(){
  if(!auth)return Promise.reject(new Error('Sign in first'));
  if(auth.exp-Date.now()>60000)return Promise.resolve(auth.at);
  return api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:auth.rt}}).then(function(j){setSession(j);return auth.at},function(e){
    if(e&&e.name==='TypeError')throw e;   /* offline: keep the session */
    setAuth(null);render();throw new Error('Session expired. Sign in again')})}
function rest(method,path,body,prefer){return token().then(function(t){return api('/rest/v1/'+path,{method:method,token:t,body:body,prefer:prefer})})}

function fetchAll(table,qs){var out=[],off=0;
  return (function page(){return rest('GET',table+'?'+qs+'&limit=1000&offset='+off).then(function(rows){rows=rows||[];out=out.concat(rows);
    if(rows.length<1000)return out;off+=1000;return page()})})()}
function upsert(table,conflict,rows,ret){if(!rows.length)return Promise.resolve([]);
  var parts=[],res=[];for(var i=0;i<rows.length;i+=500)parts.push(rows.slice(i,i+500));
  return parts.reduce(function(p,c){return p.then(function(){
    return rest('POST',table+'?on_conflict='+conflict,c,'resolution=merge-duplicates,return='+(ret?'representation':'minimal')).then(function(r){if(r)res=res.concat(r)})})},Promise.resolve()).then(function(){return res})}

/* ---- auth ---- */
function signIn(email,pw){return api('/auth/v1/token?grant_type=password',{method:'POST',body:{email:email,password:pw}}).then(function(j){setSession(j);render()})}
function signUp(email,pw){return api('/auth/v1/signup',{method:'POST',body:{email:email,password:pw}}).then(function(j){
  if(!j||!j.access_token)throw new Error('Account created, but email confirmation is still on in Supabase. Turn off "Confirm email" and sign in');
  setSession(j);render()})}
function signOut(){var t=auth&&auth.at;setAuth(null);render();if(t)api('/auth/v1/logout',{method:'POST',token:t}).catch(function(){})}

/* ---- local -> cloud rows ---- */
function intOr(v,d){v=Math.round(+v);return isFinite(v)?v:d}
function localPlan(){
  var today=key(new Date()),habits=[],logs=[],tasks=[],sess=[];
  S.habits.forEach(function(h,i){
    var ks=Object.keys(h.log||{}).filter(function(k){return DKEY.test(k)&&intOr(h.log[k],0)>0}).sort();
    habits.push({legacy_id:h.id,name:String(h.name).slice(0,30),unit:h.unit==='min'?'min':'x',goal:Math.max(1,intOr(h.goal,1)),
      dow:(h.dow&&h.dow.length&&h.dow.length<7)?h.dow:null,sort_order:i,created_on:(ks.length&&ks[0]<today)?ks[0]:today,deleted_at:null});
    ks.forEach(function(k){logs.push({legacy:h.id,date:k,value:intOr(h.log[k],1)})})});
  S.tasks.forEach(function(t,i){tasks.push({legacy_id:t.id,title:String(t.title).slice(0,60),done:!!t.done,position:i,deleted_at:null})});
  var seen={};
  S.sessions.forEach(function(s){var m=Math.min(1440,intOr(s.m,0));if(!s||!DKEY.test(String(s.d))||m<1)return;
    var b=s.d+'|'+m+'|'+(s.h||''),n=seen[b]=(seen[b]||0)+1;sess.push({legacy_key:b+'|'+n,hl:s.h||null,session_date:s.d,minutes:m,deleted_at:null})});
  return {habits:habits,logs:logs,tasks:tasks,sess:sess}}

function upload(){
  var P=localPlan(),hid={};
  return upsert('habits','user_id,legacy_id',P.habits,true).then(function(rows){
    rows.forEach(function(r){hid[r.legacy_id]=r.id});
    return upsert('habit_logs','habit_id,log_date',P.logs.filter(function(l){return hid[l.legacy]}).map(function(l){return {habit_id:hid[l.legacy],log_date:l.date,value:l.value,deleted_at:null}}))
  }).then(function(){return upsert('tasks','user_id,legacy_id',P.tasks)})
  .then(function(){return upsert('focus_sessions','user_id,legacy_key',P.sess.map(function(s){return {legacy_key:s.legacy_key,habit_id:s.hl?(hid[s.hl]||null):null,session_date:s.session_date,minutes:s.minutes,deleted_at:null}}))})
  .then(function(){return verify(P,hid)})}

/* read everything back and compare with what this device has */
function verify(P,hid){
  return Promise.all([fetchAll('habit_logs','select=habit_id,log_date,value&deleted_at=is.null&order=habit_id,log_date'),
    fetchAll('tasks','select=legacy_id&deleted_at=is.null&order=id'),fetchAll('focus_sessions','select=legacy_key&deleted_at=is.null&order=id')]).then(function(r){
    var lg={},tk={},ss={},bad=0;
    r[0].forEach(function(x){lg[x.habit_id+'|'+x.log_date]=x.value});r[1].forEach(function(x){tk[x.legacy_id]=1});r[2].forEach(function(x){ss[x.legacy_key]=1});
    P.logs.forEach(function(l){if(lg[hid[l.legacy]+'|'+l.date]!==l.value)bad++});
    P.tasks.forEach(function(t){if(!tk[t.legacy_id])bad++});P.sess.forEach(function(s){if(!ss[s.legacy_key])bad++});
    return {ok:bad===0,bad:bad,habits:P.habits.length,logs:P.logs.length,tasks:P.tasks.length,sess:P.sess.length}})}

/* ---- cloud -> backup format -> existing import screen ---- */
function restore(){
  return Promise.all([fetchAll('habits','select=id,legacy_id,name,unit,goal,dow,sort_order&deleted_at=is.null&order=sort_order,created_at'),
    fetchAll('habit_logs','select=habit_id,log_date,value&deleted_at=is.null&order=habit_id,log_date'),
    fetchAll('tasks','select=id,legacy_id,title,done,position&deleted_at=is.null&order=position,created_at'),
    fetchAll('focus_sessions','select=habit_id,session_date,minutes&deleted_at=is.null&order=session_date,created_at')]).then(function(r){
    var byId={},habits=r[0].map(function(h){var o={id:h.legacy_id||h.id,name:h.name,unit:h.unit,goal:h.goal,log:{}};if(h.dow&&h.dow.length)o.dow=h.dow;byId[h.id]=o;return o});
    r[1].forEach(function(l){var h=byId[l.habit_id];if(h)h.log[l.log_date]=l.value});
    var tasks=r[2].map(function(t){return {id:t.legacy_id||t.id,title:t.title,done:!!t.done}});
    var sessions=r[3].map(function(s){return {d:s.session_date,m:s.minutes,h:s.habit_id&&byId[s.habit_id]?byId[s.habit_id].id:null}});
    if(!habits.length&&!tasks.length&&!sessions.length)return {empty:true};
    return {data:{app:'habits',version:2,exported:new Date().toISOString(),habits:habits,tasks:tasks,sessions:sessions}}})}

/* ---- UI (existing sheet / card styles) ---- */
function counts(){var P=localPlan();return P.habits.length+' habits, '+P.logs.length+' check-ins, '+P.tasks.length+' tasks, '+P.sess.length+' focus sessions'}
function render(){var b=$('cloudbox');if(!b)return;
  b.innerHTML=auth
    ?'<p class="note" style="margin-top:0">Signed in as '+esc(auth.email||'')+'</p><div class="two"><button class="btn o" id="cl-up">Upload to cloud</button><button class="btn o" id="cl-dn">Restore from cloud</button></div><button class="btn d" id="cl-out">Sign out</button>'
    :'<p class="note" style="margin-top:0">Keep a copy of your data in the cloud and open it on other devices.</p><button class="btn" id="cl-in" style="margin-top:12px">Sign in</button>'}
function info(title,text,extra){sheet('<h3>'+title+'</h3><p class="note" style="margin:0 0 6px">'+text+'</p>'+(extra||'<button class="btn o" id="cl-x">Close</button>'));if($('cl-x'))$('cl-x').onclick=closeSheet}
function loginSheet(){
  sheet('<h3>Sign in</h3><input id="cl-e" type="email" placeholder="Email" autocomplete="email" autocapitalize="off"><input id="cl-p" type="password" placeholder="Password (min 6)" autocomplete="current-password" style="margin-top:10px"><button class="btn" id="cl-go">Sign in</button><button class="btn o" id="cl-new">Create account</button>');
  function go(fn){if(busy)return;var e=$('cl-e').value.trim(),p=$('cl-p').value;if(!e||!p){toast('Enter email and password');return}
    busy=true;fn(e,p).then(function(){busy=false;closeSheet();toast('Signed in')},function(x){busy=false;toast(errText(x))})}
  $('cl-go').onclick=function(){go(signIn)};$('cl-new').onclick=function(){go(signUp)}}
function uploadSheet(){
  info('Upload to cloud','This device has '+counts()+'.<br>Uploading adds or updates these in the cloud. Nothing on this device changes and nothing is deleted in the cloud.','<button class="btn" id="cl-ok">Upload</button><button class="btn o" id="cl-x">Cancel</button>');
  $('cl-x').onclick=closeSheet;
  $('cl-ok').onclick=function(){if(busy)return;busy=true;info('Uploading…','Please wait.','');
    upload().then(function(v){busy=false;
      info(v.ok?'Uploaded':'Uploaded, but check failed',v.ok?'Verified: '+v.habits+' habits, '+v.logs+' check-ins, '+v.tasks+' tasks, '+v.sess+' sessions are in the cloud.':v.bad+' items could not be confirmed. Run Upload again.')},
      function(x){busy=false;info('Upload failed',esc(errText(x))+'. Your data on this device is unchanged.')})}}
function restoreSheet(){if(busy)return;busy=true;info('Loading…','Reading your cloud copy.','');
  restore().then(function(r){busy=false;if(r.empty){info('Cloud is empty','Nothing to restore yet. Use Upload on the device that has your data.');return}
    importData(JSON.stringify(r.data))},function(x){busy=false;info('Restore failed',esc(errText(x))+'. Your data on this device is unchanged.')})}

var box=$('cloudbox');
if(box)box.onclick=function(e){var id=e.target.id;
  if(id==='cl-in')loginSheet();else if(id==='cl-up')uploadSheet();else if(id==='cl-dn')restoreSheet();
  else if(id==='cl-out'){signOut();toast('Signed out')}};
render();
window.Cloud={signIn:signIn,signUp:signUp,signOut:signOut,upload:upload,restore:restore,plan:localPlan,isIn:function(){return !!auth}};
})();
