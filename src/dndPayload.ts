// Structured drag payload so drop handlers know where the item came from
// and can move (not copy), remove from the source, or reorder.
// Encoded as `xp:` + JSON so HTML5 dataTransfer (`text/plain`) and the
// touch-DnD payload string can carry the same value end-to-end.

export type DndPayload =
  | { kind: 'inbox'; title: string; index: number }
  | { kind: 'task'; title: string; taskId: string }
  | { kind: 'priority'; title: string; list: 'week' | 'month'; index: number }
  | { kind: 'text'; title: string };

const PREFIX = 'xp:';

export function encodePayload(p: DndPayload): string {
  return PREFIX + JSON.stringify(p);
}

export function decodePayload(raw: string): DndPayload {
  if (raw.startsWith(PREFIX)) {
    try {
      const obj = JSON.parse(raw.slice(PREFIX.length));
      if (obj && typeof obj === 'object' && typeof obj.kind === 'string') {
        return obj as DndPayload;
      }
    } catch {
      /* fall through */
    }
  }
  // Legacy / external drops: treat as plain text title
  return { kind: 'text', title: raw };
}
