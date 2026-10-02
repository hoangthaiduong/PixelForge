(function(){
  'use strict';
  const PF=window.PF=window.PF||{};
  function canvasFromPixels(width,height,pixels,scale=1){const c=document.createElement('canvas');c.width=width*scale;c.height=height*scale;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;const img=ctx.createImageData(width,height);const d=img.data;for(let i=0;i<pixels.length;i++){const v=pixels[i]>>>0;d[i*4]=(v>>>24)&255;d[i*4+1]=(v>>>16)&255;d[i*4+2]=(v>>>8)&255;d[i*4+3]=v&255}if(scale===1){ctx.putImageData(img,0,0)}else{const tmp=document.createElement('canvas');tmp.width=width;tmp.height=height;tmp.getContext('2d').putImageData(img,0,0);ctx.drawImage(tmp,0,0,c.width,c.height)}return c}
  function blobFromCanvas(c,type='image/png',quality){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Canvas export failed')),type,quality))}
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function makeThumb(width,height,pixels){const c=canvasFromPixels(width,height,pixels,4);return c.toDataURL('image/png')}
  function saveHTD(project){const json=JSON.stringify({format:'PixelForge',version:1,type:project.type,name:project.name,width:project.width,height:project.height,fps:project.fps||8,frames:(project.frames||[]).map(f=>({pixels:Array.from(f.pixels||f)})),meta:project.meta||{}});downloadBlob(new Blob([json],{type:'application/json'}),safeName(project.name||'PixelForge')+'.htd')}
  function safeName(s){return String(s).trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').slice(0,80)||'PixelForge'}
  async function exportPNG(width,height,pixels,name){downloadBlob(await blobFromCanvas(canvasFromPixels(width,height,pixels,1)) ,safeName(name)+'.png')}
  async function exportSpriteSheet(frames,w,h,name,mode='horizontal'){
    const n=frames.length;let cols=mode==='vertical'?1:mode==='grid'?Math.ceil(Math.sqrt(n)):n;let rows=mode==='vertical'?n:mode==='grid'?Math.ceil(n/cols):1;const c=document.createElement('canvas');c.width=w*cols;c.height=h*rows;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;frames.forEach((f,i)=>ctx.drawImage(canvasFromPixels(w,h,f,1),(i%cols)*w,Math.floor(i/cols)*h));downloadBlob(await blobFromCanvas(c),safeName(name)+'-sprite-sheet.png')}
  async function exportGIF(frames,w,h,fps,name){if(!PF.GIFEncoder)throw new Error('GIF encoder unavailable');const enc=new PF.GIFEncoder(w,h);frames.forEach(f=>enc.addFrame(f,Math.max(10,Math.round(1000/fps))));const blob=enc.encode();downloadBlob(blob,safeName(name)+'.gif')}
  PF.Exporter={canvasFromPixels,downloadBlob,makeThumb,saveHTD,exportPNG,exportSpriteSheet,exportGIF,safeName};
})();
