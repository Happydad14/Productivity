import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GlassCard } from './GlassCard';

const NOTES_PREFIX = 'xp_daily_notes_';
const CURRENT_DATE_KEY = 'xp_daily_notes_current_date';
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(key: string): string {
  const [yyyy, mm, dd] = key.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function shiftDate(key: string, delta: number): string {
  const [yyyy, mm, dd] = key.split('-').map(Number);
  const d = new Date(yyyy, mm - 1, dd + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekKeys(anchorKey: string): string[] {
  const [yyyy, mm, dd] = anchorKey.split('-').map(Number);
  const dow = new Date(yyyy, mm - 1, dd).getDay(); // 0 = Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(yyyy, mm - 1, dd + mondayOffset + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

function readNote(key: string): string {
  try { return localStorage.getItem(NOTES_PREFIX + key) ?? ''; } catch { return ''; }
}

function writeNote(key: string, content: string): void {
  try {
    if (content.trim()) localStorage.setItem(NOTES_PREFIX + key, content);
    else localStorage.removeItem(NOTES_PREFIX + key);
  } catch { /* quota exceeded or private mode */ }
}

function computeStreak(): number {
  let streak = 0;
  let key = todayKey();
  while (readNote(key).trim() && streak <= 3650) {
    streak++;
    key = shiftDate(key, -1);
  }
  return streak;
}

export const TabDailyNotes: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try { return localStorage.getItem(CURRENT_DATE_KEY) ?? todayKey(); } catch { return todayKey(); }
  });

  const [draft, setDraft] = useState(() => readNote(selectedDate));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [streak, setStreak] = useState(computeStreak);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const lastCommittedRef = useRef(readNote(selectedDate));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = todayKey();
  const weekKeys = useMemo(() => getWeekKeys(selectedDate), [selectedDate]);
  const [weekDots, setWeekDots] = useState<Record<string, boolean>>({});

  const refreshDots = useCallback((keys: string[]) => {
    setWeekDots(Object.fromEntries(keys.map(k => [k, !!readNote(k).trim()])));
  }, []);

  // Load note when date changes
  useEffect(() => {
    const note = readNote(selectedDate);
    setDraft(note);
    lastCommittedRef.current = note;
    setSaveState('idle');
    try { localStorage.setItem(CURRENT_DATE_KEY, selectedDate); } catch { /* ignore */ }
  }, [selectedDate]);

  // Refresh week dots when week changes
  useEffect(() => { refreshDots(weekKeys); }, [weekKeys, refreshDots]);

  // Debounced autosave
  useEffect(() => {
    if (draft === lastCommittedRef.current) return;
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      lastCommittedRef.current = draft;
      writeNote(selectedDate, draft);
      setSaveState('saved');
      setStreak(computeStreak());
      refreshDots(weekKeys);
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
      savedFlashRef.current = setTimeout(() => setSaveState('idle'), 1500);
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [draft, selectedDate, weekKeys, refreshDots]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    [saveTimerRef, savedFlashRef, copyTimerRef].forEach(r => {
      if (r.current) clearTimeout(r.current);
    });
  }, []);

  const navigate = (delta: number) => setSelectedDate(prev => shiftDate(prev, delta));

  const handleCopy = async () => {
    if (!draft.trim()) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopyMsg('Copied!');
    } catch {
      setCopyMsg('Failed');
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyMsg(null), 1600);
  };

  const isToday = selectedDate === today;

  return (
    <div className="daily-notes-tab">
      {/* Header */}
      <GlassCard className="daily-notes-header-card">
        <div className="daily-notes-header-content">
          <div>
            <div className="dn-title">Daily Notes</div>
            <div className="dn-subtitle">A dated scratchpad — one page per day, auto-saved as you type.</div>
          </div>
          <div className="daily-notes-header-meta">
            {streak > 0 && (
              <span
                className="daily-notes-streak"
                title={`${streak} consecutive day${streak !== 1 ? 's' : ''} with notes ending today`}
              >
                🔥 {streak}-day streak
              </span>
            )}
            <span className={`freeform-save-indicator save-${saveState}`}>
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Auto-saves'}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Date navigation + week strip */}
      <GlassCard className="daily-notes-nav-card">
        <div className="daily-notes-nav">
          <button className="daily-notes-nav-btn" onClick={() => navigate(-1)} title="Previous day">
            ← Prev
          </button>
          <div className="daily-notes-date-center">
            <span className="daily-notes-date-label">{formatDisplayDate(selectedDate)}</span>
            <input
              type="date"
              className="daily-notes-date-input"
              value={selectedDate}
              onChange={e => { if (e.target.value) setSelectedDate(e.target.value); }}
              title="Jump to a specific date"
            />
          </div>
          <button className="daily-notes-nav-btn" onClick={() => navigate(1)} title="Next day">
            Next →
          </button>
          {!isToday && (
            <button className="daily-notes-today-btn" onClick={() => setSelectedDate(today)}>
              Today
            </button>
          )}
        </div>

        <div className="daily-notes-week-strip">
          {weekKeys.map((key, i) => (
            <button
              key={key}
              className={[
                'daily-notes-week-day',
                key === selectedDate ? 'selected' : '',
                key === today ? 'is-today' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelectedDate(key)}
              title={formatDisplayDate(key)}
            >
              <span className="daily-notes-week-label">{DAY_LABELS[i]}</span>
              <span className="daily-notes-week-num">{parseInt(key.split('-')[2], 10)}</span>
              <span className={`daily-notes-week-dot${weekDots[key] ? ' has-note' : ''}`} />
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Editor */}
      <GlassCard className="daily-notes-editor-card">
        <div className="daily-notes-editor-header">
          <span className="daily-notes-editor-label">
            {isToday ? 'Today' : formatDisplayDate(selectedDate)}
          </span>
          <button
            className="daily-notes-copy-btn"
            onClick={handleCopy}
            disabled={!draft.trim()}
            title="Copy all notes for this day to clipboard"
          >
            {copyMsg ?? '⎘ Copy'}
          </button>
        </div>
        <textarea
          className="daily-notes-editor"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={
            isToday
              ? "What's on your mind today? Tasks, ideas, notes…"
              : `Notes for ${formatDisplayDate(selectedDate)}…`
          }
          spellCheck
          autoFocus={isToday}
        />
      </GlassCard>
    </div>
  );
};
