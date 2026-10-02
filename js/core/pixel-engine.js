(function(){
  'use strict';
  const PF = window.PF = window.PF || {};
  const clamp = (v,a=0,b=255)=>Math.max(a,Math.min(b,v));
  const hexToRGBA = (hex)=>{
    if(!hex) return 0;
    const s=hex.replace('#',''); const h=s.length===3?s.split('').map(x=>x+x).join(''):s;
    const r=parseInt(h.slice(0,2),16)||0,g=parseInt(h.slice(2,4),16)||0,b=parseInt(h.slice(4,6),16)||0;
    return ((r&255)<<24)|((g&255)<<16)|((b&255)<<8)|255;
  };
  const rgbaToHex = (v)=>{
    if(!v) return '#000000';
    const r=(v>>>24)&255,g=(v>>>16)&255,b=(v>>>8)&255;
    return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
  };
  const rgbaParts=v=>({r:(v>>>24)&255,g:(v>>>16)&255,b:(v>>>8)&255,a:v&255});
  const pack=(r,g,b,a=255)=>((r&255)<<24)|((g&255)<<16)|((b&255)<<8)|(a&255);
  PF.hexToRGBA=hexToRGBA; PF.rgbaToHex=rgbaToHex; PF.rgbaParts=rgbaParts; PF.packRGBA=pack;

  class PixelEngine{
    constructor(canvas, opts={}){
      this.canvas=canvas; this.ctx=canvas.getContext('2d',{alpha:true}); this.width=opts.width||32; this.height=opts.height||32;
      this.scale=opts.scale||16; this.showGrid=opts.showGrid!==false; this.outline=opts.outline!==false; this.tool='pencil'; this.color=hexToRGBA(opts.color||'#2563EB');
      this.symmetry='none'; this.backgroundChecker=true; this.history=[]; this.future=[]; this.maxHistory=30; this.isDrawing=false; this.startCell=null; this.preview=null; this.onChange=opts.onChange||function(){}; this.onPick=opts.onPick||function(){};
      this.pixels=new Uint32Array(this.width*this.height); this.resize();
      this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
      this.bindPointer();
    }
    resize(){
      const maxCanvas=1800; const scale=Math.min(this.scale, Math.max(4,Math.floor(maxCanvas/Math.max(this.width,this.height))));
      this.renderScale=scale; this.canvas.width=this.width*scale; this.canvas.height=this.height*scale; this.canvas.style.width=(this.width*scale)+'px'; this.canvas.style.height=(this.height*scale)+'px'; this.render();
    }
    setScale(s){ this.scale=Math.max(1,Math.min(64,s)); this.resize(); }
    setDimensions(w,h, pixels){ this.width=w;this.height=h;this.pixels=pixels?new Uint32Array(pixels):new Uint32Array(w*h);this.history=[];this.future=[];this.preview=null;this.resize();this.onChange(this); }
    snapshot(){ return new Uint32Array(this.pixels); }
    pushHistory(){ this.history.push(this.snapshot()); if(this.history.length>this.maxHistory)this.history.shift(); this.future=[]; }
    undo(){if(!this.history.length)return;this.future.push(this.snapshot());this.pixels=this.history.pop();this.render();this.onChange(this)}
    redo(){if(!this.future.length)return;this.history.push(this.snapshot());this.pixels=this.future.pop();this.render();this.onChange(this)}
    idx(x,y){return y*this.width+x}
    inBounds(x,y){return x>=0&&y>=0&&x<this.width&&y<this.height}
    get(x,y){return this.inBounds(x,y)?this.pixels[this.idx(x,y)]:0}
    set(x,y,c){if(this.inBounds(x,y))this.pixels[this.idx(x,y)]=c>>>0}
    setTool(t){this.tool=t;this.preview=null}
    setColor(c){this.color=typeof c==='number'?c:hexToRGBA(c)}
    setSymmetry(s){this.symmetry=s}
    cellFromPointer(e){const r=this.canvas.getBoundingClientRect();return {x:Math.floor(((e.clientX-r.left)/r.width)*this.width),y:Math.floor(((e.clientY-r.top)/r.height)*this.height)}}
    symCells(x,y){
      const a=[[x,y]]; if(this.symmetry==='h'||this.symmetry==='both')a.push([this.width-1-x,y]); if(this.symmetry==='v'||this.symmetry==='both')a.push([x,this.height-1-y]); if(this.symmetry==='both')a.push([this.width-1-x,this.height-1-y]);
      const seen=new Set();return a.filter(([cx,cy])=>{if(!this.inBounds(cx,cy))return false;const k=cx+','+cy;if(seen.has(k))return false;seen.add(k);return true});
    }
    applyCell(x,y){
      if(!this.inBounds(x,y))return false;
      if(this.tool==='fill'){this.flood(x,y,this.color);return true}
      if(this.tool==='eyedropper'){const c=this.get(x,y);this.setColor(c);this.onPick(c);return false}
      if(this.tool==='clear'){this.pixels.fill(0);return true}
      const before=this.get(x,y); let c=this.color;
      if(this.tool==='eraser')c=0;
      if(this.tool==='darken'||this.tool==='lighten')c=this.shade(before,this.tool==='lighten'?1:-1);
      let changed=false;for(const [cx,cy] of this.symCells(x,y)){if(this.get(cx,cy)!==c){this.set(cx,cy,c);changed=true}};return changed;
    }
    shade(v,dir){if(!v)return this.color;const {r,g,b,a}=rgbaParts(v);const f=dir>0?1.15:.82;return pack(clamp(Math.round(r*f)),clamp(Math.round(g*f)),clamp(Math.round(b*f)),a)}
    lineCells(x0,y0,x1,y1){const cells=[];let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;while(true){cells.push([x0,y0]);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}}return cells}
    drawLine(x0,y0,x1,y1){let changed=false;for(const [x,y] of this.lineCells(x0,y0,x1,y1)){for(const [cx,cy] of this.symCells(x,y)){const c=this.tool==='eraser'?0:this.color;if(this.get(cx,cy)!==c){this.set(cx,cy,c);changed=true}}}return changed}
    drawRect(x0,y0,x1,y1){let changed=false;const minx=Math.min(x0,x1),maxx=Math.max(x0,x1),miny=Math.min(y0,y1),maxy=Math.max(y0,y1);for(let x=minx;x<=maxx;x++){for(const y of [miny,maxy])for(const [cx,cy] of this.symCells(x,y)){const c=this.tool==='eraser'?0:this.color;if(this.get(cx,cy)!==c){this.set(cx,cy,c);changed=true}}}for(let y=miny;y<=maxy;y++){for(const x of [minx,maxx])for(const [cx,cy] of this.symCells(x,y)){const c=this.tool==='eraser'?0:this.color;if(this.get(cx,cy)!==c){this.set(cx,cy,c);changed=true}}}return changed}
    flood(sx,sy,color){const target=this.get(sx,sy);if(target===color)return false;const q=[[sx,sy]];const seen=new Uint8Array(this.width*this.height);let changed=false;while(q.length){const [x,y]=q.pop();if(!this.inBounds(x,y))continue;const id=this.idx(x,y);if(seen[id]||this.get(x,y)!==target)continue;seen[id]=1;for(const [cx,cy] of this.symCells(x,y)){if(this.get(cx,cy)!==color){this.set(cx,cy,color);changed=true}}q.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);}return changed}
    begin(x,y){this.pushHistory();this.isDrawing=true;this.startCell={x,y};this.lastCell={x,y};this.preview=null;let changed=false;if(this.tool==='pencil'||this.tool==='eraser'||this.tool==='darken'||this.tool==='lighten'||this.tool==='clear'){changed=this.applyCell(x,y);this.render()}else if(this.tool==='fill'||this.tool==='eyedropper'){changed=this.applyCell(x,y);this.render();this.isDrawing=false;this.startCell=null}else{this.preview={tool:this.tool,start:{x,y},end:{x,y}};this.render()}if(changed)this.onChange(this)}
    move(x,y){if(!this.isDrawing||!this.inBounds(x,y))return;const prev=this.lastCell||{x,y};if(['pencil','eraser','darken','lighten'].includes(this.tool)){if(x!==prev.x||y!==prev.y){this.drawLine(prev.x,prev.y,x,y);this.render();this.onChange(this)}}else if(this.tool==='line'||this.tool==='rect'){this.preview.end={x,y};this.render()}this.lastCell={x,y}}
    end(){if(!this.isDrawing)return;let changed=false;if(this.preview){const {tool,start,end}=this.preview;changed=tool==='line'?this.drawLine(start.x,start.y,end.x,end.y):this.drawRect(start.x,start.y,end.x,end.y)}this.preview=null;this.isDrawing=false;this.lastCell=null;this.startCell=null;this.render();if(changed)this.onChange(this)}
    bindPointer(){
      this.canvas.addEventListener('pointerdown',e=>{e.preventDefault();this.canvas.setPointerCapture?.(e.pointerId);const p=this.cellFromPointer(e);if(this.inBounds(p.x,p.y))this.begin(p.x,p.y)});
      this.canvas.addEventListener('pointermove',e=>{e.preventDefault();const p=this.cellFromPointer(e);this.move(p.x,p.y)});
      const finish=e=>{e.preventDefault();this.end()};this.canvas.addEventListener('pointerup',finish);this.canvas.addEventListener('pointercancel',finish);this.canvas.addEventListener('pointerleave',e=>{if(this.isDrawing){const p=this.cellFromPointer(e);if(this.inBounds(p.x,p.y))this.move(p.x,p.y)}});
    }
    render(overlay){
      const s=this.renderScale,w=this.width,h=this.height,ctx=this.ctx;ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      const checker=this.backgroundChecker;
      if(checker){const c1='#ffffff',c2='#e7edf4';for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!this.pixels[this.idx(x,y)]){ctx.fillStyle=((x+y)&1)?c1:c2;ctx.fillRect(x*s,y*s,s,s)}}}
      const drawPixels=(data,alpha=1)=>{ctx.globalAlpha=alpha;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=data[this.idx(x,y)];if(!v||!((v&255)))continue;const {r,g,b}=rgbaParts(v);ctx.fillStyle=`rgb(${r} ${g} ${b})`;ctx.fillRect(x*s,y*s,s,s)}ctx.globalAlpha=1}
      if(overlay)drawPixels(overlay,.25);drawPixels(this.pixels,1);
      if(this.preview){ctx.save();ctx.globalAlpha=.35;const {start,end,tool}=this.preview;const temp=new Uint32Array(this.pixels);if(tool==='line'){for(const [x,y] of this.lineCells(start.x,start.y,end.x,end.y))for(const [cx,cy] of this.symCells(x,y))if(this.inBounds(cx,cy))temp[this.idx(cx,cy)]=this.color}else{const minx=Math.min(start.x,end.x),maxx=Math.max(start.x,end.x),miny=Math.min(start.y,end.y),maxy=Math.max(start.y,end.y);for(let x=minx;x<=maxx;x++)for(const y of [miny,maxy])for(const [cx,cy] of this.symCells(x,y))temp[this.idx(cx,cy)]=this.color;for(let y=miny;y<=maxy;y++)for(const x of [minx,maxx])for(const [cx,cy] of this.symCells(x,y))temp[this.idx(cx,cy)]=this.color}drawPixels(temp,.45);ctx.restore()}
      if(this.showGrid){ctx.strokeStyle=this.outline?'rgba(15,23,42,.18)':'rgba(15,23,42,.08)';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=w;x++){ctx.moveTo(x*s+.5,0);ctx.lineTo(x*s+.5,h*s)}for(let y=0;y<=h;y++){ctx.moveTo(0,y*s+.5);ctx.lineTo(w*s,y*s+.5)}ctx.stroke()}
      this.canvas.style.cursor=this.tool==='eyedropper'?'copy':'crosshair';
    }
    clone(){return new Uint32Array(this.pixels)}
  }
  PF.PixelEngine=PixelEngine;
})();
