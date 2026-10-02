const CACHE='pixelforge-static-v1';
const FILES=['./','./index.html','./css/global.css','./css/editor.css','./js/core/pixel-engine.js','./js/core/storage.js','./js/core/export.js','./js/core/gif-encoder.js','./js/three/character.js','./js/app.js','./assets/logo.svg','./assets/favicon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match('./index.html'))))});
