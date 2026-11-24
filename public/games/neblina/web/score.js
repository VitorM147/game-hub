// Original eight-bar loops, with a shared moon motif in three arrangements.
const arrangements = [
  { beat: .36, bass: [50, 46, 53, 48], lead: [0,7,12,0,15,12,7,5, 0,3,7,10,7,3,5,7], voice: "sine" },
  { beat: .31, bass: [45, 45, 41, 43], lead: [0,null,7,3,0,null,10,7, 0,3,null,5,7,null,3,0], voice: "triangle" },
  { beat: .41, bass: [55, 52, 48, 50], lead: [7,12,16,19,14,12,7,null, 4,7,11,14,12,7,4,null], voice: "sine" },
];
let audio, master, nextBeat = 0, step = 0, level = -1;
let muted = false;
try { muted = localStorage.getItem("neblina-muted") === "yes"; } catch {}
export const isMuted = () => muted;
export function unlock() {
  try {
    if (!audio) {
      audio = new AudioContext();
      master = audio.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(audio.destination);
    }
    if (audio.state !== "running") audio.resume().catch(() => {});
  } catch {}
}
export function toggleSound() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 1;
  try { localStorage.setItem("neblina-muted", muted ? "yes" : "no"); } catch {}
}
export function hush() {
  if (audio) audio.suspend().catch(() => {});
  nextBeat = 0;
}
function note(midi, when, length, volume, type) {
  if (!audio || muted) return;
  const tone = audio.createOscillator(), env = audio.createGain();
  tone.type = type;
  tone.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  env.gain.setValueAtTime(.0001, when);
  env.gain.exponentialRampToValueAtTime(volume, when + .015);
  env.gain.exponentialRampToValueAtTime(.0001, when + length);
  tone.connect(env).connect(master);
  tone.start(when);
  tone.stop(when + length);
  tone.onended = () => { tone.disconnect(); env.disconnect(); };
}
export function score(index) {
  if (audio?.state !== "running" || muted) return;
  if (level !== index) { level = index; step = 0; nextBeat = 0; }
  const now = audio.currentTime;
  if (nextBeat > now + .08) return;
  const a = arrangements[index], when = Math.max(now, nextBeat);
  const root = a.bass[Math.floor(step / 8) % 4], degree = a.lead[step % 16];
  if (step % 4 === 0) note(root, when, a.beat * 3.6, .048, "sine");
  if (degree !== null) note(root + 12 + degree, when, a.beat * 1.65, .027, a.voice);
  nextBeat = when + a.beat;
  step++;
}
export function cue(notes) {
  if (audio?.state !== "running") return;
  notes.forEach((pitch, i) => note(pitch, audio.currentTime + i * .075, .28, .056, "sine"));
}
