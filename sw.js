/* 製缶溶接ツール：オフライン用。
   版を上げるときは VER を変える（古い保存分は自動で消える） */
var VER='seikan-2026-10-10';
var CORE=['./','index.html','manifest.json','icon-192.png','icon-512.png','favicon.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VER).then(function(c){return c.addAll(CORE);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==VER;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

/* 3秒待っても返事がなければ、保存してある分を使う */
function timeout(ms){return new Promise(function(_,rej){setTimeout(rej,ms);});}

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);

  /* 画面本体：まずネットから新しい版を取り、ダメなら保存分 */
  if(req.mode==='navigate'){
    e.respondWith(
      Promise.race([fetch(req),timeout(3000)]).then(function(res){
        var cp=res.clone();
        caches.open(VER).then(function(c){c.put('index.html',cp);});
        return res;
      }).catch(function(){
        return caches.match('index.html').then(function(r){return r||caches.match('./');});
      })
    );
    return;
  }

  /* 文字のフォント（Google Fonts）とアイコンなど：保存分があればそれを使い、裏で更新 */
  var font=(url.host==='fonts.googleapis.com'||url.host==='fonts.gstatic.com');
  if(url.origin===location.origin||font){
    e.respondWith(caches.open(VER).then(function(c){
      return c.match(req).then(function(hit){
        var net=fetch(req).then(function(res){
          if(res&&(res.ok||res.type==='opaque'))c.put(req,res.clone());
          return res;
        }).catch(function(){return hit;});
        return hit||net;
      });
    }));
  }
});
