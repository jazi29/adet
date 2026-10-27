/* Offline support.
   App files: network first (always fresh when online), cached copy when offline or the network is slow.
   Google Fonts: cached on first load, used offline. */
var CACHE='habits-app-v1',FONTS='habits-fonts-v1';
var CORE=['./','index.html','style.css','app.js','manifest.webmanifest','icon.svg','icon-180.png','icon-192.png','icon-512.png','icon-maskable-512.png'];
var SCOPE=self.registration.scope;

function keyOf(u){var x=new URL(u,SCOPE);return x.origin+x.pathname}

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(CORE.map(function(u){
      return fetch(new Request(u,{cache:'reload'})).then(function(r){if(r.ok)return c.put(keyOf(u),r)}).catch(function(){})}))
  }).then(function(){return self.skipWaiting()}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE&&k!==FONTS}).map(function(k){return caches.delete(k)}))
  }).then(function(){return self.clients.claim()}));
});

function netFirst(req){
  var key=keyOf(req.url);
  return caches.open(CACHE).then(function(c){
    return c.match(key).then(function(hit){
      var fallback=hit?Promise.resolve(hit):(req.mode==='navigate'?c.match(keyOf('index.html')):Promise.resolve(undefined));
      var net=fetch(req).then(function(res){if(res&&res.ok)c.put(key,res.clone());return res});
      return fallback.then(function(fb){
        if(!fb)return net;
        /* slow or no connection: serve the cached copy */
        var slow=new Promise(function(ok){setTimeout(function(){ok(fb)},3000)});
        return Promise.race([net.catch(function(){return fb}),slow]);
      });
    });
  });
}

function fontFirst(req){
  return caches.open(FONTS).then(function(c){
    return c.match(req).then(function(hit){
      var net=fetch(req).then(function(res){if(res&&(res.ok||res.type==='opaque'))c.put(req,res.clone());return res}).catch(function(){return hit||Response.error()});
      return hit||net;
    });
  });
}

self.addEventListener('fetch',function(e){
  var req=e.request;if(req.method!=='GET')return;
  var u=new URL(req.url);
  if(u.origin===self.location.origin)e.respondWith(netFirst(req));
  else if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com')e.respondWith(fontFirst(req));
});
