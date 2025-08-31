// Non-module globals so it works over file://; wrap to avoid polluting global scope
(function(){
  const KEY='tapper_autosave_v1';

  function exportJSON(state){
    return JSON.stringify({meta:state.meta, tracks:state.tracks, mapped:state.mapped}, null, 2);
  }

  function exportCSV(state){
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

  function importJSON(state,obj){
    if(!obj || typeof obj!=='object') throw new Error('Invalid import');
    if(obj.meta && obj.meta.version && obj.meta.version!==1){
      // Accept but note; keeping version check light for compatibility
    }
    if(obj.meta) state.meta=Object.assign(state.meta,obj.meta);
    if(obj.tracks) state.tracks=Object.assign(state.tracks,obj.tracks);
    if(obj.mapped) state.mapped=obj.mapped;

    // Clamp all times into [0, duration]
    const dur = state.meta.duration || 0;
    const clampSeg=(seg)=>{
      if(seg==null) return seg;
      const c = (window.Mapping && window.Mapping.clampTime) ? window.Mapping.clampTime : (x)=>x;
      if('t' in seg){ seg.t = c(seg.t, dur); }
      if('t0' in seg){ seg.t0 = c(seg.t0, dur); }
      if('t1' in seg){ seg.t1 = c(seg.t1, dur); }
      if('t0' in seg && 't1' in seg && seg.t1 < seg.t0){ seg.t1 = seg.t0; }
      return seg;
    };
    for(const k of Object.keys(state.tracks||{})){
      state.tracks[k] = (state.tracks[k]||[]).map(clampSeg);
    }
    if(state.mapped && Array.isArray(state.mapped.words)){
      state.mapped.words = state.mapped.words.map(clampSeg);
    }
  }

  function autosave(state){
    localStorage.setItem(KEY,exportJSON(state));
  }

  function loadAutosave(){
    const str=localStorage.getItem(KEY);
    if(!str) return null;
    try{return JSON.parse(str);}catch(e){return null;}
  }

  window.TapperStorage = { exportJSON, exportCSV, importJSON, autosave, loadAutosave };
})();
