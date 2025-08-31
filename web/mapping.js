// Non-module global so it works over file://
(function(){
  function clampTime(t, duration){
    return Math.max(0, Math.min(duration, t));
  }

  function mapTapsToWords(mode, taps, words, duration){
    const mapped=[];
    if(mode==='hold'){
      if(words.length!==taps.length) throw new Error('Word count mismatch');
      for(let i=0;i<words.length;i++){
        const seg=taps[i];
        mapped.push({text:words[i], t0:clampTime(seg.t0,duration), t1:clampTime(seg.t1,duration)});
      }
    }else{
      if(words.length!==taps.length) throw new Error('Word count mismatch');
      for(let i=0;i<words.length;i++){
        const t0=clampTime(taps[i].t,duration);
        const t1=i<words.length-1?clampTime(taps[i+1].t,duration):clampTime(t0+0.25,duration);
        mapped.push({text:words[i], t0, t1});
      }
    }
    return mapped;
  }

  function nudgeWord(words,index,ms,edge,duration){
    const w=words[index];
    if(!w) return;
    const dt=ms/1000;
    if(edge==='start'||edge==='both') w.t0=clampTime(w.t0+dt,duration);
    if(edge==='end'||edge==='both') w.t1=clampTime(w.t1+dt,duration);
    if(w.t1<w.t0) w.t1=w.t0;
  }

  window.Mapping = { clampTime, mapTapsToWords, nudgeWord };
})();
