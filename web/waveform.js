let wavesurfer;
let state;
let audio;
let selected = -1;

async function loadLib() {
  const [{ default: WaveSurfer }, { default: RegionsPlugin }, { default: MarkersPlugin }] =
    await Promise.all([
      import('https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js'),
      import('https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.esm.js'),
      import('https://unpkg.com/wavesurfer.js@7/dist/plugins/markers.esm.js'),
    ]);
  wavesurfer = WaveSurfer.create({
    container: '#waveform',
    height: 120,
    waveColor: '#555',
    progressColor: '#0a0',
    media: audio,
    plugins: [RegionsPlugin.create(), MarkersPlugin.create()],
  });
}

export async function initTimeline(_state, _audio) {
  state = _state;
  audio = _audio;
  await loadLib();
}

export function syncWaveform() {
  if (!wavesurfer) return;
  wavesurfer.clearRegions();
  if (wavesurfer.markers) wavesurfer.clearMarkers();

  // lyrics regions
  if (state.mapped.words) {
    state.mapped.words.forEach((w, i) => {
      const region = wavesurfer.addRegion({
        start: w.t0,
        end: w.t1,
        color: i === selected ? 'rgba(0,255,0,0.3)' : 'rgba(0,0,0,0.3)',
        drag: true,
        resize: true,
      });
      region.on('click', () => setSelected(i));
      region.on('update-end', (r) => {
        w.t0 = r.start;
        w.t1 = r.end;
        const seg = state.tracks.lyrics[i];
        if (seg) {
          seg.t0 = w.t0;
          seg.t1 = w.t1;
        }
      });
    });
  }

  // instrument markers
  ['kick', 'snare', 'guitar', 'extra'].forEach((track) => {
    (state.tracks[track] || []).forEach((ev) => {
      wavesurfer.addMarker({ time: ev.t, label: track[0].toUpperCase(), color: '#f00' });
    });
  });
}

export function getSelected() {
  return selected;
}

export function setSelected(i) {
  selected = i;
  if (!wavesurfer) return;
  const regs = Object.values(wavesurfer.regions.list || {});
  regs.forEach((r, idx) => {
    r.setOptions({ color: idx === selected ? 'rgba(0,255,0,0.3)' : 'rgba(0,0,0,0.3)' });
  });
}

