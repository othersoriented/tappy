import {mapTapsToWords, nudgeWord} from './mapping.js';
import {exportJSON, exportCSV, importJSON, autosave, loadAutosave} from './storage.js';
import {initTimeline, getSelected, setSelected} from './waveform.js';

const state={
  meta:{title:'',audioName:'',duration:0,countdownSec:3,latencyMs:0,mode:'hold',version:1},
  tracks:{lyrics:[],kick:[],snare:[],guitar:[],extra:[]},
  mapped:{words:[]},
  activeTrack:'lyrics'
};

const audio=document.getElementById('audio');
initTimeline(state,audio);

const els={
  title:document.getElementById('title'),
  url:document.getElementById('audio-url'),
  file:document.getElementById('audio-file'),
  countdown:document.getElementById('countdown'),
  latency:document.getElementById('latency'),
  mode:document.getElementById('mode'),
  activeTrack:document.getElementById('active-track'),
  loadBtn:document.getElementById('load-audio'),
  startBtn:document.getElementById('start'),
  stopBtn:document.getElementById('stop'),
  lyrics:document.getElementById('lyrics'),
  mapBtn:document.getElementById('map'),
  clearLyrics:document.getElementById('clear-lyrics'),
  importBtn:document.getElementById('import-json'),
  exportBtn:document.getElementById('export-json'),
  exportCsvBtn:document.getElementById('export-csv'),
  resetBtn:document.getElementById('reset'),
  status:document.getElementById('status'),
  table:document.querySelector('#events tbody'),
  preview:document.getElementById('preview'),
  clock:document.getElementById('clock'),
  nudgeBtns:[...document.querySelectorAll('#nudge button')]
};

els.loadBtn.onclick=()=>loadAudio({file:els.file.files[0], url:els.url.value});
els.startBtn.onclick=()=>start(parseInt(els.countdown.value||'0',10));
els.stopBtn.onclick=stop;
els.mapBtn.onclick=()=>{try{map();}catch(e){els.status.textContent=e.message;}};
els.clearLyrics.onclick=()=>{els.lyrics.value='';};
els.importBtn.onclick=()=>{
  const txt=prompt('Paste JSON');
  if(!txt) return; try{importJSON(state,JSON.parse(txt));updateTable();}catch(e){alert('Invalid JSON');}
};
els.exportBtn.onclick=()=>{const data=exportJSON(state);download('taps.json',data);};
els.exportCsvBtn.onclick=()=>{const data=exportCSV(state);download('taps.csv',data);};
els.resetBtn.onclick=()=>{location.reload();};
els.mode.onchange=()=>state.meta.mode=els.mode.value;
els.activeTrack.onchange=()=>state.activeTrack=els.activeTrack.value;
els.title.oninput=()=>state.meta.title=els.title.value;
els.latency.oninput=()=>state.meta.latencyMs=parseInt(els.latency.value||'0',10);

function download(name,data){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([data]));
  a.download=name; a.click();
}

function loadAudio({file,url}){
  return new Promise((resolve,reject)=>{
    if(file){
      const obj=URL.createObjectURL(file);
      audio.src=obj; state.meta.audioName=file.name;
    }else if(url){ audio.src=url; state.meta.audioName=url; }
    audio.onloadedmetadata=()=>{state.meta.duration=audio.duration;resolve();};
    audio.onerror=reject;
  });
}

let recording=false;
let lastSpace=null;
function start(count){
  if(recording) return; state.countdownSec=count; let sec=count;
  els.status.textContent='Get ready...';
  const int=setInterval(()=>{
    els.status.textContent=sec>0?sec: 'GO';
    if(sec--<=0){clearInterval(int);begin();}
  },1000);
}
function begin(){
  recording=true; state.tracks={lyrics:[],kick:[],snare:[],guitar:[],extra:[]};
  audio.currentTime=0; audio.play();
}
function stop(){ recording=false; audio.pause(); }

document.addEventListener('keydown',e=>{
  if(!recording) return;
  if(e.code==='Space'){
    e.preventDefault();
    if(state.meta.mode==='hold'){ lastSpace=audio.currentTime+state.meta.latencyMs/1000; }
    else state.tracks.lyrics.push({t:audio.currentTime+state.meta.latencyMs/1000});
    updateTable();
  } else if(state.meta.mode==='tap'){
    const keyMap={'Digit1':'kick','Digit2':'snare','Digit3':'guitar','Digit4':'extra'};
    const track=keyMap[e.code];
    if(track){state.tracks[track].push({t:audio.currentTime+state.meta.latencyMs/1000});updateTable();}
  }
  if(e.code==='Backspace'){
    e.preventDefault();
    const arr=state.tracks[state.activeTrack];
    arr.pop();updateTable();
  }
});

document.addEventListener('keyup',e=>{
  if(!recording) return;
  if(state.meta.mode==='hold' && e.code==='Space' && lastSpace!=null){
    const t1=audio.currentTime+state.meta.latencyMs/1000;
    state.tracks.lyrics.push({t0:lastSpace,t1});
    lastSpace=null; updateTable();
  }
});

window.addEventListener('keydown',e=>{ if(e.code==='Space') e.preventDefault(); }, {passive:false});

function updateTable(){
  const tbody=els.table; tbody.innerHTML='';
  for(const [track,arr] of Object.entries(state.tracks)){
    arr.forEach(ev=>{
      const tr=document.createElement('tr');
      const t0=(ev.t0??ev.t).toFixed(3);
      const t1=(ev.t1??ev.t).toFixed(3);
      const dur=(ev.t1? (ev.t1-ev.t0).toFixed(3):'');
      tr.innerHTML=`<td>${track}</td><td>${t0}</td><td>${t1}</td><td>${dur}</td>`;
      tbody.appendChild(tr);
    });
  }
}

function map(){
  const words=els.lyrics.value.trim().split(/\s+/).filter(Boolean);
  state.mapped.words=mapTapsToWords(state.meta.mode,state.tracks.lyrics,words,state.meta.duration);
  renderPreview();
}

function renderPreview(){
  const frag=document.createDocumentFragment();
  state.mapped.words.forEach((w,i)=>{
    const span=document.createElement('span');
    span.textContent=w.text+' ';
    span.dataset.index=i;
    span.onclick=()=>{sel=i; setSelected(i);};
    frag.appendChild(span);
  });
  els.preview.innerHTML=''; els.preview.appendChild(frag);
}

els.nudgeBtns.forEach(btn=>{
  btn.addEventListener('click',()=>{
    const idx=getSelected();
    if(idx<0) return;
    nudgeWord(state.mapped.words,idx,parseFloat(btn.dataset.d)*1000,'both',state.meta.duration);
    const seg=state.tracks.lyrics[idx];
    const w=state.mapped.words[idx];
    if(seg){seg.t0=w.t0;seg.t1=w.t1;}
    updateTable();
  });
});

let sel=-1;
function tick(){
  els.clock.textContent='Now: '+audio.currentTime.toFixed(3)+'s';
  const t=audio.currentTime;
  const i=state.mapped.words.findIndex(w=>t>=w.t0 && t<w.t1);
  if(i!==sel){
    sel=i; [...els.preview.children].forEach((sp,n)=>sp.classList.toggle('active',n===i));
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Autosave
setInterval(()=>autosave(state),3000);
const saved=loadAutosave(); if(saved) {importJSON(state,saved); updateTable(); renderPreview();}

// Public API
window.Tapper={
  getState:()=>state,
  loadAudio,
  start:count=>start(count),
  stop,
  mapToLyrics:text=>{els.lyrics.value=text; map();},
  exportJSON:()=>JSON.parse(exportJSON(state)),
  exportCSV:()=>exportCSV(state),
  importJSON:obj=>{importJSON(state,obj); updateTable(); renderPreview();},
  nudgeWord:(i,ms,edge)=>{nudgeWord(state.mapped.words,i,ms,edge,state.meta.duration);}
};
