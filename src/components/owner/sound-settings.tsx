"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Play, Volume2 } from "lucide-react";

function readSettings() {
  if (typeof window === "undefined") return { enabled: true, volume: 80, sound: "Bell Ring" };
  try {
    const saved = window.localStorage.getItem("sarva-owner-sound-settings");
    return saved ? { enabled: true, volume: 80, sound: "Bell Ring", ...JSON.parse(saved) } as { enabled: boolean; volume: number; sound: string } : { enabled: true, volume: 80, sound: "Bell Ring" };
  } catch {
    return { enabled: true, volume: 80, sound: "Bell Ring" };
  }
}

export function SoundSettings() {
  const initial = readSettings();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [volume, setVolume] = useState(initial.volume);
  const [sound, setSound] = useState(initial.sound);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/order-alert.mp3");
    audioRef.current.preload = "auto";
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sarva-owner-sound-settings", JSON.stringify({ enabled, volume, sound }));
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [enabled, volume, sound]);

  function testSound() {
    if (!enabled || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    void audioRef.current.play().catch(() => playFallbackBeep(volume));
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bell className="size-6 text-orange-600" />
          <div>
            <p className="font-black text-neutral-950">Sound Alerts</p>
            <p className="text-sm text-slate-600">Get notified instantly when a new order arrives.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((value) => !value)}
          className={enabled ? "h-7 w-12 rounded-full bg-orange-500 p-1" : "h-7 w-12 rounded-full bg-slate-300 p-1"}
          aria-pressed={enabled}
          aria-label="Toggle sound alerts"
        >
          <span className={enabled ? "block size-5 translate-x-5 rounded-full bg-white transition" : "block size-5 rounded-full bg-white transition"} />
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold">
          <span>New Order Sound</span>
          <select value={sound} onChange={(event) => setSound(event.target.value)} className="bg-transparent text-right outline-none">
            <option>Bell Ring</option>
            <option>Counter Ding</option>
            <option>Soft Alert</option>
          </select>
          <button type="button" onClick={testSound} className="grid size-8 place-items-center rounded-full border text-orange-600" aria-label="Test alert sound">
            <Play className="size-4" />
          </button>
        </div>
        <label className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm font-semibold text-slate-700">
          <Volume2 className="size-4" />
          <input type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="accent-orange-500" />
          <span>{volume}%</span>
        </label>
      </div>
    </div>
  );
}

function playFallbackBeep(volume: number) {
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return;
  const context = new AudioContextConstructor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.value = Math.min(1, Math.max(0, volume / 100)) * 0.08;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  window.setTimeout(() => {
    oscillator.stop();
    void context.close();
  }, 160);
}
