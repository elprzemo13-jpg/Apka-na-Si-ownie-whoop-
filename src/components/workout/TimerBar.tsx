import { useEffect, useRef, useState } from "react";
import { t } from "../../lib/i18n/pl";

const PRESETS = [45, 60, 90, 120, 150];

type Props = { seconds: number | null; onClose: () => void };

/**
 * Rest timer as a bar stuck to the bottom, covering the navigation while it
 * runs. Counts from timestamps, not by decrementing: a phone that suspends
 * JavaScript (iOS, locked screen) would otherwise drift or stop.
 */
export function TimerBar({ seconds, onClose }: Props) {
  const [total, setTotal] = useState(seconds ?? 90);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(seconds ?? 90);
  const beeped = useRef(false);

  // A new request from an exercise card restarts the timer with its rest time.
  useEffect(() => {
    if (seconds === null) return;
    setTotal(seconds);
    setRemaining(seconds);
    setEndsAt(Date.now() + seconds * 1000);
    beeped.current = false;
  }, [seconds]);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !beeped.current) {
        beeped.current = true;
        beep();
        setEndsAt(null);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  if (seconds === null) return null;

  const running = endsAt !== null;
  const colour = remaining === 0 ? "text-green" : remaining <= 10 ? "text-yellow" : "text-blue";
  const barColour = remaining === 0 ? "bg-green" : remaining <= 10 ? "bg-yellow" : "bg-blue";
  const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  const setPreset = (value: number) => {
    setTotal(value);
    setRemaining(value);
    setEndsAt(null);
    beeped.current = false;
  };

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-70 mx-auto max-w-app border-t border-line bg-[#101014] px-3.5 pt-2.5">
      <div className="flex items-center gap-2">
        <span className={`font-head text-[27px] font-bold ${colour} min-w-[62px]`}>{mmss}</span>
        <button
          type="button"
          onClick={() => {
            if (running) {
              setRemaining(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
              setEndsAt(null);
            } else {
              setEndsAt(Date.now() + (remaining || total) * 1000);
              beeped.current = false;
            }
          }}
          aria-label={running ? t.timer.pause : t.timer.start}
          className={`flex h-[34px] w-[38px] items-center justify-center rounded-[7px] ${running ? "bg-line text-tx" : "bg-green text-black"}`}
        >
          {running ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          onClick={() => setPreset(total)}
          aria-label={t.timer.reset}
          className="flex h-[34px] w-[38px] items-center justify-center rounded-[7px] bg-line"
        >
          ↺
        </button>
        <span className="ml-auto flex gap-1">
          {PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreset(value)}
              className={`rounded-[6px] border px-1.5 py-1 text-[11px] ${total === value ? "border-blue text-blue" : "border-line text-dim"}`}
            >
              {value}
            </button>
          ))}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[7px] bg-line"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-[2px] bg-line">
        <div className={`h-full ${barColour}`} style={{ width: `${total ? (remaining / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

function beep() {
  try {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const context = new Ctor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      void context.close();
    }, 400);
  } catch {
    // audio blocked (no user gesture yet, silent mode): the bar still shows 0:00
  }
}
