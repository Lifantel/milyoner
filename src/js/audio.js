import { SOUNDS, url } from './config.js';

const sounds = {};
let muted = false;

export function initAudio() {
  for (const [key, cfg] of Object.entries(SOUNDS)) {
    const a = new Audio(url(cfg.src));
    a.preload = 'auto';
    a.volume = cfg.volume ?? 1;
    sounds[key] = a;
  }
}

export function play(key) {
  const a = sounds[key];
  if (!a || muted) return;
  a.pause();
  a.currentTime = 0;
  a.volume = SOUNDS[key].volume ?? 1;
  a.play().catch(() => {});
}

export function stop(key) {
  const a = sounds[key];
  if (!a) return;
  a.pause();
  a.currentTime = 0;
  a.volume = SOUNDS[key].volume ?? 1;
}

export function fadeOut(key, ms = 1200) {
  const a = sounds[key];
  if (!a || a.paused) return;
  const start = SOUNDS[key].volume ?? 1;
  const steps = 20;
  let i = 0;
  const iv = setInterval(() => {
    i++;
    a.volume = Math.max(0, start * (1 - i / steps));
    if (i >= steps) {
      clearInterval(iv);
      stop(key);
    }
  }, ms / steps);
}

export function stopAll() {
  Object.keys(sounds).forEach(stop);
}

export function setMuted(m) {
  muted = m;
  if (m) stopAll();
}

export const isMuted = () => muted;
