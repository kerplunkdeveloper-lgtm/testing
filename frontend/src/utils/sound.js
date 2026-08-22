// Utility for playing high-quality, web-audio based notification sounds
let sharedAudioCtx = null;
let lastPlayTimestamp = 0;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
};

// Global interaction unlocker
const unlockAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().then(() => {
      cleanupListeners();
    }).catch(() => {});
  } else if (ctx && ctx.state === "running") {
    cleanupListeners();
  }
};

const cleanupListeners = () => {
  if (typeof window !== "undefined") {
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("pointerdown", unlockAudio);
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("click", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
  window.addEventListener("touchstart", unlockAudio);
  window.addEventListener("pointerdown", unlockAudio);
}

const isSoundEnabled = () => {
  if (typeof window === "undefined") return false;
  const soundSetting = localStorage.getItem("soundEnabled");
  return soundSetting !== "false";
};

// Throttle sound calls within 150ms to prevent double-play stutter
const canPlaySoundNow = () => {
  const now = Date.now();
  if (now - lastPlayTimestamp < 150) {
    return false;
  }
  lastPlayTimestamp = now;
  return true;
};

/**
 * Play a crisp, crystal-clear double bell chime for Direct Messages
 */
export const playDirectMessageSound = () => {
  if (!isSoundEnabled() || !canPlaySoundNow()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTone = (freq, startTime, duration, startVol, endVol, type = "sine") => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(startVol, startTime);
      gain.gain.exponentialRampToValueAtTime(endVol, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Pleasant 2-note crystal chime: A5 (880Hz) followed by E6 (1318.51Hz)
    playTone(880, now, 0.35, 0.25, 0.001, "sine");
    playTone(1318.51, now + 0.08, 0.5, 0.3, 0.001, "sine");
  } catch (err) {
    console.error("Direct Message audio playback error:", err);
  }
};

/**
 * Play a warm, rich multi-note bubble chime for Group Messages
 */
export const playGroupMessageSound = () => {
  if (!isSoundEnabled() || !canPlaySoundNow()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTone = (freq, startTime, duration, startVol, endVol, type = "sine") => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(startVol, startTime);
      gain.gain.exponentialRampToValueAtTime(endVol, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Warm 3-note ascending chime: C5 (523.25Hz) -> G5 (783.99Hz) -> C6 (1046.50Hz)
    playTone(523.25, now, 0.25, 0.2, 0.001, "sine");
    playTone(783.99, now + 0.06, 0.3, 0.25, 0.001, "sine");
    playTone(1046.50, now + 0.12, 0.45, 0.28, 0.001, "sine");
  } catch (err) {
    console.error("Group Message audio playback error:", err);
  }
};

/**
 * General Notification sound chime
 */
export const playNotificationSound = (type = "default") => {
  if (!isSoundEnabled() || !canPlaySoundNow()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTone = (freq, startTime, duration, vol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(1046.5, now, 0.4, 0.25);
    playTone(1318.51, now + 0.05, 0.5, 0.22);
    playTone(1567.98, now + 0.1, 0.6, 0.2);
  } catch (err) {
    console.error("General Notification audio playback error:", err);
  }
};
