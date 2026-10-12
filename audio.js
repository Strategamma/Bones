let context;
let enabled = true;
let lastHover = 0;
try { enabled = localStorage.getItem('bones-sound') !== 'off'; } catch {}

export function soundEnabled() { return enabled; }

export function toggleSound() {
  enabled = !enabled;
  try { localStorage.setItem('bones-sound', enabled ? 'on' : 'off'); } catch {}
  if (enabled) playSfx('tap');
  return enabled;
}

function note(frequency, duration, delay = 0, volume = .08, endFrequency = frequency) {
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function playSfx(kind = 'tap') {
  if (!enabled) return;
  if (!context && kind !== 'tap') return;
  if (kind === 'hover' && (!context || performance.now() - lastHover < 100)) return;
  if (kind === 'hover') lastHover = performance.now();
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') context.resume().catch(() => {});
    if (kind === 'hover') note(560, .035, 0, .014, 440);
    else if (kind === 'tap') { note(330, .09, 0, .07, 145); note(720, .035, 0, .018, 460); }
    else if (kind === 'card') { note(290, .13, 0, .085, 115); note(480, .055, .035, .025, 220); }
    else if (kind === 'bid') { note(250, .15, 0, .075, 480); note(520, .10, .11, .045, 680); }
    else if (kind === 'flip') { note(590, .055, 0, .05, 240); note(430, .08, .05, .04, 170); }
    else if (kind === 'skull') { note(410, .25, 0, .11, 110); note(170, .23, .12, .07, 75); }
    else if (kind === 'point') [440, 550, 700].forEach((f, i) => note(f, .22, i * .10, .07));
    else if (kind === 'win') [440, 550, 660, 880].forEach((f, i) => note(f, .32, i * .12, .085));
  } catch { /* Audio can be unavailable in embedded or restricted browsers. */ }
}

document.addEventListener('pointerover', event => {
  if (event.target.closest('button')) playSfx('hover');
});
document.addEventListener('pointerdown', event => {
  if (event.target.closest('button')) playSfx('tap');
});
document.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('button')) playSfx('tap');
});
