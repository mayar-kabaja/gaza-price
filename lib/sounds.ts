/** Simple sound effects using Web Audio API (no external files). */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

async function ensureContextReady(): Promise<AudioContext | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  return ctx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  ramp?: { start: number; end: number },
  volume = 0.15,
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (ramp) {
    osc.frequency.exponentialRampToValueAtTime(ramp.end, ctx.currentTime + duration * 0.8);
  }

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/** Pleasant ascending tone for approve/success. */
export function playApproveSound() {
  ensureContextReady().then((ctx) => {
    if (!ctx) return;
    playTone(523.25, 0.12, "sine", { start: 523.25, end: 659.25 });
    setTimeout(() => {
      playTone(659.25, 0.15, "sine", { start: 659.25, end: 783.99 });
    }, 80);
  });
}

/** Softer, neutral tone for reject. */
export function playRejectSound() {
  ensureContextReady().then((ctx) => {
    if (!ctx) return;
    playTone(392, 0.2, "sine");
  });
}

/** Subtle tap/click sound for sidebar navigation. */
export function playNavSound() {
  ensureContextReady().then((ctx) => {
    if (!ctx) return;
    playTone(440, 0.06, "sine");
  });
}

// ── User-facing sounds ──

const userSounds = {
  confirm: () => {
    playTone(440, 0.06, "sine", undefined, 0.25);
    setTimeout(() => playTone(660, 0.1, "sine", undefined, 0.2), 60);
  },
  flag: () => {
    playTone(380, 0.1, "triangle", undefined, 0.2);
  },
  submitted: () => {
    playTone(440, 0.08, "sine", undefined, 0.2);
    setTimeout(() => playTone(550, 0.08, "sine", undefined, 0.18), 80);
    setTimeout(() => playTone(660, 0.15, "sine", undefined, 0.15), 160);
  },
  error: () => {
    playTone(300, 0.08, "sine", undefined, 0.2);
    setTimeout(() => playTone(220, 0.12, "sine", undefined, 0.15), 80);
  },
};

/** Play a named sound, respecting user mute preference and prefers-reduced-motion. */
export function playSound(name: keyof typeof userSounds) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("sounds_muted") === "true") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  ensureContextReady().then((ctx) => {
    if (!ctx) return;
    userSounds[name]();
  });
}
