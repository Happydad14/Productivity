import { useEffect, useMemo, useState } from 'react';
import { APP_EDITS, BUILD_TIME } from '../appEdits';

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const relativeFmt = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

const formatAbsolute = (iso: string): string => {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? '' : dateTimeFmt.format(at);
};

const formatRelative = (iso: string, now: number): string => {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return '';
  const deltaSeconds = (at - now) / 1000;
  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (Math.abs(deltaSeconds) >= seconds) {
      return relativeFmt.format(Math.round(deltaSeconds / seconds), unit);
    }
  }
  return 'just now';
};

/**
 * Header strip showing when the app was last changed and by which model.
 * The most recent edit is pinned on the left so it is always readable; the
 * earlier history scrolls past it as a marquee (paused on hover, and
 * replaced by a plain scroll region under `prefers-reduced-motion`).
 */
export function EditTicker() {
  // Only drives the "3 hours ago" label, so a one-minute tick is plenty.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(handle);
  }, []);

  const edits = APP_EDITS;

  // Slower for longer histories so the reading speed stays constant
  // regardless of how much text is in the loop.
  const scrollSeconds = useMemo(() => {
    const characters = edits.reduce((total, edit) => total + edit.subject.length + 40, 0);
    return Math.min(240, Math.max(30, Math.round(characters / 5)));
  }, [edits]);

  const latest = edits[0];
  if (!latest) return null;

  const latestBy = latest.model ?? latest.author;

  return (
    <div className="edit-ticker">
      <span
        className="edit-ticker-badge"
        title={BUILD_TIME ? `Build deployed ${formatAbsolute(BUILD_TIME)}` : undefined}
      >
        <span className="edit-ticker-pulse" />
        Last edit
      </span>

      <span className="edit-ticker-latest" title={latest.subject}>
        <time dateTime={latest.date}>{formatAbsolute(latest.date)}</time>
        <span className="edit-ticker-sep">·</span>
        <span className="edit-ticker-model">{latestBy}</span>
        <span className="edit-ticker-ago">{formatRelative(latest.date, now)}</span>
      </span>

      <div className="edit-ticker-viewport">
        {/* Two identical sequences make the translate(-50%) loop seamless. */}
        <div className="edit-ticker-track" style={{ animationDuration: `${scrollSeconds}s` }}>
          {[0, 1].map(copy => (
            <div className="edit-ticker-seq" key={copy} aria-hidden={copy === 1}>
              {edits.map(edit => (
                <span className="edit-ticker-item" key={`${copy}-${edit.hash}`}>
                  <span className="edit-ticker-time">{formatAbsolute(edit.date)}</span>
                  <span className="edit-ticker-sep">·</span>
                  <span className="edit-ticker-model">{edit.model ?? edit.author}</span>
                  <span className="edit-ticker-sep">·</span>
                  <span className="edit-ticker-subject">{edit.subject}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
