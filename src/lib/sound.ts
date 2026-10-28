// Original crack sound, synthesized with the Web Audio API — no audio files,
// no autoplay. Only ever played in response to a user gesture, and only when
// the visitor has explicitly enabled sound.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx || ctx.state === "closed") ctx = new Ctor();
  return ctx;
}

/** A short, dry "snap-crack": filtered noise burst + quick pitched tick. */
export function playCrackSound(): void {
  const ac = getContext();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();

  const now = ac.currentTime;

  // Noise burst (the crunch).
  const dur = 0.16;
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.pow(1 - i / data.length, 2.2);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ac.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 1800;
  noiseFilter.Q.value = 0.8;
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  noise.connect(noiseFilter).connect(noiseGain).connect(ac.destination);
  noise.start(now);

  // Sharp tick (the snap).
  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(950, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
  const oscGain = ac.createGain();
  oscGain.gain.setValueAtTime(0.22, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(oscGain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}
