import React, { useState } from 'react';

export type GoalCategory = 'work' | 'career' | 'family' | 'health';
export type GoalTerm = 'medium' | 'long';

interface GoalsInboxProps {
  items: string[];
  setItems: React.Dispatch<React.SetStateAction<string[]>>;
  // Sends a single candidate into the matching goals bucket. The inbox
  // removes the item locally after calling this.
  onMove: (title: string, category: GoalCategory, term: GoalTerm) => void;
}

const CATEGORY_OPTIONS: { id: GoalCategory; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'career', label: 'Career' },
  { id: 'family', label: 'Home & Family' },
  { id: 'health', label: 'Health & Fitness' },
];

const TERM_OPTIONS: { id: GoalTerm; label: string }[] = [
  { id: 'medium', label: 'Medium Term' },
  { id: 'long', label: 'Long Term' },
];

/**
 * Freeform capture for goal ideas, mirroring the task inbox pattern.
 * Each line becomes a candidate chip; a destination Category + Term selector
 * sends candidates into the appropriate goals bucket via `onMove`.
 */
export const GoalsInbox: React.FC<GoalsInboxProps> = ({ items, setItems, onMove }) => {
  const [newItem, setNewItem] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [category, setCategory] = useState<GoalCategory>('work');
  const [term, setTerm] = useState<GoalTerm>('medium');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

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

  const saveItemEdit = (idx: number, newText: string) => {
    const trimmed = newText.trim();
    setEditingIdx(null);
    if (!trimmed) return;
    setItems(prev => prev.map((it, i) => (i === idx ? trimmed : it)));
  };

  const moveItem = (idx: number, direction: -1 | 1) => {
    setItems(prev => {
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const deleteItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Move a single candidate to the selected bucket, then drop it from the inbox.
  const moveToGoals = (idx: number) => {
    const title = items[idx]?.trim();
    if (!title) return;
    onMove(title, category, term);
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Move every candidate to the selected bucket and clear the inbox.
  const moveAllToGoals = () => {
    const toMove = items.map(s => s.trim()).filter(Boolean);
    if (toMove.length === 0) return;
    toMove.forEach(title => onMove(title, category, term));
    setItems([]);
  };

  const bulkCount = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0).length;

  return (
    <div className="goals-inbox">
      <div className="goals-inbox-header">
        <div className="goals-inbox-title">
          <span className="goals-inbox-icon">📥</span>
          <span>Goals Inbox</span>
          <span className="goals-inbox-count">{items.length}</span>
        </div>
        <button
          className="goals-inbox-mode-toggle"
          onClick={() => setBulkMode(!bulkMode)}
          title={bulkMode ? 'Single-add mode' : 'Bulk-paste mode'}
        >
          {bulkMode ? '↩ Single' : '⚡ Bulk'}
        </button>
      </div>

      <div className="goals-inbox-subtitle">
        Capture goal ideas here, pick a destination, then send them into a goals bucket.
      </div>

      {bulkMode ? (
        <div className="goals-inbox-bulk-form">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Paste goal ideas, one per line..."
            rows={4}
            className="goals-inbox-bulk-textarea"
          />
          <div className="goals-inbox-bulk-actions">
            <span className="goals-inbox-bulk-count">{bulkCount} ideas</span>
            <button onClick={addBulkItems} className="goals-inbox-add-btn">Add all</button>
          </div>
        </div>
      ) : (
        <div className="goals-inbox-add-row">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Type a goal idea and press Enter..."
            className="goals-inbox-add-input"
          />
          <button onClick={addItem} className="goals-inbox-add-btn" disabled={!newItem.trim()}>
            Add
          </button>
        </div>
      )}

      {/* Destination selector — applies to per-chip and "Move all" sends */}
      <div className="goals-inbox-destination">
        <span className="goals-inbox-destination-label">Move to →</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as GoalCategory)}
          className="goals-inbox-select"
          aria-label="Destination category"
        >
          {CATEGORY_OPTIONS.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <select
          value={term}
          onChange={(e) => setTerm(e.target.value as GoalTerm)}
          className="goals-inbox-select"
          aria-label="Destination term"
        >
          {TERM_OPTIONS.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        {items.length > 0 && (
          <button className="goals-inbox-moveall-btn" onClick={moveAllToGoals} title="Move all candidates to the selected bucket">
            Move all
          </button>
        )}
      </div>

      <div className="goals-inbox-list">
        {items.length === 0 ? (
          <div className="goals-inbox-empty">
            <span className="goals-inbox-empty-icon">✨</span>
            <span>No goal ideas captured yet. Add some above.</span>
          </div>
        ) : (
          items.map((item, idx) => (
            <div className="goals-inbox-chip" key={`${idx}-${item}`}>
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
                  className="goals-inbox-chip-edit-input"
                  autoFocus
                />
              ) : (
                <span
                  className="goals-inbox-chip-text"
                  onClick={() => {
                    setEditingIdx(idx);
                    setEditingText(item);
                  }}
                  title="Click to edit"
                >
                  {item}
                </span>
              )}
              <div className="goals-inbox-chip-actions">
                <button
                  className="goals-inbox-chip-move-arrow"
                  onClick={() => moveItem(idx, -1)}
                  disabled={idx === 0}
                  title="Move up"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  className="goals-inbox-chip-move-arrow"
                  onClick={() => moveItem(idx, 1)}
                  disabled={idx === items.length - 1}
                  title="Move down"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  className="goals-inbox-chip-send"
                  onClick={() => moveToGoals(idx)}
                  title="Move this idea to the selected goals bucket"
                >
                  → Goals
                </button>
                <button
                  className="goals-inbox-chip-delete"
                  onClick={() => deleteItem(idx)}
                  title="Remove from inbox"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
