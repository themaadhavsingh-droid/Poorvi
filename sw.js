const CACHE='poorvi-school-v1';
const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.json','./icon-192.svg','./icon-512.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const req=e.request; const url=new URL(req.url);
  if(req.method==='POST' && url.pathname.endsWith('/share/')){
    e.respondWith((async()=>{
      const fd=await req.formData();
      let text=fd.get('text')||fd.get('title')||'';
      const file=fd.get('files');
      const db=await openDB();
      await putDB(db,{text:String(text),file:file&&file.name?{name:file.name,type:file.type,blob:file}:null});
      return Response.redirect('./',303);
    })());
    return;
  }
  e.respondWith(caches.match(req).then(c=>c||fetch(req).then(r=>{const copy=r.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));return r}).catch(()=>caches.match('./'))));
});
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open('poorvi_share',1);r.onupgradeneeded=()=>r.result.createObjectStore('items',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
function putDB(db,obj){return new Promise((res,rej)=>{const tx=db.transaction('items','readwrite');tx.objectStore('items').add(obj);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
