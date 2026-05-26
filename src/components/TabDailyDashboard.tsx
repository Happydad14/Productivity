import React, { useState } from 'react';
import { GlassCard } from './GlassCard';

export interface Task {
  id: string;
  title: string;
  category: 'work' | 'career' | 'family' | 'health';
  timeframe: 'target' | 'near' | 'medium-long';
  isCompleted: boolean;
  dateAdded: string; // MM/DD/YY
  dateCompleted?: string; // MM/DD/YY
  tier?: 'tier-1' | 'tier-2' | 'tier-3';
}

interface TabDailyDashboardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  prioritiesWeek: string[];
  setPrioritiesWeek: React.Dispatch<React.SetStateAction<string[]>>;
  prioritiesMonth: string[];
  setPrioritiesMonth: React.Dispatch<React.SetStateAction<string[]>>;
}

const CATEGORIES = [
  { id: 'work', label: 'Work', color: 'var(--color-work)', rgb: 'var(--color-work-rgb)' },
  { id: 'career', label: 'Career', color: 'var(--color-career)', rgb: 'var(--color-career-rgb)' },
  { id: 'family', label: 'Home & Family', color: 'var(--color-family)', rgb: 'var(--color-family-rgb)' },
  { id: 'health', label: 'Health & Fitness', color: 'var(--color-health)', rgb: 'var(--color-health-rgb)' },
] as const;

export const TabDailyDashboard: React.FC<TabDailyDashboardProps> = ({
  tasks,
  setTasks,
  prioritiesWeek,
  setPrioritiesWeek,
  prioritiesMonth,
  setPrioritiesMonth,
}) => {
  const [newTasks, setNewTasks] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState<{ index: number; type: 'week' | 'month' } | null>(null);

  const handleDrop = (e: React.DragEvent, index: number, type: 'week' | 'month') => {
    e.preventDefault();
    const title = e.dataTransfer.getData('text/plain');
    if (!title) return;
    handlePriorityChange(index, title, type);
  };
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Targets section editing states
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Bulk Evernote Import states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkCategory, setBulkCategory] = useState<'work' | 'career' | 'family' | 'health'>('work');
  const [bulkTimeframe, setBulkTimeframe] = useState<'target' | 'near' | 'medium-long'>('near');

  // Historical Completions sorting state
  const [sortBy, setSortBy] = useState<'title' | 'category' | 'dateAdded' | 'dateCompleted'>('dateCompleted');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'title' | 'category' | 'dateAdded' | 'dateCompleted') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to descending
    }
  };

  const saveTaskEdit = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: newTitle.trim() } : t));
    setEditingTaskId(null);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const cycleTaskTier = (taskId: string) => {
    setTasks(prev =>
      prev.map(task => {
        if (task.id === taskId) {
          const currentTier = task.tier || 'tier-2';
          let nextTier: 'tier-1' | 'tier-2' | 'tier-3' = 'tier-2';
          if (currentTier === 'tier-1') nextTier = 'tier-2';
          else if (currentTier === 'tier-2') nextTier = 'tier-3';
          else if (currentTier === 'tier-3') nextTier = 'tier-1';
          return { ...task, tier: nextTier };
        }
        return task;
      })
    );
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const todayStr = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    });

    const newTasksList: Task[] = lines.map(line => ({
      id: crypto.randomUUID(),
      title: line,
      category: bulkCategory,
      timeframe: bulkTimeframe,
      isCompleted: false,
      dateAdded: todayStr,
    }));

    setTasks(prev => [...prev, ...newTasksList]);
    setBulkText('');
    setIsImportOpen(false);
  };

  const toggleTask = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const isCompletedNow = !task.isCompleted;
          const todayStr = new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit',
          });
          return {
            ...task,
            isCompleted: isCompletedNow,
            dateCompleted: isCompletedNow ? todayStr : undefined,
          };
        }
        return task;
      })
    );
  };

  const handleToggleClick = (task: Task) => {
    if (task.isCompleted) {
      toggleTask(task.id);
      return;
    }

    // Trigger float-down animation delay
    setCompletingTaskId(task.id);
    setTimeout(() => {
      toggleTask(task.id);
      setCompletingTaskId(null);
    }, 450); // Matches CSS transition duration
  };

  const handleAddTask = (category: 'work' | 'career' | 'family' | 'health', timeframe: 'target' | 'near' | 'medium-long') => {
    const key = `${category}-${timeframe}`;
    const title = newTasks[key]?.trim();
    if (!title) return;

    const todayStr = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    });

    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      category,
      timeframe,
      isCompleted: false,
      dateAdded: todayStr,
    };

    setTasks(prev => [...prev, newTask]);
    setNewTasks(prev => ({ ...prev, [key]: '' }));
  };

  const handlePriorityChange = (index: number, val: string, type: 'week' | 'month') => {
    if (type === 'week') {
      const updated = [...prioritiesWeek];
      updated[index] = val;
      setPrioritiesWeek(updated);
    } else {
      const updated = [...prioritiesMonth];
      updated[index] = val;
      setPrioritiesMonth(updated);
    }
  };

  // Filter tasks into categories
  const activeTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);

  // Group today's completions (completed on current local date)
  const todayStr = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
  const completedToday = completedTasks.filter(t => t.dateCompleted === todayStr);

  // Search/Filter for historical completions
  const filteredHistory = completedTasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Sort historical completions
  filteredHistory.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'category') {
      // Sort by category label using CATEGORIES mapping
      const catA = CATEGORIES.find(c => c.id === a.category)?.label || '';
      const catB = CATEGORIES.find(c => c.id === b.category)?.label || '';
      comparison = catA.localeCompare(catB);
    } else if (sortBy === 'dateAdded') {
      const timeA = new Date(a.dateAdded).getTime() || 0;
      const timeB = new Date(b.dateAdded).getTime() || 0;
      comparison = timeA - timeB;
    } else if (sortBy === 'dateCompleted') {
      const timeA = new Date(a.dateCompleted || '').getTime() || 0;
      const timeB = new Date(b.dateCompleted || '').getTime() || 0;
      comparison = timeA - timeB;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const renderMiniCalendar = (monthOffset: number) => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthName = targetDate.toLocaleString('default', { month: 'short' });

    // First day and total days
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday, 6 is Saturday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }

    const weeks: (number | null)[][] = [];
    let tempWeek: (number | null)[] = [];
    days.forEach((day, idx) => {
      tempWeek.push(day);
      if (tempWeek.length === 7 || idx === days.length - 1) {
        while (tempWeek.length < 7) {
          tempWeek.push(null);
        }
        weeks.push(tempWeek);
        tempWeek = [];
      }
    });

    return (
      <div className="mini-calendar">
        <div className="mini-calendar-month-name">{monthName} {year}</div>
        <table className="mini-calendar-table">
          <thead>
            <tr>
              <th>S</th><th>M</th><th>T</th><th>W</th><th>T</th><th>F</th><th>S</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wIdx) => (
              <tr key={wIdx}>
                {week.map((day, dIdx) => {
                  const isCurrentToday = (
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear()
                  );
                  return (
                    <td 
                      key={dIdx} 
                      className={`${day ? 'active-day-cell' : 'empty-day-cell'} ${isCurrentToday ? 'today-highlight' : ''}`}
                    >
                      {day || ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTierIcon = (task: Task) => {
    if (task.category !== 'work' && task.category !== 'career') return null;
    const tier = task.tier || 'tier-2';

    if (task.category === 'work') {
      const bars = tier === 'tier-1' ? '❙' : tier === 'tier-2' ? '❙❙' : '❙❙❙';
      const label = tier === 'tier-1' ? 'Low' : tier === 'tier-2' ? 'Medium' : 'High';
      return (
        <span 
          className={`tier-icon work-tier ${tier}`} 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cycleTaskTier(task.id);
          }}
          title={`Work Priority: ${label}. Click to cycle.`}
        >
          {bars}
        </span>
      );
    } else {
      const stars = tier === 'tier-1' ? '✦' : tier === 'tier-2' ? '✦✦' : '✦✦✦';
      const label = tier === 'tier-1' ? 'Tier 1' : tier === 'tier-2' ? 'Tier 2' : 'Tier 3';
      return (
        <span 
          className={`tier-icon career-tier ${tier}`} 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cycleTaskTier(task.id);
          }}
          title={`Career Growth: ${label}. Click to cycle.`}
        >
          {stars}
        </span>
      );
    }
  };

  return (
    <div className="daily-dashboard">
      {/* Top Header & Priorities */}
      <div className="dashboard-top-grid">
        <GlassCard className="date-card header-glass">
          <div className="today-header-shrunk">
            <div className="today-title-shrunk">
              <span className="calendar-icon-shrunk">📅</span>
              <span className="today-date-text">
                Today: {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="mini-calendars-row">
              {renderMiniCalendar(0)}
              {renderMiniCalendar(1)}
            </div>
          </div>
        </GlassCard>

        {/* Bulk Import Trigger & Panel is placed outside the grid so it spans nicely, or we'll trigger it below the grid */}

        <GlassCard className="priorities-card header-glass">
          <div className="priority-header">TOP 5 PRIORITIES - THIS WEEK</div>
          <ol className="priority-list">
            {prioritiesWeek.map((p, idx) => {
              const isDragOver = dragOverIndex?.type === 'week' && dragOverIndex?.index === idx;
              return (
                <li
                  key={`week-${idx}`}
                  className={isDragOver ? 'drag-active-week' : ''}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setDragOverIndex({ index: idx, type: 'week' })}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => {
                    handleDrop(e, idx, 'week');
                    setDragOverIndex(null);
                  }}
                >
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => handlePriorityChange(idx, e.target.value, 'week')}
                    placeholder={`Priority ${idx + 1}...`}
                    className="priority-input"
                  />
                </li>
              );
            })}
          </ol>
        </GlassCard>

        <GlassCard className="priorities-card header-glass">
          <div className="priority-header">TOP 5 PRIORITIES - THIS MONTH</div>
          <ol className="priority-list">
            {prioritiesMonth.map((p, idx) => {
              const isDragOver = dragOverIndex?.type === 'month' && dragOverIndex?.index === idx;
              return (
                <li
                  key={`month-${idx}`}
                  className={isDragOver ? 'drag-active-month' : ''}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setDragOverIndex({ index: idx, type: 'month' })}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => {
                    handleDrop(e, idx, 'month');
                    setDragOverIndex(null);
                  }}
                >
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => handlePriorityChange(idx, e.target.value, 'month')}
                    placeholder={`Priority ${idx + 1}...`}
                    className="priority-input"
                  />
                </li>
              );
            })}
          </ol>
        </GlassCard>
      </div>

      {/* Bulk Import Button & Drawer */}
      <div className="bulk-import-container">
        <button 
          className={`bulk-import-toggle-btn ${isImportOpen ? 'active' : ''}`}
          onClick={() => setIsImportOpen(!isImportOpen)}
        >
          {isImportOpen ? '✕ Close Import Tool' : '⚡ Evernote / Text Bulk Import'}
        </button>

        {isImportOpen && (
          <GlassCard className="bulk-import-drawer">
            <div className="bulk-import-header">
              <div className="bulk-import-title">Evernote Bulk Import</div>
              <div className="bulk-import-subtitle">Paste your checklist items below (one item per line)</div>
            </div>

            <div className="bulk-import-form">
              <div className="bulk-import-controls">
                <div className="control-group">
                  <label>Destination Category</label>
                  <select 
                    value={bulkCategory} 
                    onChange={(e) => setBulkCategory(e.target.value as any)}
                    className="bulk-select"
                  >
                    <option value="work">Work</option>
                    <option value="career">Career</option>
                    <option value="family">Home & Family</option>
                    <option value="health">Health & Fitness</option>
                  </select>
                </div>

                <div className="control-group">
                  <label>Timeframe Section</label>
                  <select 
                    value={bulkTimeframe} 
                    onChange={(e) => setBulkTimeframe(e.target.value as any)}
                    className="bulk-select"
                  >
                    <option value="target">Targets (no checkboxes)</option>
                    <option value="near">Near Term</option>
                    <option value="medium-long">Medium / Long Term</option>
                  </select>
                </div>
              </div>

              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Example:&#10;Finalize weekly presentation&#10;Schedule dental cleaning&#10;Buy organic protein powder"
                rows={6}
                className="bulk-textarea"
              />

              <div className="bulk-import-actions">
                <span className="bulk-count-badge">
                  {bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0).length} items detected
                </span>
                <div className="action-buttons-group">
                  <button onClick={() => setBulkText('')} className="bulk-btn-clear">
                    Clear
                  </button>
                  <button onClick={handleBulkImport} className="bulk-btn-import">
                    Import Tasks
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* 4 Core Category Columns */}
      <div className="category-columns-grid">
        {CATEGORIES.map(cat => {
          const catTasks = activeTasks.filter(t => t.category === cat.id);
          const targets = catTasks.filter(t => t.timeframe === 'target');
          const nearTerm = catTasks.filter(t => t.timeframe === 'near');
          const mediumLong = catTasks.filter(t => t.timeframe === 'medium-long');

          return (
            <GlassCard key={cat.id} accentColor={cat.rgb} className="category-column">
              <div className="cat-column-header" style={{ color: cat.color }}>
                <span className="cat-label">{cat.label}</span>
              </div>

              {/* TARGETS SECTION */}
              <div className="task-section">
                <div className="task-section-title">TARGETS</div>
                <div className="task-list">
                  {targets.map(task => (
                    <div 
                      key={task.id} 
                      className={`task-item task-${task.category} target-item-row`}
                      draggable={editingTaskId !== task.id}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.title)}
                    >
                      {editingTaskId === task.id ? (
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTaskEdit(task.id, editingText);
                            if (e.key === 'Escape') setEditingTaskId(null);
                          }}
                          onBlur={() => saveTaskEdit(task.id, editingText)}
                          className="edit-task-inline-input"
                          autoFocus
                        />
                      ) : (
                        <div className="target-content-wrapper">
                          <div 
                            className="target-text-click-zone" 
                            onDoubleClick={() => {
                              setEditingTaskId(task.id);
                              setEditingText(task.title);
                            }}
                            title="Double-click to edit target"
                          >
                            <span className="task-text">{task.title}</span>
                            <span className="task-date">{task.dateAdded}</span>
                          </div>
                          <div className="target-actions">
                            <button 
                              className="task-edit-btn" 
                              onClick={() => {
                                setEditingTaskId(task.id);
                                setEditingText(task.title);
                              }} 
                              title="Edit Target"
                            >
                              ✎
                            </button>
                            <button 
                              className="task-delete-btn" 
                              onClick={() => deleteTask(task.id)} 
                              title="Delete Target"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="add-task-row">
                    <input
                      type="text"
                      placeholder="+ Add Target..."
                      value={newTasks[`${cat.id}-target`] || ''}
                      onChange={(e) => setNewTasks(prev => ({ ...prev, [`${cat.id}-target`]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask(cat.id, 'target')}
                      className="add-task-input"
                    />
                  </div>
                </div>
              </div>

              {/* NEAR TERM SECTION */}
              <div className="task-section">
                <div className="task-section-title">NEAR TERM</div>
                <div className="task-list">
                  {nearTerm.map(task => (
                    <div 
                      key={task.id} 
                      className={`task-item task-${task.category} ${completingTaskId === task.id ? 'task-item-completing' : ''}`}
                      draggable={true}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.title)}
                    >
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={task.isCompleted}
                          onChange={() => handleToggleClick(task)}
                        />
                        <span className="checkbox-custom" style={{ borderColor: cat.color }}></span>
                        {renderTierIcon(task)}
                        <div className="task-text-container">
                          <span className="task-text">{task.title}</span>
                          <span className="task-date">{task.dateAdded}</span>
                        </div>
                      </label>
                    </div>
                  ))}
                  <div className="add-task-row">
                    <input
                      type="text"
                      placeholder="+ Add Near Term..."
                      value={newTasks[`${cat.id}-near`] || ''}
                      onChange={(e) => setNewTasks(prev => ({ ...prev, [`${cat.id}-near`]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask(cat.id, 'near')}
                      className="add-task-input"
                    />
                  </div>
                </div>
              </div>

              {/* MEDIUM / LONG TERM SECTION */}
              <div className="task-section">
                <div className="task-section-title">MEDIUM / LONG TERM</div>
                <div className="task-list">
                  {mediumLong.map(task => (
                    <div 
                      key={task.id} 
                      className={`task-item task-${task.category} ${completingTaskId === task.id ? 'task-item-completing' : ''}`}
                      draggable={true}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.title)}
                    >
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={task.isCompleted}
                          onChange={() => handleToggleClick(task)}
                        />
                        <span className="checkbox-custom" style={{ borderColor: cat.color }}></span>
                        {renderTierIcon(task)}
                        <div className="task-text-container">
                          <span className="task-text">{task.title}</span>
                          <span className="task-date">{task.dateAdded}</span>
                        </div>
                      </label>
                    </div>
                  ))}
                  <div className="add-task-row">
                    <input
                      type="text"
                      placeholder="+ Add Med/Long..."
                      value={newTasks[`${cat.id}-medium-long`] || ''}
                      onChange={(e) => setNewTasks(prev => ({ ...prev, [`${cat.id}-medium-long`]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask(cat.id, 'medium-long')}
                      className="add-task-input"
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* COMPLETED TODAY horizontal row */}
      <GlassCard className="completed-today-card">
        <div className="completed-today-header">
          <span className="checkmark-icon">✓</span>
          <span className="title">COMPLETED TODAY</span>
          <span className="count-badge">{completedToday.length}</span>
        </div>
        <div className="completed-pills-row">
          {completedToday.length === 0 ? (
            <div className="no-completions-text">No tasks completed yet today. Check items off above!</div>
          ) : (
            completedToday.map(task => {
              const cat = CATEGORIES.find(c => c.id === task.category);
              return (
                <div key={task.id} className="completed-pill" style={{ borderLeft: `3px solid ${cat?.color || '#fff'}` }}>
                  <span className="pill-check">✓</span>
                  <span className="pill-title">{task.title}</span>
                  <span className="pill-category" style={{ color: cat?.color }}>{cat?.label}</span>
                  <span className="pill-date">{task.dateCompleted}</span>
                  <button className="pill-undo" onClick={() => toggleTask(task.id)} title="Undo Completion">⎌</button>
                </div>
              );
            })
          )}
        </div>
      </GlassCard>

      {/* ALL HISTORICAL COMPLETIONS table */}
      <GlassCard className="historical-completions-card">
        <div className="history-header">
          <div className="history-title-section">
            <span className="star-icon">★</span>
            <span className="title">ALL HISTORICAL COMPLETIONS</span>
            <span className="count-badge">{completedTasks.length}</span>
          </div>

          {/* Search and Filters */}
          <div className="history-filters">
            <input
              type="text"
              placeholder="Search completions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="category-select"
            >
              <option value="all">All Categories</option>
              <option value="work">Work</option>
              <option value="career">Career</option>
              <option value="family">Home & Family</option>
              <option value="health">Health & Fitness</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="completions-table">
            <thead>
              <tr>
                <th className="sortable-th" onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                  Task {sortBy === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="sortable-th" onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                  Category {sortBy === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="sortable-th" onClick={() => handleSort('dateAdded')} style={{ cursor: 'pointer' }}>
                  Added {sortBy === 'dateAdded' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="sortable-th" onClick={() => handleSort('dateCompleted')} style={{ cursor: 'pointer' }}>
                  Completed {sortBy === 'dateCompleted' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ width: '80px', textAlign: 'center' }}>Undo</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-table-row">
                    {completedTasks.length === 0 
                      ? 'No history found. Complete tasks to build your log!' 
                      : 'No items match your filter.'}
                  </td>
                </tr>
              ) : (
                filteredHistory.map(task => {
                  const cat = CATEGORIES.find(c => c.id === task.category);
                  return (
                    <tr key={task.id} className="history-row">
                      <td className="task-title-cell">✓ {task.title}</td>
                      <td>
                        <span 
                          className="table-cat-badge" 
                          style={{ color: cat?.color, backgroundColor: `rgba(${cat?.rgb || '255,255,255'}, 0.1)` }}
                        >
                          {cat?.label}
                        </span>
                      </td>
                      <td className="date-cell">{task.dateAdded}</td>
                      <td className="date-cell">{task.dateCompleted}</td>
                      <td className="undo-cell">
                        <button className="table-undo-btn" onClick={() => toggleTask(task.id)}>
                          Undo
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
