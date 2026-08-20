import React, { useEffect, useRef, useState } from 'react';

// ----------------------------------------------------
// FLOATING POMODORO TIMER
// Rendered once at App level so it stays mounted (and the countdown keeps
// running) no matter which tab is active. Draggable anywhere on screen;
// position, durations and timer state all persist to localStorage. The
// countdown is anchored to a wall-clock `endAt` timestamp rather than an
// interval counter, so it stays accurate across reloads, laptop sleep and
// backgrounded tabs.
// ----------------------------------------------------

type PomodoroMode = 'focus' | 'short' | 'long';

interface Durations {
  focus: number; // minutes
  short: number;
  long: number;
}

interface PomodoroState {
  mode: PomodoroMode;
  running: boolean;
  endAt: number | null; // epoch ms the current session ends (only when running)
  remainingSec: number; // authoritative while paused
  durations: Durations;
  focusCount: number; // focus sessions completed today
  focusCountDate: string; // YYYY-MM-DD the count belongs to
  collapsed: boolean;
  pos: { x: number; y: number } | null; // widget top-left; null = default corner
  autoStartNext: boolean;
}

const STORAGE_KEY = 'xp_pomodoro_v1';
const DEFAULT_DURATIONS: Durations = { focus: 25, short: 5, long: 15 };
const SESSIONS_PER_LONG_BREAK = 4;
const EDGE_MARGIN = 8;

const MODE_META: Record<PomodoroMode, { label: string }> = {
  focus: { label: 'Focus' },
  short: { label: 'Short Break' },
  long: { label: 'Long Break' },
};

const FOCUS_PRESETS = [25, 40, 55] as const;

const todayKey = (): string => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const clampMinutes = (n: number): number => Math.min(180, Math.max(1, Math.round(n)));

const durationFor = (mode: PomodoroMode, durations: Durations): number =>
  clampMinutes(durations[mode]) * 60;

// Compute the state after the current session finishes: bump the daily focus
// counter, pick the next mode (long break every 4th focus), and either
// auto-start it or leave it primed and paused.
const advanceSession = (prev: PomodoroState): PomodoroState => {
  const today = todayKey();
  let focusCount = prev.focusCountDate === today ? prev.focusCount : 0;
  let nextMode: PomodoroMode;
  if (prev.mode === 'focus') {
    focusCount += 1;
    nextMode = focusCount % SESSIONS_PER_LONG_BREAK === 0 ? 'long' : 'short';
  } else {
    nextMode = 'focus';
  }
  const nextDuration = durationFor(nextMode, prev.durations);
  return {
    ...prev,
    mode: nextMode,
    focusCount,
    focusCountDate: today,
    running: prev.autoStartNext,
    endAt: prev.autoStartNext ? Date.now() + nextDuration * 1000 : null,
    remainingSec: nextDuration,
  };
};

const loadState = (): PomodoroState => {
  const fallback: PomodoroState = {
    mode: 'focus',
    running: false,
    endAt: null,
    remainingSec: DEFAULT_DURATIONS.focus * 60,
    durations: DEFAULT_DURATIONS,
    focusCount: 0,
    focusCountDate: todayKey(),
    collapsed: true,
    pos: null,
    autoStartNext: false,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PomodoroState>;
    const durations: Durations = {
      focus: clampMinutes(Number(parsed.durations?.focus) || DEFAULT_DURATIONS.focus),
      short: clampMinutes(Number(parsed.durations?.short) || DEFAULT_DURATIONS.short),
      long: clampMinutes(Number(parsed.durations?.long) || DEFAULT_DURATIONS.long),
    };
    const mode: PomodoroMode =
      parsed.mode === 'short' || parsed.mode === 'long' ? parsed.mode : 'focus';
    let state: PomodoroState = {
      ...fallback,
      mode,
      durations,
      running: parsed.running === true && typeof parsed.endAt === 'number',
      endAt: typeof parsed.endAt === 'number' ? parsed.endAt : null,
      remainingSec:
        typeof parsed.remainingSec === 'number' && parsed.remainingSec > 0
          ? Math.floor(parsed.remainingSec)
          : durationFor(mode, durations),
      focusCount: typeof parsed.focusCount === 'number' ? parsed.focusCount : 0,
      focusCountDate: typeof parsed.focusCountDate === 'string' ? parsed.focusCountDate : todayKey(),
      collapsed: parsed.collapsed !== false,
      pos:
        parsed.pos && typeof parsed.pos.x === 'number' && typeof parsed.pos.y === 'number'
          ? parsed.pos
          : null,
      autoStartNext: parsed.autoStartNext === true,
    };
    // A session that expired while the page was closed completes silently.
    while (state.running && state.endAt !== null && state.endAt <= Date.now()) {
      state = advanceSession({ ...state, autoStartNext: false });
    }
    if (state.running && state.endAt !== null) {
      state.remainingSec = Math.max(1, Math.ceil((state.endAt - Date.now()) / 1000));
    }
    return state;
  } catch {
    return fallback;
  }
};

const formatClock = (totalSec: number): string => {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Short two-tone chime via WebAudio — no asset needed, fails silently if the
// browser blocks audio.
const playChime = () => {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.28, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
    window.setTimeout(() => void ctx.close().catch(() => {}), 1200);
  } catch {
    /* audio unavailable — ignore */
  }
};

const notifySessionDone = (finishedMode: PomodoroMode, nextMode: PomodoroMode) => {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const body =
      finishedMode === 'focus'
        ? `Focus session done — time for a ${MODE_META[nextMode].label.toLowerCase()}.`
        : 'Break over — ready for the next focus session.';
    new Notification('Focus timer complete', { body });
  } catch {
    /* notifications unavailable — ignore */
  }
};

export const PomodoroTimer: React.FC = () => {
  const [st, setSt] = useState<PomodoroState>(loadState);
  const [showSettings, setShowSettings] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  // Suppresses the pill's click-to-expand right after a drag ends.
  const justDraggedRef = useRef(false);
  const baseTitleRef = useRef(typeof document !== 'undefined' ? document.title : '');

  // Persist everything on change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch {
      /* quota / privacy mode — timer still works for this tab */
    }
  }, [st]);

  // Countdown tick — recompute from wall clock so it can't drift.
  useEffect(() => {
    if (!st.running || st.endAt === null) return;
    const tick = () => {
      setSt(prev => {
        if (!prev.running || prev.endAt === null) return prev;
        const remaining = Math.ceil((prev.endAt - Date.now()) / 1000);
        if (remaining <= 0) {
          const next = advanceSession(prev);
          playChime();
          notifySessionDone(prev.mode, next.mode);
          return next;
        }
        return remaining === prev.remainingSec ? prev : { ...prev, remainingSec: remaining };
      });
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [st.running, st.endAt]);

  // Mirror the countdown into the tab title while running.
  useEffect(() => {
    const base = baseTitleRef.current;
    if (st.running) {
      document.title = `${formatClock(st.remainingSec)} · ${MODE_META[st.mode].label} · ${base}`;
    } else {
      document.title = base;
    }
    return () => {
      document.title = base;
    };
  }, [st.running, st.remainingSec, st.mode]);

  // Keep the widget on-screen if the window shrinks.
  useEffect(() => {
    const onResize = () => {
      setSt(prev => {
        if (!prev.pos) return prev;
        const el = widgetRef.current;
        const w = el ? el.offsetWidth : 220;
        const h = el ? el.offsetHeight : 60;
        const x = Math.min(Math.max(prev.pos.x, EDGE_MARGIN), Math.max(EDGE_MARGIN, window.innerWidth - w - EDGE_MARGIN));
        const y = Math.min(Math.max(prev.pos.y, EDGE_MARGIN), Math.max(EDGE_MARGIN, window.innerHeight - h - EDGE_MARGIN));
        if (x === prev.pos.x && y === prev.pos.y) return prev;
        return { ...prev, pos: { x, y } };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const totalSec = durationFor(st.mode, st.durations);
  const progress = totalSec > 0 ? Math.min(1, Math.max(0, 1 - st.remainingSec / totalSec)) : 0;

  const start = () => {
    // Ask once for notification permission the first time the timer starts.
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    } catch {
      /* ignore */
    }
    setSt(prev => {
      if (prev.running) return prev;
      const remaining = prev.remainingSec > 0 ? prev.remainingSec : durationFor(prev.mode, prev.durations);
      return { ...prev, running: true, endAt: Date.now() + remaining * 1000, remainingSec: remaining };
    });
  };

  const pause = () => {
    setSt(prev => {
      if (!prev.running || prev.endAt === null) return prev;
      const remaining = Math.max(1, Math.ceil((prev.endAt - Date.now()) / 1000));
      return { ...prev, running: false, endAt: null, remainingSec: remaining };
    });
  };

  const reset = () => {
    setSt(prev => ({
      ...prev,
      running: false,
      endAt: null,
      remainingSec: durationFor(prev.mode, prev.durations),
    }));
  };

  const skip = () => {
    setSt(prev => advanceSession({ ...prev, autoStartNext: false }));
  };

  const switchMode = (mode: PomodoroMode) => {
    setSt(prev => {
      if (prev.mode === mode) return prev;
      return {
        ...prev,
        mode,
        running: false,
        endAt: null,
        remainingSec: durationFor(mode, prev.durations),
      };
    });
  };

  const setDuration = (mode: PomodoroMode, minutes: number) => {
    if (!Number.isFinite(minutes)) return;
    const clamped = clampMinutes(minutes);
    setSt(prev => {
      const durations = { ...prev.durations, [mode]: clamped };
      // Re-prime the countdown only when the edited mode is current and idle.
      const isIdleCurrent =
        prev.mode === mode &&
        !prev.running &&
        prev.remainingSec === durationFor(prev.mode, prev.durations);
      return {
        ...prev,
        durations,
        remainingSec: isIdleCurrent ? clamped * 60 : prev.remainingSec,
      };
    });
  };

  const setFocusPreset = (minutes: (typeof FOCUS_PRESETS)[number]) => {
    setSt(prev => {
      if (prev.running || prev.durations.focus === minutes) return prev;
      return {
        ...prev,
        durations: { ...prev.durations, focus: minutes },
        remainingSec: prev.mode === 'focus' ? minutes * 60 : prev.remainingSec,
        endAt: null,
      };
    });
  };

  // ---------------- Drag handling ----------------
  const onDragPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const el = widgetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    const x = Math.min(
      Math.max(drag.origX + dx, EDGE_MARGIN),
      Math.max(EDGE_MARGIN, window.innerWidth - drag.width - EDGE_MARGIN),
    );
    const y = Math.min(
      Math.max(drag.origY + dy, EDGE_MARGIN),
      Math.max(EDGE_MARGIN, window.innerHeight - drag.height - EDGE_MARGIN),
    );
    setSt(prev => ({ ...prev, pos: { x, y } }));
  };

  const onDragPointerEnd = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.moved) {
      justDraggedRef.current = true;
      window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 150);
    }
    dragRef.current = null;
  };

  const positionStyle: React.CSSProperties = st.pos
    ? { left: st.pos.x, top: st.pos.y }
    : { left: 22, bottom: 22 };

  const meta = MODE_META[st.mode];
  const countToday = st.focusCountDate === todayKey() ? st.focusCount : 0;
  // Dots show progress within the current 4-session cycle; a just-finished
  // cycle shows all 4 filled rather than snapping back to 0.
  const dotsFilled =
    countToday > 0 && countToday % SESSIONS_PER_LONG_BREAK === 0
      ? SESSIONS_PER_LONG_BREAK
      : countToday % SESSIONS_PER_LONG_BREAK;
  const cycleDots = Array.from({ length: SESSIONS_PER_LONG_BREAK }, (_, i) => i < dotsFilled);

  // ---------------- Collapsed pill ----------------
  if (st.collapsed) {
    return (
      <div
        ref={widgetRef}
        className={`pomo-pill pomo-mode-${st.mode} ${st.running ? 'pomo-running' : ''}`}
        style={positionStyle}
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerEnd}
        onPointerCancel={onDragPointerEnd}
        onClick={() => {
          if (justDraggedRef.current) return;
          setSt(prev => ({ ...prev, collapsed: false }));
        }}
        role="button"
        aria-label={`Focus timer — ${meta.label}, ${formatClock(st.remainingSec)}${st.running ? ', running' : ', paused'}. Click to expand, drag to move.`}
        title="Click to expand · drag to move"
      >
        <span className="pomo-pill-time">{formatClock(st.remainingSec)}</span>
        <button
          className="pomo-pill-action"
          onClick={(e) => {
            e.stopPropagation();
            if (st.running) pause();
            else start();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title={st.running ? 'Pause' : 'Start'}
          aria-label={st.running ? 'Pause timer' : 'Start timer'}
        >
          {st.running ? '⏸' : '▶'}
        </button>
        <span className="pomo-pill-progress" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
      </div>
    );
  }

  // ---------------- Expanded card ----------------
  return (
    <div
      ref={widgetRef}
      className={`pomo-card pomo-mode-${st.mode}`}
      style={positionStyle}
      role="dialog"
      aria-label="Focus timer"
    >
      <div
        className="pomo-card-header"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerEnd}
        onPointerCancel={onDragPointerEnd}
        title="Drag to move"
      >
        <span className="pomo-card-grip" aria-hidden="true">⋮⋮</span>
        <span className="pomo-card-title">Focus Timer</span>
        <div className="pomo-card-header-btns">
          <button
            className="pomo-icon-btn"
            onClick={() => setShowSettings(s => !s)}
            onPointerDown={(e) => e.stopPropagation()}
            title="Timer settings"
            aria-label="Timer settings"
            aria-expanded={showSettings}
          >
            ⚙
          </button>
          <button
            className="pomo-icon-btn"
            onClick={() => {
              setShowSettings(false);
              setSt(prev => ({ ...prev, collapsed: true }));
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Minimize to pill"
            aria-label="Minimize timer"
          >
            —
          </button>
        </div>
      </div>

      <div className="pomo-schedule" role="group" aria-label="Work session length">
        <span className="pomo-schedule-label">Work length</span>
        <div className="pomo-schedule-options">
          {FOCUS_PRESETS.map(minutes => (
            <button
              key={minutes}
              type="button"
              className={`pomo-schedule-btn ${st.durations.focus === minutes ? 'active' : ''}`}
              onClick={() => setFocusPreset(minutes)}
              disabled={st.running}
              aria-pressed={st.durations.focus === minutes}
              title={st.running ? 'Pause the timer to change work length' : `${minutes}-minute work block`}
            >
              {minutes}
              <span>min</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pomo-mode-tabs" role="tablist" aria-label="Session type">
        {(Object.keys(MODE_META) as PomodoroMode[]).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={st.mode === m}
            className={`pomo-mode-tab ${st.mode === m ? 'active' : ''}`}
            onClick={() => switchMode(m)}
          >
            {MODE_META[m].label}
          </button>
        ))}
      </div>

      <div className="pomo-clock-wrap">
        <svg className="pomo-ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="pomo-ring-track" cx="60" cy="60" r="52" />
          <circle
            className="pomo-ring-fill"
            cx="60"
            cy="60"
            r="52"
            strokeDasharray={2 * Math.PI * 52}
            strokeDashoffset={2 * Math.PI * 52 * progress}
          />
        </svg>
        <div className="pomo-clock">
          <div className="pomo-clock-time" aria-live="off">{formatClock(st.remainingSec)}</div>
          <div className="pomo-clock-mode">{meta.label}</div>
        </div>
      </div>

      <div className="pomo-controls">
        <button className="pomo-ctl-btn" onClick={reset} title="Reset session" aria-label="Reset session">↺</button>
        <button
          className="pomo-ctl-btn pomo-ctl-primary"
          onClick={st.running ? pause : start}
          title={st.running ? 'Pause' : 'Start'}
          aria-label={st.running ? 'Pause timer' : 'Start timer'}
        >
          {st.running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button className="pomo-ctl-btn" onClick={skip} title="Skip to next session" aria-label="Skip to next session">⏭</button>
      </div>

      <div className="pomo-footer">
        <div className="pomo-cycles" title={`${countToday} focus sessions completed today`}>
          {cycleDots.map((filled, i) => (
            <span key={i} className={`pomo-cycle-dot ${filled ? 'filled' : ''}`} aria-hidden="true" />
          ))}
          <span className="pomo-cycles-label">{countToday} today</span>
        </div>
        <label className="pomo-autostart">
          <input
            type="checkbox"
            checked={st.autoStartNext}
            onChange={(e) => setSt(prev => ({ ...prev, autoStartNext: e.target.checked }))}
          />
          Auto-start next
        </label>
      </div>

      {showSettings && (
        <div className="pomo-settings">
          <div className="pomo-settings-heading">Custom durations</div>
          {(Object.keys(MODE_META) as PomodoroMode[]).map(m => (
            <label key={m} className="pomo-setting-row">
              <span>{MODE_META[m].label}</span>
              <span className="pomo-setting-input-wrap">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={st.durations[m]}
                  disabled={st.running}
                  title={st.running ? 'Pause the timer to edit durations' : undefined}
                  onChange={(e) => {
                    // Ignore a cleared field so backspacing doesn't snap to 1min.
                    if (e.target.value === '') return;
                    setDuration(m, Number(e.target.value));
                  }}
                />
                min
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
