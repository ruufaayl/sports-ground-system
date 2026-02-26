'use client';

// ─── Web Audio API Sound Engine ─────────────────────────────────────────────
// All sounds generated procedurally — no external audio files needed

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch {
            return null;
        }
    }
    return audioCtx;
}

function playTone(
    frequency: number,
    type: OscillatorType,
    duration: number,
    gainPeak: number,
    fadeIn = 0.005,
    detune = 0
) {
    if (!soundEnabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = frequency;
        osc.detune.value = detune;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(gainPeak * 0.3, ctx.currentTime + fadeIn);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch {
        // Silently fail
    }
}

/** Short mechanical tick — for roulette wheel each item change */
export function playTick() {
    playTone(800, 'square', 0.05, 0.15, 0.002);
    playTone(600, 'triangle', 0.04, 0.08, 0.002);
}

/** Soft chime — for ground/slot selection */
export function playSelect() {
    playTone(523.25, 'sine', 0.4, 0.25, 0.01);   // C5
    setTimeout(() => playTone(659.25, 'sine', 0.3, 0.2, 0.01), 80);  // E5
}

/** Rising success — for booking confirmation */
export function playConfirm() {
    playTone(440, 'sine', 0.3, 0.3, 0.01);   // A4
    setTimeout(() => playTone(523.25, 'sine', 0.3, 0.3, 0.01), 120); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.5, 0.35, 0.01), 240); // E5
    setTimeout(() => playTone(880, 'sine', 0.8, 0.4, 0.01), 380);   // A5
}

export function setSoundEnabled(val: boolean) {
    soundEnabled = val;
}

export function isSoundEnabled() {
    return soundEnabled;
}
