(function(){
  'use strict';
  const PF=window.PF=window.PF||{};
  const rgb=v=>[(v>>>24)&255,(v>>>16)&255,(v>>>8)&255];
  function key(v){return String(v>>>0)}
  function paletteFor(frames){
    const counts=new Map(); let transparent=false;
    for(const f of frames){for(const v0 of f){const v=v0>>>0;if((v&255)===0){transparent=true;continue}const k=key(v);counts.set(k,(counts.get(k)||0)+1)}}
    let entries=[...counts.entries()].map(([v,c])=>({v:Number(v)>>>0,c,r:rgb(Number(v)>>>0)})).sort((a,b)=>b.c-a.c);
    const limit=transparent?255:256;
    if(entries.length>limit)entries=entries.slice(0,limit);
    const colors=entries.map(e=>e.r); if(transparent)colors.unshift([0,0,0]);
    if(!colors.length)colors.push([0,0,0]);
    return {colors,transparent,transparentIndex:transparent?0:-1};
  }
  function nearest(c,colors,start=0){let bi=start,bd=1e18;for(let i=start;i<colors.length;i++){const d=(c[0]-colors[i][0])**2+(c[1]-colors[i][1])**2+(c[2]-colors[i][2])**2;if(d<bd){bd=d;bi=i;if(d===0)break}}return bi}
  function nextPow2(n){let p=2;while(p<n)p*=2;return p}
  class BitWriter{constructor(){this.bytes=[];this.cur=0;this.bits=0}write(code,size){this.cur|=(code<<this.bits);this.bits+=size;while(this.bits>=8){this.bytes.push(this.cur&255);this.cur>>>=8;this.bits-=8}}finish(){if(this.bits>0)this.bytes.push(this.cur&255);return new Uint8Array(this.bytes)}}
  function lzw(indices,minCodeSize){
    const clear=1<<minCodeSize,end=clear+1;let next=end+1;let codeSize=minCodeSize+1;let dict=new Map();let bw=new BitWriter();bw.write(clear,codeSize);
    if(!indices.length){bw.write(end,codeSize);return bw.finish()}
    let prefix=indices[0].toString();
    for(let i=1;i<indices.length;i++){
      const k=prefix+','+indices[i];
      if(dict.has(k)){prefix=k;continue}
      bw.write(dict.get(prefix),codeSize);
      if(next<4096){dict.set(k,next++);if(next===(1<<codeSize)&&codeSize<12)codeSize++}
      else{bw.write(clear,codeSize);dict=new Map();codeSize=minCodeSize+1;next=end+1}
      prefix=indices[i].toString();
    }
    bw.write(dict.get(prefix),codeSize);bw.write(end,codeSize);return bw.finish();
  }
  function pushSubblocks(out,data){let i=0;while(i<data.length){const n=Math.min(255,data.length-i);out.push(n);for(let j=0;j<n;j++)out.push(data[i+j]);i+=n}out.push(0)}
  class GIFEncoder{
    constructor(width,height){this.width=width;this.height=height;this.frames=[]}
    addFrame(pixels,delay){this.frames.push({pixels:new Uint32Array(pixels),delay:Math.max(10,Math.round(delay||100))})}
    encode(){if(!this.frames.length)throw new Error('No frames');const pal=paletteFor(this.frames.map(x=>x.pixels));let size=nextPow2(Math.min(256,Math.max(2,pal.colors.length)));while(pal.colors.length<size)pal.colors.push([0,0,0]);const minCodeSize=Math.max(2,Math.ceil(Math.log2(size)));const out=[];const text=s=>{for(let i=0;i<s.length;i++)out.push(s.charCodeAt(i))};
      text('GIF89a');out.push(this.width&255,(this.width>>>8)&255,this.height&255,(this.height>>>8)&255);const gctFlag=1,colorRes=7,sort=0,sizeCode=Math.log2(size)-1;out.push((gctFlag<<7)|(colorRes<<4)|(sort<<3)|sizeCode,0,0);for(const c of pal.colors)out.push(c[0],c[1],c[2]);for(let i=pal.colors.length;i<size;i++)out.push(0,0,0);
      // Loop extension
      out.push(0x21,0xFF,11);text('NETSCAPE2.0');out.push(3,1,0,0,0);
      const colorMap=new Map();pal.colors.forEach((c,i)=>colorMap.set((c[0]<<16)|(c[1]<<8)|c[2],i));
      const mapPixel=v=>{v>>>=0;if((v&255)===0&&pal.transparent)return pal.transparentIndex;const c=rgb(v);const direct=colorMap.get((c[0]<<16)|(c[1]<<8)|c[2]);return direct!==undefined?direct:nearest(c,pal.colors,pal.transparent?1:0)};
      for(const fr of this.frames){const idx=new Uint8Array(fr.pixels.length);for(let i=0;i<idx.length;i++)idx[i]=mapPixel(fr.pixels[i]);
        out.push(0x21,0xF9,4);let packed=pal.transparent?1:0;out.push(packed,fr.delay&255,(fr.delay>>>8)&255,pal.transparent?pal.transparentIndex:0,0);
        out.push(0x2C,0,0,0,0,this.width&255,(this.width>>>8)&255,this.height&255,(this.height>>>8)&255,0);
        out.push(minCodeSize);const data=lzw(idx,minCodeSize);pushSubblocks(out,data);
      }
      out.push(0x3B);return new Blob([new Uint8Array(out)],{type:'image/gif'});
    }
  }
  PF.GIFEncoder=GIFEncoder;
})();
