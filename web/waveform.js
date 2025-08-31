let canvas,ctx,state,audio,selIndex=-1;

export function initTimeline(_state,_audio){
  state=_state;audio=_audio;
  canvas=document.getElementById('waveform');
  ctx=canvas.getContext('2d');
  canvas.addEventListener('mousedown',onDown);
  canvas.addEventListener('mousemove',onMove);
  canvas.addEventListener('mouseup',onUp);
  requestAnimationFrame(draw);
}

function timeToX(t){return t/state.meta.duration*canvas.width;}
function xToTime(x){return x/canvas.width*state.meta.duration;}

let drag=null;
function onDown(e){
  if(!state.mapped.words) return;
  const x=e.offsetX;
  const t=xToTime(x);
  selIndex=state.mapped.words.findIndex(w=>t>=w.t0&&t<=w.t1);
  if(selIndex>=0){
    const w=state.mapped.words[selIndex];
    const startX=timeToX(w.t0), endX=timeToX(w.t1);
    if(Math.abs(x-startX)<5) drag={edge:'start',index:selIndex};
    else if(Math.abs(x-endX)<5) drag={edge:'end',index:selIndex};
    else drag={edge:'both',index:selIndex,offset:t-w.t0,duration:w.t1-w.t0};
  }else selIndex=-1;
}
function onMove(e){
  if(!drag) return;
  const w=state.mapped.words[drag.index];
  const t=Math.max(0,Math.min(state.meta.duration,xToTime(e.offsetX)));
  if(drag.edge==='start'){
    w.t0=Math.max(0,Math.min(t,w.t1));
  }else if(drag.edge==='end'){
    w.t1=Math.min(state.meta.duration,Math.max(t,w.t0));
  }else {
    w.t0=Math.max(0,Math.min(state.meta.duration-drag.duration,t-drag.offset));
    w.t1=w.t0+drag.duration;
  }
  const seg=state.tracks.lyrics[drag.index];
  if(seg){seg.t0=w.t0;seg.t1=w.t1;}
}
function onUp(e){ drag=null; }

export function getSelected(){return selIndex;}
export function setSelected(i){selIndex=i;}

function draw(){
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#0f0';
  if(state.mapped.words){
    state.mapped.words.forEach((w,i)=>{
      const x=timeToX(w.t0), wpx=timeToX(w.t1)-x;
      ctx.fillStyle=i===selIndex?'#0a0':'#555';
      ctx.fillRect(x,20,wpx,60);
    });
  }
  // instrument taps
  ctx.strokeStyle='#f00';
  ['kick','snare','guitar','extra'].forEach(track=>{
    (state.tracks[track]||[]).forEach(ev=>{
      const x=timeToX(ev.t);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,20);ctx.stroke();
    });
  });
  // playhead
  if(!isNaN(audio.currentTime)){
    const x=timeToX(audio.currentTime);ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();
  }
  requestAnimationFrame(draw);
}
