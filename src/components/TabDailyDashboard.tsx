import React, { useRef, useState } from 'react';
import { GlassCard } from './GlassCard';
import { TouchDropZone } from './TouchDropZone';
import { attachTouchDrag } from '../touchDnd';
import { encodePayload, decodePayload } from '../dndPayload';

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
  inboxTasks: string[];
  setInboxTasks: React.Dispatch<React.SetStateAction<string[]>>;
  layoutMode: '1x4' | '2x2';
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
  inboxTasks: _inboxTasks,
  setInboxTasks,
  layoutMode,
}) => {
  const [newTasks, setNewTasks] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState<{ index: number; type: 'week' | 'month' } | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<string | null>(null);
  const [dragOverRow, setDragOverRow] = useState<
    { category: 'work' | 'career' | 'family' | 'health'; timeframe: 'target' | 'near' | 'medium-long'; index: number } | null
  >(null);

  const handleBucketDrop = (
    raw: string,
    category: 'work' | 'career' | 'family' | 'health',
    timeframe: 'target' | 'near' | 'medium-long'
  ) => {
    setDragOverBucket(null);
    const payload = decodePayload(raw);
    const title = payload.title?.trim();
    if (!title) return;

    // Existing task being moved between buckets: update in place, don't copy.
    if (payload.kind === 'task') {
      setTasks(prev =>
        prev.map(t =>
          t.id === payload.taskId ? { ...t, category, timeframe } : t,
        ),
      );
      return;
    }

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

    // Drag came from the inbox: remove that entry. Match by index when it's
    // still valid (same title at that slot) so we don't trip on duplicates;
    // otherwise fall back to first title match.
    if (payload.kind === 'inbox') {
      setInboxTasks(prev => {
        if (prev[payload.index] === payload.title) {
          return prev.filter((_, i) => i !== payload.index);
        }
        const firstMatch = prev.indexOf(payload.title);
        return firstMatch === -1 ? prev : prev.filter((_, i) => i !== firstMatch);
      });
    }
  };

  // Drop fired by a per-row TouchDropZone inside a section. Places the dragged
  // task (or new inbox/text task) at a specific index within that section.
  // Falls through to bucket behavior (append + clear inbox) when called with
  // an out-of-range index.
  const handleRowDrop = (
    raw: string,
    category: 'work' | 'career' | 'family' | 'health',
    timeframe: 'target' | 'near' | 'medium-long',
    targetIndexInBucket: number,
  ) => {
    setDragOverRow(null);
    setDragOverBucket(null);
    const payload = decodePayload(raw);
    const title = payload.title?.trim();
    if (!title) return;

    if (payload.kind === 'task') {
      setTasks(prev => {
        const source = prev.find(t => t.id === payload.taskId);
        if (!source) return prev;
        const bucketWithSource = prev.filter(
          t => t.category === category && t.timeframe === timeframe,
        );
        const targetTask = bucketWithSource[targetIndexInBucket];
        if (targetTask?.id === source.id) return prev; // dropped on self
        const without = prev.filter(t => t.id !== source.id);
        const updated = { ...source, category, timeframe };
        if (!targetTask) {
          // Append to end of bucket (preserves global order for other buckets).
          let lastIdx = -1;
          for (let i = without.length - 1; i >= 0; i--) {
            if (
              without[i].category === category &&
              without[i].timeframe === timeframe
            ) {
              lastIdx = i;
              break;
            }
          }
          if (lastIdx === -1) return [...without, updated];
          return [
            ...without.slice(0, lastIdx + 1),
            updated,
            ...without.slice(lastIdx + 1),
          ];
        }
        const targetGlobalIdx = without.findIndex(t => t.id === targetTask.id);
        return [
          ...without.slice(0, targetGlobalIdx),
          updated,
          ...without.slice(targetGlobalIdx),
        ];
      });
      return;
    }

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

    setTasks(prev => {
      const bucket = prev.filter(
        t => t.category === category && t.timeframe === timeframe,
      );
      const targetTask = bucket[targetIndexInBucket];
      if (!targetTask) return [...prev, newTask];
      const targetGlobalIdx = prev.findIndex(t => t.id === targetTask.id);
      return [
        ...prev.slice(0, targetGlobalIdx),
        newTask,
        ...prev.slice(targetGlobalIdx),
      ];
    });

    if (payload.kind === 'inbox') {
      setInboxTasks(prev => {
        if (prev[payload.index] === payload.title) {
          return prev.filter((_, i) => i !== payload.index);
        }
        const firstMatch = prev.indexOf(payload.title);
        return firstMatch === -1 ? prev : prev.filter((_, i) => i !== firstMatch);
      });
    }
  };

  const handlePriorityDrop = (
    targetList: 'week' | 'month',
    targetIdx: number,
    raw: string,
  ) => {
    setDragOverIndex(null);
    const payload = decodePayload(raw);
    const title = payload.title?.trim();
    if (!title) return;

    // Priority → priority: reorder via splice/insert. Works within a list and
    // across week ↔ month.
    if (payload.kind === 'priority') {
      const padTo5 = (arr: string[]) => {
        while (arr.length < 5) arr.push('');
        arr.length = 5;
        return arr;
      };

      if (payload.list === targetList) {
        if (payload.index === targetIdx) return;
        const base = targetList === 'week' ? prioritiesWeek : prioritiesMonth;
        const arr = [...base];
        const [moved] = arr.splice(payload.index, 1);
        arr.splice(targetIdx, 0, moved);
        padTo5(arr);
        if (targetList === 'week') setPrioritiesWeek(arr);
        else setPrioritiesMonth(arr);
        return;
      }

      // Cross-list move
      const src = payload.list === 'week' ? [...prioritiesWeek] : [...prioritiesMonth];
      const dst = targetList === 'week' ? [...prioritiesWeek] : [...prioritiesMonth];
      src.splice(payload.index, 1);
      dst.splice(targetIdx, 0, payload.title);
      padTo5(src);
      padTo5(dst);
      if (payload.list === 'week') setPrioritiesWeek(src);
      else setPrioritiesMonth(src);
      if (targetList === 'week') setPrioritiesWeek(dst);
      else setPrioritiesMonth(dst);
      return;
    }

    // Inbox / task / text drop: set the slot to that title.
    handlePriorityChange(targetIdx, title, targetList);

    if (payload.kind === 'inbox') {
      setInboxTasks(prev => {
        if (prev[payload.index] === payload.title) {
          return prev.filter((_, i) => i !== payload.index);
        }
        const firstMatch = prev.indexOf(payload.title);
        return firstMatch === -1 ? prev : prev.filter((_, i) => i !== firstMatch);
      });
    }
  };
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Targets section editing states
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Long-press to edit on touch. The drag system already uses 350ms long-press;
  // this fires at 500ms, and stopPropagation on touchstart keeps a hold on text
  // from initiating a drag of the whole row (drag still works from blank area).
  // recentTouchRef lets the onClick handlers tell a real mouse click from the
  // synthetic click iOS fires after a tap — we suppress edit on the synthetic.
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const recentTouchRef = useRef(false);

  const beginLongPressEdit = (taskId: string, title: string) => (e: React.TouchEvent<HTMLElement>) => {
    e.stopPropagation();
    recentTouchRef.current = true;
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      longPressTimerRef.current = null;
      setEditingTaskId(taskId);
      setEditingText(title);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // When long-press already fired, suppress the trailing synthetic click so
  // the row's checkbox doesn't also flip. recentTouchRef stays true past
  // touchend so quick-tap clicks (which still fire) are also recognized.
  const endTextTouch = (e: React.TouchEvent<HTMLElement>) => {
    cancelLongPress();
    if (longPressFiredRef.current) {
      e.preventDefault();
    }
    setTimeout(() => {
      recentTouchRef.current = false;
    }, 700);
  };

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
    const target = tasks.find(t => t.id === id);
    const label = target ? `"${target.title}"` : 'this task';
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const setTaskTier = (taskId: string, tier: 'tier-1' | 'tier-2' | 'tier-3') => {
    setTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, tier } : task))
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

  // Tier→Priority mapping: tier-3 = P1 (top), tier-2 = P2 (mid), tier-1 = P3 (low)
  const tierToPriority = (tier?: 'tier-1' | 'tier-2' | 'tier-3'): 'P1' | 'P2' | 'P3' => {
    if (tier === 'tier-3') return 'P1';
    if (tier === 'tier-1') return 'P3';
    return 'P2';
  };
  const priorityToTier = (p: 'P1' | 'P2' | 'P3'): 'tier-1' | 'tier-2' | 'tier-3' => {
    if (p === 'P1') return 'tier-3';
    if (p === 'P3') return 'tier-1';
    return 'tier-2';
  };

  const renderTierIcon = (task: Task) => {
    if (task.category !== 'work' && task.category !== 'career') return null;
    const priority = tierToPriority(task.tier);
    const catClass = task.category === 'work' ? 'priority-pill-work' : 'priority-pill-career';

    return (
      <select
        className={`priority-pill ${catClass} priority-${priority.toLowerCase()}`}
        value={priority}
        onChange={(e) => setTaskTier(task.id, priorityToTier(e.target.value as 'P1' | 'P2' | 'P3'))}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        title="Set priority"
      >
        <option value="P1">P1</option>
        <option value="P2">P2</option>
        <option value="P3">P3</option>
      </select>
    );
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
          <div className="priority-header">TOP 5 PRIORITIES - THIS WEEK <span className="priority-hint">(drag tasks here)</span></div>
          <ol className="priority-list">
            {prioritiesWeek.map((p, idx) => {
              const isDragOver = dragOverIndex?.type === 'week' && dragOverIndex?.index === idx;
              return (
                <TouchDropZone
                  as="li"
                  key={`week-${idx}`}
                  className={`priority-li ${isDragOver ? 'drag-active-week' : ''} ${p ? 'has-value' : ''}`}
                  onPayloadEnter={() => setDragOverIndex({ index: idx, type: 'week' })}
                  onPayloadLeave={() => setDragOverIndex(null)}
                  onPayloadDrop={(raw) => handlePriorityDrop('week', idx, raw)}
                >
                  {p && (
                    <span
                      className="priority-grip"
                      title="Drag to reorder"
                      aria-label="Drag to reorder priority"
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'text/plain',
                          encodePayload({ kind: 'priority', title: p, list: 'week', index: idx }),
                        );
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        if (!touch) return;
                        const li = e.currentTarget.parentElement as HTMLElement | null;
                        if (!li) return;
                        attachTouchDrag(
                          encodePayload({ kind: 'priority', title: p, list: 'week', index: idx }),
                          li,
                          touch,
                        );
                      }}
                    >
                      ⋮⋮
                    </span>
                  )}
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => handlePriorityChange(idx, e.target.value, 'week')}
                    placeholder={`Priority ${idx + 1}...`}
                    className="priority-input"
                  />
                  {p && (
                    <button
                      className="priority-clear-btn"
                      onClick={() => handlePriorityChange(idx, '', 'week')}
                      title="Clear this priority"
                      aria-label="Clear priority"
                    >
                      ✕
                    </button>
                  )}
                </TouchDropZone>
              );
            })}
          </ol>
        </GlassCard>

        <GlassCard className="priorities-card header-glass">
          <div className="priority-header">TOP 5 PRIORITIES - THIS MONTH <span className="priority-hint">(drag tasks here)</span></div>
          <ol className="priority-list">
            {prioritiesMonth.map((p, idx) => {
              const isDragOver = dragOverIndex?.type === 'month' && dragOverIndex?.index === idx;
              return (
                <TouchDropZone
                  as="li"
                  key={`month-${idx}`}
                  className={`priority-li ${isDragOver ? 'drag-active-month' : ''} ${p ? 'has-value' : ''}`}
                  onPayloadEnter={() => setDragOverIndex({ index: idx, type: 'month' })}
                  onPayloadLeave={() => setDragOverIndex(null)}
                  onPayloadDrop={(raw) => handlePriorityDrop('month', idx, raw)}
                >
                  {p && (
                    <span
                      className="priority-grip"
                      title="Drag to reorder"
                      aria-label="Drag to reorder priority"
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'text/plain',
                          encodePayload({ kind: 'priority', title: p, list: 'month', index: idx }),
                        );
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        if (!touch) return;
                        const li = e.currentTarget.parentElement as HTMLElement | null;
                        if (!li) return;
                        attachTouchDrag(
                          encodePayload({ kind: 'priority', title: p, list: 'month', index: idx }),
                          li,
                          touch,
                        );
                      }}
                    >
                      ⋮⋮
                    </span>
                  )}
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => handlePriorityChange(idx, e.target.value, 'month')}
                    placeholder={`Priority ${idx + 1}...`}
                    className="priority-input"
                  />
                  {p && (
                    <button
                      className="priority-clear-btn"
                      onClick={() => handlePriorityChange(idx, '', 'month')}
                      title="Clear this priority"
                      aria-label="Clear priority"
                    >
                      ✕
                    </button>
                  )}
                </TouchDropZone>
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
      <div className={`category-columns-grid layout-${layoutMode}`}>
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
                <TouchDropZone
                  className={`task-list ${dragOverBucket === `${cat.id}-target` ? 'task-list-drop-active' : ''}`}
                  dropEffect="copy"
                  onPayloadEnter={() => setDragOverBucket(`${cat.id}-target`)}
                  onPayloadLeave={() => setDragOverBucket(null)}
                  onPayloadDrop={(title) => handleBucketDrop(title, cat.id, 'target')}
                >
                  {targets.map((task, bucketIdx) => {
                    const isRowDropTarget =
                      dragOverRow?.category === cat.id &&
                      dragOverRow?.timeframe === 'target' &&
                      dragOverRow?.index === bucketIdx;
                    return (
                    <TouchDropZone
                      key={task.id}
                      className={`task-row-drop-wrap ${isRowDropTarget ? 'task-row-drop-target' : ''}`}
                      dropEffect="move"
                      onPayloadEnter={() =>
                        setDragOverRow({ category: cat.id, timeframe: 'target', index: bucketIdx })
                      }
                      onPayloadLeave={() => setDragOverRow(null)}
                      onPayloadDrop={(raw) => handleRowDrop(raw, cat.id, 'target', bucketIdx)}
                    >
                    <div
                      className={`task-item task-${task.category} target-item-row`}
                      title={`Added ${task.dateAdded}`}
                      draggable={editingTaskId !== task.id}
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          'text/plain',
                          encodePayload({ kind: 'task', title: task.title, taskId: task.id }),
                        )
                      }
                      onTouchStart={(e) => {
                        if (editingTaskId === task.id) return;
                        const touch = e.touches[0];
                        if (!touch) return;
                        attachTouchDrag(
                          encodePayload({ kind: 'task', title: task.title, taskId: task.id }),
                          e.currentTarget,
                          touch,
                        );
                      }}
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
                            onClick={() => {
                              if (recentTouchRef.current) return;
                              setEditingTaskId(task.id);
                              setEditingText(task.title);
                            }}
                            onTouchStart={beginLongPressEdit(task.id, task.title)}
                            onTouchEnd={endTextTouch}
                            onTouchMove={cancelLongPress}
                            onTouchCancel={cancelLongPress}
                            title="Click (desktop) or long-press (touch) to edit"
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
                    </TouchDropZone>
                    );
                  })}
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
                </TouchDropZone>
              </div>

              {/* NEAR TERM SECTION */}
              <div className="task-section">
                <div className="task-section-title">NEAR TERM</div>
                <TouchDropZone
                  className={`task-list ${dragOverBucket === `${cat.id}-near` ? 'task-list-drop-active' : ''}`}
                  dropEffect="copy"
                  onPayloadEnter={() => setDragOverBucket(`${cat.id}-near`)}
                  onPayloadLeave={() => setDragOverBucket(null)}
                  onPayloadDrop={(title) => handleBucketDrop(title, cat.id, 'near')}
                >
                  {nearTerm.map((task, bucketIdx) => {
                    const isRowDropTarget =
                      dragOverRow?.category === cat.id &&
                      dragOverRow?.timeframe === 'near' &&
                      dragOverRow?.index === bucketIdx;
                    return (
                    <TouchDropZone
                      key={task.id}
                      className={`task-row-drop-wrap ${isRowDropTarget ? 'task-row-drop-target' : ''}`}
                      dropEffect="move"
                      onPayloadEnter={() =>
                        setDragOverRow({ category: cat.id, timeframe: 'near', index: bucketIdx })
                      }
                      onPayloadLeave={() => setDragOverRow(null)}
                      onPayloadDrop={(raw) => handleRowDrop(raw, cat.id, 'near', bucketIdx)}
                    >
                    <div
                      className={`task-item task-item-with-actions task-${task.category} ${completingTaskId === task.id ? 'task-item-completing' : ''}`}
                      title={`Added ${task.dateAdded}`}
                      draggable={editingTaskId !== task.id}
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          'text/plain',
                          encodePayload({ kind: 'task', title: task.title, taskId: task.id }),
                        )
                      }
                      onTouchStart={(e) => {
                        if (editingTaskId === task.id) return;
                        const touch = e.touches[0];
                        if (!touch) return;
                        attachTouchDrag(
                          encodePayload({ kind: 'task', title: task.title, taskId: task.id }),
                          e.currentTarget,
                          touch,
                        );
                      }}
                    >
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={task.isCompleted}
                          onChange={() => handleToggleClick(task)}
                        />
                        <span className="checkbox-custom" style={{ borderColor: cat.color }}></span>
                        {renderTierIcon(task)}
                        <div
                          className="task-text-container task-edit-zone"
                          onClick={(e) => {
                            if (editingTaskId === task.id) return;
                            if (recentTouchRef.current) {
                              // Synthetic click after a touch — let the click
                              // bubble to the label so the checkbox still
                              // toggles, but don't open edit mode here.
                              return;
                            }
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingTaskId(task.id);
                            setEditingText(task.title);
                          }}
                          onTouchStart={editingTaskId === task.id ? undefined : beginLongPressEdit(task.id, task.title)}
                          onTouchEnd={editingTaskId === task.id ? undefined : endTextTouch}
                          onTouchMove={editingTaskId === task.id ? undefined : cancelLongPress}
                          onTouchCancel={editingTaskId === task.id ? undefined : cancelLongPress}
                          title={editingTaskId === task.id ? undefined : 'Click (desktop) or long-press (touch) to edit'}
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
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              className="edit-task-inline-input"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="task-text">{task.title}</span>
                              <span className="task-date">{task.dateAdded}</span>
                            </>
                          )}
                        </div>
                      </label>
                      <button
                        className="task-edit-btn task-row-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTaskId(task.id);
                          setEditingText(task.title);
                        }}
                        title="Edit task"
                        aria-label="Edit task"
                      >
                        ✎
                      </button>
                      <button
                        className="task-delete-btn task-row-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                        title="Delete task"
                        aria-label="Delete task"
                      >
                        ✕
                      </button>
                    </div>
                    </TouchDropZone>
                    );
                  })}
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
                </TouchDropZone>
              </div>

              {/* MEDIUM / LONG TERM SECTION */}
              <div className="task-section">
                <div className="task-section-title">MEDIUM / LONG TERM</div>
                <TouchDropZone
                  className={`task-list ${dragOverBucket === `${cat.id}-medium-long` ? 'task-list-drop-active' : ''}`}
                  dropEffect="copy"
                  onPayloadEnter={() => setDragOverBucket(`${cat.id}-medium-long`)}
                  onPayloadLeave={() => setDragOverBucket(null)}
                  onPayloadDrop={(title) => handleBucketDrop(title, cat.id, 'medium-long')}
                >
                  {mediumLong.map((task, bucketIdx) => {
                    const isRowDropTarget =
                      dragOverRow?.category === cat.id &&
                      dragOverRow?.timeframe === 'medium-long' &&
                      dragOverRow?.index === bucketIdx;
                    return (
                    <TouchDropZone
                      key={task.id}
                      className={`task-row-drop-wrap ${isRowDropTarget ? 'task-row-drop-target' : ''}`}
                      dropEffect="move"
                      onPayloadEnter={() =>
                        setDragOverRow({ category: cat.id, timeframe: 'medium-long', index: bucketIdx })
                      }
                      onPayloadLeave={() => setDragOverRow(null)}
                      onPayloadDrop={(raw) => handleRowDrop(raw, cat.id, 'medium-long', bucketIdx)}
                    >
                    <div
                      className={`task-item task-item-with-actions task-${task.category} ${completingTaskId === task.id ? 'task-item-completing' : ''}`}
                      title={`Added ${task.dateAdded}`}
                      draggable={editingTaskId !== task.id}
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          'text/plain',
                          encodePayload({ kind: 'task', title: task.title, taskId: task.id }),
                        )
                      }
                      onTouchStart={(e) => {
                        if (editingTaskId === task.id) return;
                        const touch = e.touches[0];
                        if (!touch) return;
                        attachTouchDrag(
                          encodePayload({ kind: 'task', title: task.title, taskId: task.id }),
                          e.currentTarget,
                          touch,
                        );
                      }}
                    >
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={task.isCompleted}
                          onChange={() => handleToggleClick(task)}
                        />
                        <span className="checkbox-custom" style={{ borderColor: cat.color }}></span>
                        {renderTierIcon(task)}
                        <div
                          className="task-text-container task-edit-zone"
                          onClick={(e) => {
                            if (editingTaskId === task.id) return;
                            if (recentTouchRef.current) {
                              // Synthetic click after a touch — let the click
                              // bubble to the label so the checkbox still
                              // toggles, but don't open edit mode here.
                              return;
                            }
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingTaskId(task.id);
                            setEditingText(task.title);
                          }}
                          onTouchStart={editingTaskId === task.id ? undefined : beginLongPressEdit(task.id, task.title)}
                          onTouchEnd={editingTaskId === task.id ? undefined : endTextTouch}
                          onTouchMove={editingTaskId === task.id ? undefined : cancelLongPress}
                          onTouchCancel={editingTaskId === task.id ? undefined : cancelLongPress}
                          title={editingTaskId === task.id ? undefined : 'Click (desktop) or long-press (touch) to edit'}
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
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              className="edit-task-inline-input"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="task-text">{task.title}</span>
                              <span className="task-date">{task.dateAdded}</span>
                            </>
                          )}
                        </div>
                      </label>
                      <button
                        className="task-edit-btn task-row-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTaskId(task.id);
                          setEditingText(task.title);
                        }}
                        title="Edit task"
                        aria-label="Edit task"
                      >
                        ✎
                      </button>
                      <button
                        className="task-delete-btn task-row-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                        title="Delete task"
                        aria-label="Delete task"
                      >
                        ✕
                      </button>
                    </div>
                    </TouchDropZone>
                    );
                  })}
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
                </TouchDropZone>
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
                  <button className="pill-undo" onClick={() => toggleTask(task.id)} title="Undo completion">⎌</button>
                  <button className="pill-delete" onClick={() => deleteTask(task.id)} title="Delete permanently" aria-label="Delete completed task">✕</button>
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
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
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
                        <button className="table-undo-btn" onClick={() => toggleTask(task.id)} title="Undo completion">
                          Undo
                        </button>
                        <button className="table-delete-btn" onClick={() => deleteTask(task.id)} title="Delete permanently" aria-label="Delete">
                          ✕
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
