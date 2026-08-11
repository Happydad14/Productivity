import { useEffect, useState } from 'react';
import { LAST_EDIT } from '../appEdits';

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
 * Static one-line tagline under the header: when the app itself was last
 * changed and which model made the change. Commits with no model trailer
 * (human edits) show the timestamp alone.
 */
export function EditTicker() {
  // Only drives the "3 hours ago" label, so a one-minute tick is plenty.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(handle);
  }, []);

  const edit = LAST_EDIT;
  const at = edit ? new Date(edit.date) : null;
  if (!edit || !at || Number.isNaN(at.getTime())) return null;

  return (
    <p className="edit-ticker" title={edit.subject}>
      <span className="edit-ticker-label">Last edit</span>
      <time dateTime={edit.date}>{dateTimeFmt.format(at)}</time>
      {edit.model && (
        <>
          <span className="edit-ticker-sep">·</span>
          <span className="edit-ticker-model">{edit.model}</span>
        </>
      )}
      <span className="edit-ticker-sep">·</span>
      <span className="edit-ticker-ago">{formatRelative(edit.date, now)}</span>
    </p>
  );
}
