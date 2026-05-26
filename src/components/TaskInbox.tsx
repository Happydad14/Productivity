import React, { useState } from 'react';

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
      <div className={`inbox-panel ${isOpen ? 'inbox-panel-open' : ''}`} aria-hidden={!isOpen}>
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
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', item);
                  e.dataTransfer.effectAllowed = 'copy';
                  setDraggingIdx(idx);
                }}
                onDragEnd={() => setDraggingIdx(null)}
                title="Drag into a bucket"
              >
                <span className="inbox-chip-grip" aria-hidden="true">⋮⋮</span>
                <span className="inbox-chip-text">{item}</span>
                <button
                  className="inbox-chip-delete"
                  onClick={() => deleteItem(idx)}
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
