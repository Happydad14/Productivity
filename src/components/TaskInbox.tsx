import React, { useRef, useState } from 'react';
import { attachTouchDrag } from '../touchDnd';
import { encodePayload } from '../dndPayload';

interface TaskInboxProps {
  items: string[];
  setItems: React.Dispatch<React.SetStateAction<string[]>>;
}

export const TaskInbox: React.FC<TaskInboxProps> = ({ items, setItems }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  // When a chip drag is in flight the panel slides off-screen so the user
  // can see (and drop onto) the columns underneath — Health & Fitness in
  // particular sits entirely behind the panel on widescreen.
  const [isDragHiding, setIsDragHiding] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Long-press to edit on touch (500ms, beats the 350ms drag pickup when held
  // on the text — stopPropagation keeps the chip body from also picking up
  // for drag from the same gesture).
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const recentTouchRef = useRef(false);

  const beginLongPressEdit = (idx: number, item: string) => (e: React.TouchEvent<HTMLElement>) => {
    e.stopPropagation();
    recentTouchRef.current = true;
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      longPressTimerRef.current = null;
      setEditingIdx(idx);
      setEditingText(item);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const endTextTouch = (e: React.TouchEvent<HTMLElement>) => {
    cancelLongPress();
    if (longPressFiredRef.current) e.preventDefault();
    setTimeout(() => {
      recentTouchRef.current = false;
    }, 700);
  };

  const saveItemEdit = (idx: number, newText: string) => {
    const trimmed = newText.trim();
    setEditingIdx(null);
    if (!trimmed) return;
    setItems(prev => prev.map((it, i) => (i === idx ? trimmed : it)));
  };

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    setItems(prev => [...prev, trimmed]);
    setNewItem('');
  };

  const addBulkItems = () => {
    const lines = bulkText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (lines.length === 0) return;
    setItems(prev => [...prev, ...lines]);
    setBulkText('');
    setBulkMode(false);
  };

  const deleteItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    if (items.length === 0) return;
    if (confirm(`Clear all ${items.length} inbox items?`)) {
      setItems([]);
    }
  };

  return (
    <>
      {/* Floating toggle button — always visible */}
      <button
        className={`inbox-fab ${isOpen ? 'inbox-fab-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Close inbox' : 'Open task inbox'}
        aria-label="Toggle task inbox"
      >
        <span className="inbox-fab-icon">{isOpen ? '✕' : '📥'}</span>
        {!isOpen && items.length > 0 && (
          <span className="inbox-fab-badge">{items.length}</span>
        )}
        {!isOpen && <span className="inbox-fab-label">Inbox</span>}
      </button>

      {/* Slide-in panel */}
      <div
        className={`inbox-panel ${isOpen ? 'inbox-panel-open' : ''} ${isDragHiding ? 'inbox-panel-drag-hide' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="inbox-panel-header">
          <div className="inbox-panel-title">
            <span className="inbox-panel-icon">📥</span>
            <span>Task Inbox</span>
            <span className="inbox-panel-count">{items.length}</span>
          </div>
          <button
            className="inbox-mode-toggle"
            onClick={() => setBulkMode(!bulkMode)}
            title={bulkMode ? 'Single-add mode' : 'Bulk-paste mode'}
          >
            {bulkMode ? '↩ Single' : '⚡ Bulk'}
          </button>
        </div>

        <div className="inbox-panel-subtitle">
          Capture freeform tasks here, then drag them into any bucket.
        </div>

        {bulkMode ? (
          <div className="inbox-bulk-form">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Paste tasks, one per line..."
              rows={5}
              className="inbox-bulk-textarea"
            />
            <div className="inbox-bulk-actions">
              <span className="inbox-bulk-count">
                {bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0).length} items
              </span>
              <button onClick={addBulkItems} className="inbox-add-btn">
                Add all
              </button>
            </div>
          </div>
        ) : (
          <div className="inbox-add-row">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              placeholder="Type a task and press Enter..."
              className="inbox-add-input"
            />
            <button
              onClick={addItem}
              className="inbox-add-btn"
              disabled={!newItem.trim()}
            >
              Add
            </button>
          </div>
        )}

        <div className="inbox-list">
          {items.length === 0 ? (
            <div className="inbox-empty">
              <div className="inbox-empty-icon">✨</div>
              <div className="inbox-empty-text">Inbox is empty.</div>
              <div className="inbox-empty-hint">
                Add tasks above, then drag them into Weekly / Monthly Priorities, Todos, or Goals.
              </div>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={`${idx}-${item}`}
                className={`inbox-chip ${draggingIdx === idx ? 'inbox-chip-dragging' : ''}`}
                draggable={editingIdx !== idx}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'text/plain',
                    encodePayload({ kind: 'inbox', title: item, index: idx }),
                  );
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggingIdx(idx);
                  setIsDragHiding(true);
                }}
                onDragEnd={() => {
                  setDraggingIdx(null);
                  setIsDragHiding(false);
                }}
                onTouchStart={(e) => {
                  if (editingIdx === idx) return;
                  const touch = e.touches[0];
                  if (!touch) return;
                  attachTouchDrag(
                    encodePayload({ kind: 'inbox', title: item, index: idx }),
                    e.currentTarget,
                    touch,
                    {
                      onStart: () => {
                        setDraggingIdx(idx);
                        setIsDragHiding(true);
                      },
                      onEnd: () => {
                        setDraggingIdx(null);
                        setIsDragHiding(false);
                      },
                    },
                  );
                }}
                title={editingIdx === idx ? '' : 'Click text to edit · drag chip to a bucket'}
              >
                <span className="inbox-chip-grip" aria-hidden="true">⋮⋮</span>
                {editingIdx === idx ? (
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveItemEdit(idx, editingText);
                      if (e.key === 'Escape') setEditingIdx(null);
                    }}
                    onBlur={() => saveItemEdit(idx, editingText)}
                    onClick={(e) => e.stopPropagation()}
                    className="edit-task-inline-input inbox-chip-edit-input"
                    autoFocus
                  />
                ) : (
                  <span
                    className="inbox-chip-text"
                    onClick={() => {
                      if (recentTouchRef.current) return;
                      setEditingIdx(idx);
                      setEditingText(item);
                    }}
                    onTouchStart={beginLongPressEdit(idx, item)}
                    onTouchEnd={endTextTouch}
                    onTouchMove={cancelLongPress}
                    onTouchCancel={cancelLongPress}
                    title="Click (desktop) or long-press (touch) to edit"
                  >
                    {item}
                  </span>
                )}
                <button
                  className="inbox-chip-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(idx);
                  }}
                  title="Remove from inbox"
                  aria-label="Delete inbox item"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="inbox-footer">
            <button onClick={clearAll} className="inbox-clear-all">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Backdrop for click-outside-to-close on mobile */}
      {isOpen && (
        <div
          className="inbox-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};
