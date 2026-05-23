"use client";

export type OperationalSound =
  | "bell"
  | "restaurant-bell"
  | "kitchen-alert"
  | "soft-ding"
  | "loud-alarm"
  | "pos-alert"
  | "repeated-bell";

type SoundPattern = {
  label: string;
  tones: Array<{ frequency: number; duration: number; gap?: number }>;
};

export const operationalSoundOptions: Array<{ key: OperationalSound; label: string }> = [
  { key: "bell", label: "Bell" },
  { key: "restaurant-bell", label: "Restaurant Bell" },
  { key: "kitchen-alert", label: "Kitchen Alert" },
  { key: "soft-ding", label: "Soft Ding" },
  { key: "loud-alarm", label: "Loud Alarm" },
  { key: "pos-alert", label: "POS Alert" },
  { key: "repeated-bell", label: "Repeated Bell" },
];

const patterns: Record<OperationalSound, SoundPattern> = {
  bell: { label: "Bell", tones: [{ frequency: 880, duration: 180 }, { frequency: 660, duration: 220 }] },
  "restaurant-bell": { label: "Restaurant Bell", tones: [{ frequency: 784, duration: 160 }, { frequency: 988, duration: 160 }, { frequency: 784, duration: 220 }] },
  "kitchen-alert": { label: "Kitchen Alert", tones: [{ frequency: 520, duration: 260 }, { frequency: 520, duration: 260 }] },
  "soft-ding": { label: "Soft Ding", tones: [{ frequency: 700, duration: 180 }] },
  "loud-alarm": { label: "Loud Alarm", tones: [{ frequency: 440, duration: 260 }, { frequency: 740, duration: 260 }, { frequency: 440, duration: 260 }] },
  "pos-alert": { label: "POS Alert", tones: [{ frequency: 620, duration: 140 }, { frequency: 820, duration: 180 }] },
  "repeated-bell": { label: "Repeated Bell", tones: [{ frequency: 880, duration: 150 }, { frequency: 880, duration: 150 }, { frequency: 880, duration: 220 }] },
};

let audioContext: AudioContext | null = null;

export async function playOperationalSound(input: {
  sound: OperationalSound;
  volume?: number;
  repeatCount?: number;
  repeatGapMs?: number;
}) {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  audioContext ??= new AudioContextClass();
  if (audioContext.state === "suspended") await audioContext.resume();

  const pattern = patterns[input.sound];
  const volume = Math.min(1, Math.max(0, input.volume ?? 0.8));
  const repeatCount = Math.max(1, input.repeatCount ?? 1);
  const repeatGap = Math.max(80, input.repeatGapMs ?? 180);

  for (let repeat = 0; repeat < repeatCount; repeat += 1) {
    for (const tone of pattern.tones) {
      await playTone(tone.frequency, tone.duration, volume);
      await delay(tone.gap ?? 40);
    }
    if (repeat < repeatCount - 1) await delay(repeatGap);
  }
}

function playTone(frequency: number, duration: number, volume: number) {
  return new Promise<void>((resolve) => {
    if (!audioContext) {
      resolve();
      return;
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.value = volume * 0.18;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);
    window.setTimeout(() => {
      oscillator.disconnect();
      gain.disconnect();
      resolve();
    }, duration + 20);
  });
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
