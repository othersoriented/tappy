const KEY='tapper_autosave_v1';

export function exportJSON(state){
  return JSON.stringify({meta:state.meta, tracks:state.tracks, mapped:state.mapped}, null, 2);
}

export function exportCSV(state){
  const rows=[];
  for(const [track,arr] of Object.entries(state.tracks)){
    arr.forEach(ev=>{
      const t0=ev.t0??ev.t;
      const t1=ev.t1??ev.t;
      rows.push([track,t0,t1,(t1-t0).toFixed(3)].join(','));
    });
  }
  return rows.join('\n');
}

export function importJSON(state,obj){
  if(obj.meta) state.meta=Object.assign(state.meta,obj.meta);
  if(obj.tracks) state.tracks=Object.assign(state.tracks,obj.tracks);
  if(obj.mapped) state.mapped=obj.mapped;
}

export function autosave(state){
  localStorage.setItem(KEY,exportJSON(state));
}

export function loadAutosave(){
  const str=localStorage.getItem(KEY);
  if(!str) return null;
  try{return JSON.parse(str);}catch(e){return null;}
}
