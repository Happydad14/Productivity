import React, { useEffect, useRef, useState } from 'react';
import { GlassCard } from './GlassCard';

interface TabFreeformProps {
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  // Append one entry per line to the relevant inbox.
  onSendToTaskInbox: (lines: string[]) => void;
  onSendToGoalsInbox: (lines: string[]) => void;
}

type InboxTarget = 'task' | 'goals';

interface MenuState {
  x: number;
  y: number;
  text: string;
  mode: 'popup' | 'sheet';
}

/**
 * Evernote-style free writing space. A large autosaving textarea (debounced
 * 500ms) plus two ways to push text into the task/goals inboxes:
 *   - select text → right-click (desktop) / long-press (touch) → menu
 *   - per-line send buttons in the side rail
 * Sent text stays in the document as a reference.
 */
export const TabFreeform: React.FC<TabFreeformProps> = ({
  content,
  setContent,
  onSendToTaskInbox,
  onSendToGoalsInbox,
}) => {
  // Local draft so keystrokes don't re-render the whole app; committed to the
  // parent (which persists to localStorage + cloud) after a 500ms pause.
  const [draft, setDraft] = useState(content);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastCommittedRef = useRef(content);
  // Latest draft, readable from the unmount cleanup without stale closures.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull in external changes (e.g. cloud sync from another device) without
  // clobbering whatever is being typed locally.
  useEffect(() => {
    if (content !== draft && content !== lastCommittedRef.current) {
      setDraft(content);
      lastCommittedRef.current = content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Debounced commit to parent state.
  useEffect(() => {
    if (draft === lastCommittedRef.current) return;
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      lastCommittedRef.current = draft;
      setContent(draft);
      setSaveState('saved');
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
      savedFlashRef.current = setTimeout(() => setSaveState('idle'), 1500);
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [draft, setContent]);

  // On unmount: clear pending timers, but FLUSH (not drop) an in-flight
  // debounced save — otherwise switching tabs within 500ms of the last
  // keystroke silently loses it. setContent is a stable useState setter,
  // and the parent stays mounted, so committing here is safe.
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (longPressRef.current) clearTimeout(longPressRef.current);
    if (draftRef.current !== lastCommittedRef.current) {
      lastCommittedRef.current = draftRef.current;
      setContent(draftRef.current);
    }
  }, [setContent]);

  // Dismiss the context menu on any outside interaction / scroll / escape.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1600);
  };

  const sendText = (raw: string, target: InboxTarget) => {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    if (target === 'task') onSendToTaskInbox(lines);
    else onSendToGoalsInbox(lines);
    showToast(`Added to ${target === 'task' ? 'Task' : 'Goals'} Inbox`);
    setMenu(null);
  };

  // Returns the selected text, or — if there's no selection — the whole line
  // the caret sits on. Lets right-click/long-press work without selecting.
  const getContextText = (): string => {
    const ta = textareaRef.current;
    if (!ta) return '';
    const { selectionStart, selectionEnd, value } = ta;
    if (selectionStart !== selectionEnd) {
      return value.slice(selectionStart, selectionEnd);
    }
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = value.indexOf('\n', selectionStart);
    if (lineEnd === -1) lineEnd = value.length;
    return value.slice(lineStart, lineEnd);
  };

  const openMenu = (x: number, y: number, mode: 'popup' | 'sheet') => {
    const text = getContextText().trim();
    if (!text) {
      showToast('Nothing to send — place the cursor on a line or select text');
      return;
    }
    setMenu({ x, y, text, mode });
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY, 'popup');
  };

  // Long-press → bottom sheet on touch devices.
  const handleTouchStart = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null;
      openMenu(0, 0, 'sheet');
    }, 550);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const lines = draft.split('\n');
  const nonEmptyLineCount = lines.filter(l => l.trim().length > 0).length;

  return (
    <div className="freeform-tab">
      <GlassCard className="freeform-header-card">
        <div className="freeform-header-content">
          <div>
            <div className="title">Freeform Notes</div>
            <div className="subtitle">
              A space to think out loud. Select text and right-click (or long-press on touch),
              or use the line buttons, to send anything to an inbox.
            </div>
          </div>
          <span className={`freeform-save-indicator save-${saveState}`}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Auto-saves'}
          </span>
        </div>
      </GlassCard>

      <div className="freeform-body">
        <GlassCard className="freeform-editor-card">
          <textarea
            ref={textareaRef}
            className="freeform-editor"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
            onTouchCancel={cancelLongPress}
            placeholder="Start writing anything…&#10;&#10;Tip: right-click a selection, or hover a line in the rail, to send it to an inbox."
            spellCheck
          />
        </GlassCard>

        <GlassCard className="freeform-lines-card">
          <div className="freeform-lines-header">
            <span>Send a line</span>
            <span className="freeform-lines-count">{nonEmptyLineCount}</span>
          </div>
          <div className="freeform-lines-list">
            {nonEmptyLineCount === 0 ? (
              <div className="freeform-lines-empty">
                Lines you write appear here so you can flick them into an inbox.
              </div>
            ) : (
              lines.map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                return (
                  <div className="freeform-line-row" key={`${idx}-${line}`}>
                    <span className="freeform-line-text" title={trimmed}>{trimmed}</span>
                    <div className="freeform-line-actions">
                      <button
                        className="freeform-line-send"
                        onClick={() => sendText(trimmed, 'task')}
                        title="Send to Task Inbox"
                      >
                        → Task
                      </button>
                      <button
                        className="freeform-line-send"
                        onClick={() => sendText(trimmed, 'goals')}
                        title="Send to Goals Inbox"
                      >
                        → Goals
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      </div>

      {/* Selection context menu (desktop popup / mobile bottom sheet) */}
      {menu && (
        <>
          {menu.mode === 'sheet' && (
            <div className="freeform-sheet-backdrop" onMouseDown={() => setMenu(null)} />
          )}
          <div
            className={menu.mode === 'sheet' ? 'freeform-context-sheet' : 'freeform-context-menu'}
            style={menu.mode === 'popup'
              ? { top: Math.min(menu.y, window.innerHeight - 140), left: Math.min(menu.x, window.innerWidth - 220) }
              : undefined}
            // Keep clicks inside from bubbling up to the window "close" listener.
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="freeform-context-preview">"{menu.text.length > 60 ? menu.text.slice(0, 60) + '…' : menu.text}"</div>
            <button className="freeform-context-item" onClick={() => sendText(menu.text, 'task')}>
              📥 Send to Task Inbox
            </button>
            <button className="freeform-context-item" onClick={() => sendText(menu.text, 'goals')}>
              🎯 Send to Goals Inbox
            </button>
            {menu.mode === 'sheet' && (
              <button className="freeform-context-cancel" onClick={() => setMenu(null)}>
                Cancel
              </button>
            )}
          </div>
        </>
      )}

      {toast && <div className="freeform-toast">{toast}</div>}
    </div>
  );
};
