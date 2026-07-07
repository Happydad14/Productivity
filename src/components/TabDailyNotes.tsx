import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GlassCard } from './GlassCard';

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

interface TabDailyNotesProps {
  // Shared, cloud-synced date→content map (owned by App, persisted + synced there).
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const TabDailyNotes: React.FC<TabDailyNotesProps> = ({ notes, setNotes }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try { return localStorage.getItem(CURRENT_DATE_KEY) ?? todayKey(); } catch { return todayKey(); }
  });

  const [draft, setDraft] = useState<string>(() => notes[selectedDate] ?? '');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const lastCommittedRef = useRef<string>(notes[selectedDate] ?? '');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest draft + the date it belongs to, readable from cleanups/effects
  // without stale closures — used to flush un-debounced edits.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const prevDateRef = useRef(selectedDate);

  const today = todayKey();
  const weekKeys = useMemo(() => getWeekKeys(selectedDate), [selectedDate]);

  // Streak: consecutive days with notes ending today — derived from shared state.
  const streak = useMemo(() => {
    let count = 0;
    let key = today;
    while (notes[key]?.trim() && count <= 3650) {
      count++;
      key = shiftDate(key, -1);
    }
    return count;
  }, [notes, today]);

  // Which days in the visible week have content (drives the dots).
  const weekDots = useMemo(
    () => Object.fromEntries(weekKeys.map(k => [k, !!notes[k]?.trim()])),
    [weekKeys, notes],
  );

  // Persist the selected date (device-local UI state — intentionally not synced).
  useEffect(() => {
    try { localStorage.setItem(CURRENT_DATE_KEY, selectedDate); } catch { /* ignore */ }
  }, [selectedDate]);

  // Write `text` into the shared record for `date` (empty text deletes the day).
  const commitDraft = (date: string, text: string) => {
    setNotes(prev => {
      const next = { ...prev };
      if (text.trim()) next[date] = text;
      else delete next[date];
      return next;
    });
  };

  // Adopt the stored note for the selected day — on date change, or when a
  // remote sync brings in new content. Guarded against clobbering our own
  // just-committed write (incoming === lastCommitted) so typing is never lost.
  useEffect(() => {
    if (prevDateRef.current !== selectedDate) {
      // Navigating days: flush any edits still sitting in the 500ms debounce
      // for the day we're leaving, so fast prev/next clicks can't drop them.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (draftRef.current !== lastCommittedRef.current) {
        commitDraft(prevDateRef.current, draftRef.current);
      }
      prevDateRef.current = selectedDate;
      const incoming = notes[selectedDate] ?? '';
      setDraft(incoming);
      lastCommittedRef.current = incoming;
      setSaveState('idle');
      return;
    }
    const incoming = notes[selectedDate] ?? '';
    if (incoming !== lastCommittedRef.current) {
      setDraft(incoming);
      lastCommittedRef.current = incoming;
      setSaveState('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, notes]);

  // Debounced autosave into the shared record — App persists it to localStorage
  // and pushes it to the cloud, so notes reach every device.
  useEffect(() => {
    if (draft === lastCommittedRef.current) return;
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      lastCommittedRef.current = draft;
      commitDraft(selectedDate, draft);
      setSaveState('saved');
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
      savedFlashRef.current = setTimeout(() => setSaveState('idle'), 1500);
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [draft, selectedDate, setNotes]);

  // On unmount: clear timers, but FLUSH (not drop) an in-flight debounced
  // save — otherwise switching tabs within 500ms of typing loses it.
  // setNotes is a stable setter and the parent stays mounted, so this is safe.
  useEffect(() => () => {
    [saveTimerRef, savedFlashRef, copyTimerRef].forEach(r => {
      if (r.current) clearTimeout(r.current);
    });
    if (draftRef.current !== lastCommittedRef.current) {
      lastCommittedRef.current = draftRef.current;
      setNotes(prev => {
        const next = { ...prev };
        if (draftRef.current.trim()) next[prevDateRef.current] = draftRef.current;
        else delete next[prevDateRef.current];
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <div className="dn-subtitle">A dated scratchpad — one page per day, auto-saved and synced across your devices.</div>
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
