import { useState, useEffect, useMemo, useRef } from 'react';
import { GlassCard } from './components/GlassCard';
import { TabDailyDashboard, type Task } from './components/TabDailyDashboard';
import { TabHealthScorecard, type Habit } from './components/TabHealthScorecard';
import { TabGoalsTargets, type Goal } from './components/TabGoalsTargets';
import { TabCodingProjects, type CodingTask, type CodingNote } from './components/TabCodingProjects';
import { TabFreeform } from './components/TabFreeform';
import { TabDailyNotes } from './components/TabDailyNotes';
import { TaskInbox } from './components/TaskInbox';
import { PomodoroTimer } from './components/PomodoroTimer';

// ----------------------------------------------------
// DEFAULT HIGH-FIDELITY DOCK DATASETS
// (Modeled closely on user's reference screenshot)
// ----------------------------------------------------

// Clean slate — Bryan populates real data
const INITIAL_TASKS = (): Task[] => [];

const INITIAL_PRIORITIES_WEEK: string[] = ['', '', '', '', ''];
const INITIAL_PRIORITIES_MONTH: string[] = ['', '', '', '', ''];

// One-time wipe key — bumping this value forces every browser to clear stored task/priority data on next load
const DATA_RESET_VERSION = 'wipe-2026-05-26-clean-slate';

// All habit history strictly before this Monday is wiped from storage; new
// seed data also stops at this cutoff. YYYY-MM-DD so string-compare works.
const HABIT_HISTORY_CUTOFF = '2026-05-25';
const HABIT_HISTORY_WIPE_VERSION = `pre-${HABIT_HISTORY_CUTOFF}-v1`;

// Helper to seed habit history dots so dashboard looks fully active ending today
const seedHabitHistory = (density: number, skipDays: number[] = [], minDateKey: string = HABIT_HISTORY_CUTOFF) => {
  const history: Record<string, boolean> = {};
  const today = new Date();

  for (let i = 0; i < 40; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    // Format YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;

    if (key < minDateKey) continue;

    const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
    if (skipDays.includes(dayOfWeek)) continue;

    if (Math.random() < density) {
      history[key] = true;
    }
  }
  return history;
};

const INITIAL_HABITS = (): Habit[] => [
  { id: 'h1', name: 'Workout', target: 6, history: seedHabitHistory(0.6, [0]) }, // skip Sunday
  { id: 'h1-1', name: 'Weights', target: 4, isSubHabit: true, parentId: 'h1', history: seedHabitHistory(0.5, [0, 2, 4]) },
  { id: 'h1-2', name: 'Cardio', target: 5, isSubHabit: true, parentId: 'h1', history: seedHabitHistory(0.5, [0, 1, 3, 5]) },
  { id: 'h2', name: 'Avoid alcohol', target: 5, history: seedHabitHistory(0.8) },
  { id: 'h3', name: 'Calorie spend 850', target: 7, history: seedHabitHistory(0.5) },
  { id: 'h4', name: 'Morning fast', target: 5, history: seedHabitHistory(0.7) },
  { id: 'h5', name: 'Meditation 5min+', target: 4, history: seedHabitHistory(0.6) },
  { id: 'h6', name: 'Sleep 7+ hours', target: 7, history: seedHabitHistory(0.7) },
  { id: 'h7', name: 'Blood Pressure checked', target: 5, history: seedHabitHistory(0.8) },
  { id: 'h8', name: 'Take Supplements', target: 7, history: seedHabitHistory(0.8) },
];

// Reusable filter: drop any history keys before the cutoff.
const filterHabitHistoryToCutoff = (habits: Habit[]): Habit[] =>
  habits.map(h => {
    const filtered: Record<string, boolean> = {};
    Object.entries(h.history || {}).forEach(([key, val]) => {
      if (key >= HABIT_HISTORY_CUTOFF) filtered[key] = val;
    });
    return { ...h, history: filtered };
  });

// Strip any pre-cutoff dates out of stored habit history. Idempotent.
const wipeHabitHistoryPreCutoff = () => {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('xp_habit_wipe_version') === HABIT_HISTORY_WIPE_VERSION) return;
  const stored = localStorage.getItem('xp_habits');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Array<Habit>;
      const cleaned = filterHabitHistoryToCutoff(parsed);
      localStorage.setItem('xp_habits', JSON.stringify(cleaned));
    } catch {
      // Corrupt JSON — leave the wipe-version flag unset so a later boot retries.
      return;
    }
  }
  localStorage.setItem('xp_habit_wipe_version', HABIT_HISTORY_WIPE_VERSION);
};

const INITIAL_GOALS = (): Goal[] => [
  // work
  { id: 'g1', title: 'Increase quarterly revenue by 15%', category: 'work', term: 'medium', isAchieved: false, dateAdded: '05/01/26' },
  { id: 'g2', title: 'Automate all client reporting pipelines', category: 'work', term: 'medium', isAchieved: true, dateAdded: '05/01/26' },
  { id: 'g3', title: 'Obtain promotion to Lead Product Manager', category: 'work', term: 'long', isAchieved: false, dateAdded: '05/01/26' },
  
  // career
  { id: 'g4', title: 'Finish advanced System Design course', category: 'career', term: 'medium', isAchieved: false, dateAdded: '05/01/26' },
  { id: 'g5', title: 'Speak at a local tech conference', category: 'career', term: 'long', isAchieved: false, dateAdded: '05/01/26' },

  // family
  { id: 'g6', title: 'Organize dynamic family reunion weekend', category: 'family', term: 'medium', isAchieved: false, dateAdded: '05/01/26' },
  { id: 'g7', title: 'Completely renovate home backyard & patio', category: 'family', term: 'long', isAchieved: false, dateAdded: '05/01/26' },

  // health
  { id: 'g8', title: 'Reach single-digit body fat compliance rate', category: 'health', term: 'medium', isAchieved: false, dateAdded: '05/01/26' },
  { id: 'g9', title: 'Run an official marathon under 4 hours', category: 'health', term: 'long', isAchieved: false, dateAdded: '05/01/26' },
];

// ----------------------------------------------------
// DAILY NOTES STORAGE (consolidated + cloud-synced)
// ----------------------------------------------------
const DAILY_NOTES_KEY = 'xp_daily_notes_v2';
const DAILY_NOTES_MIGRATION_FLAG = 'xp_daily_notes_consolidated_v1';

// Union two date→content maps. On a same-day collision, keep the longer text
// so cross-device merges never silently drop content one device is missing.
// (Deliberately retention-biased: notes should never vanish on a sync.)
const mergeNotes = (
  a: Record<string, string> = {},
  b: Record<string, string> = {},
): Record<string, string> => {
  const out: Record<string, string> = { ...a };
  for (const [date, text] of Object.entries(b)) {
    const existing = out[date];
    if (existing === undefined || text.trim().length > existing.trim().length) {
      out[date] = text;
    }
  }
  return out;
};

// Load consolidated daily notes. One-time, migrate any legacy per-day keys
// (xp_daily_notes_YYYY-MM-DD) written by the pre-sync version into the single
// blob, then delete them so a removed note can't be resurrected on next load.
const loadDailyNotes = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  let record: Record<string, string> = {};
  try {
    const blob = localStorage.getItem(DAILY_NOTES_KEY);
    if (blob) record = JSON.parse(blob) as Record<string, string>;
  } catch {
    record = {};
  }

  if (localStorage.getItem(DAILY_NOTES_MIGRATION_FLAG) !== 'done') {
    try {
      const legacy: Record<string, string> = {};
      const legacyKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const m = k && /^xp_daily_notes_(\d{4}-\d{2}-\d{2})$/.exec(k);
        if (m) {
          legacyKeys.push(k as string);
          const v = localStorage.getItem(k as string);
          if (v && v.trim()) legacy[m[1]] = v;
        }
      }
      record = mergeNotes(record, legacy);
      legacyKeys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(DAILY_NOTES_KEY, JSON.stringify(record));
      localStorage.setItem(DAILY_NOTES_MIGRATION_FLAG, 'done');
    } catch {
      /* ignore quota / parse errors — non-fatal */
    }
  }
  return record;
};

const AUTH_TOKEN_KEY = 'xp_auth_token';

// Derive a stable, deterministic token from the access key so the stored
// token survives redeploys (it lives in localStorage, not sessionStorage)
// but is automatically invalidated when VITE_ACCESS_KEY is rotated.
const deriveAuthToken = (key: string): string => {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h) ^ key.charCodeAt(i);
  }
  return `v1:${(h >>> 0).toString(36)}:${key.length}`;
};

const getExpectedAuthToken = (): string => {
  const correctKey = import.meta.env.VITE_ACCESS_KEY as string | undefined;
  if (!correctKey) {
    throw new Error(
      'VITE_ACCESS_KEY environment variable is not set. ' +
      'Add it to .env.local for development, or to your Vercel project settings for production.',
    );
  }
  return deriveAuthToken(correctKey);
};

function SyncBadge({ status }: { status: 'idle' | 'syncing' | 'synced' | 'error' }) {
  const map = {
    idle: { color: '#64748b', label: 'Idle' },
    syncing: { color: '#0ea5e9', label: 'Syncing…' },
    synced: { color: '#10b981', label: 'Synced' },
    error: { color: '#f97316', label: 'Offline' },
  } as const;
  const { color, label } = map[status];
  const title =
    status === 'error'
      ? 'Cloud sync unavailable — changes are saved locally only. Enable Vercel KV on the project to sync across devices.'
      : status === 'synced'
        ? 'All changes are saved to the cloud and will appear on your other devices.'
        : label;
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginLeft: 12,
        fontSize: '0.7rem',
        fontWeight: 600,
        color: 'var(--text-dim)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: status === 'syncing' ? 'pulse 1.2s ease-in-out infinite' : undefined,
        }}
      />
      {label}
    </span>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY) === getExpectedAuthToken();
    } catch {
      return false;
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctKey = import.meta.env.VITE_ACCESS_KEY as string | undefined;
    if (!correctKey) {
      throw new Error('VITE_ACCESS_KEY environment variable is not set');
    }
    if (password === correctKey) {
      try {
        localStorage.setItem(AUTH_TOKEN_KEY, deriveAuthToken(correctKey));
      } catch {
        // Quota / privacy-mode failures: still let this tab in.
      }
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 600);
    }
  };

  const [activeTab, setActiveTab] = useState<'daily' | 'health' | 'goals' | 'coding' | 'freeform' | 'notes'>('daily');
  const [theme, setTheme] = useState<'dark-glassmorphism' | 'light-neumorphic' | 'cyberpunk'>('dark-glassmorphism');
  const [layoutMode, setLayoutMode] = useState<'1x4' | '2x2'>(() => {
    const saved = localStorage.getItem('xp_layout_mode');
    return saved === '2x2' || saved === '1x4' ? saved : '1x4';
  });

  // One-time startup side effects (data reset wipe + habit history wipe).
  // Lazy useState initializer runs exactly once per mount — before all
  // downstream useState initializers read from localStorage — and never
  // again on re-renders (unlike bare render-body code).
  useState<null>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('xp_data_reset_version') !== DATA_RESET_VERSION) {
      localStorage.removeItem('xp_tasks');
      localStorage.removeItem('xp_priorities_week');
      localStorage.removeItem('xp_priorities_month');
      localStorage.setItem('xp_data_reset_version', DATA_RESET_VERSION);
    }
    wipeHabitHistoryPreCutoff();
    return null;
  });

  // Core app state
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('xp_tasks');
      return saved ? JSON.parse(saved) : INITIAL_TASKS();
    } catch {
      return INITIAL_TASKS();
    }
  });

  const [prioritiesWeek, setPrioritiesWeek] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('xp_priorities_week');
      return saved ? JSON.parse(saved) : INITIAL_PRIORITIES_WEEK;
    } catch {
      return INITIAL_PRIORITIES_WEEK;
    }
  });

  const [prioritiesMonth, setPrioritiesMonth] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('xp_priorities_month');
      return saved ? JSON.parse(saved) : INITIAL_PRIORITIES_MONTH;
    } catch {
      return INITIAL_PRIORITIES_MONTH;
    }
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    let loaded: Habit[];
    try {
      const saved = localStorage.getItem('xp_habits');
      loaded = saved ? JSON.parse(saved) : INITIAL_HABITS();
    } catch {
      loaded = INITIAL_HABITS();
    }

    // ----------------------------------------------------
    // LOCAL STORAGE HABITS MIGRATION LAYER
    // ----------------------------------------------------
    const hadStoredData = !!localStorage.getItem('xp_habits');
    let needsUpdate = false;
    loaded = loaded.map(h => {
      if (h.name === 'No alcohol') {
        needsUpdate = true;
        return { ...h, name: 'Avoid alcohol' };
      }
      return h;
    });

    const hasSupplements = loaded.some(h => h.name === 'Take Supplements' || h.id === 'h8');
    if (!hasSupplements) {
      needsUpdate = true;
      loaded.push({
        id: 'h8',
        name: 'Take Supplements',
        target: 7,
        history: seedHabitHistory(0.8)
      });
    }

    if (needsUpdate && hadStoredData) {
      localStorage.setItem('xp_habits', JSON.stringify(loaded));
    }

    return loaded;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem('xp_goals');
      return saved ? JSON.parse(saved) : INITIAL_GOALS();
    } catch {
      return INITIAL_GOALS();
    }
  });

  const [inboxTasks, setInboxTasks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('xp_inbox_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [goalsInbox, setGoalsInbox] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('xp_goals_inbox');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [freeformContent, setFreeformContent] = useState<string>(() => {
    try {
      return localStorage.getItem('xp_freeform_content') ?? '';
    } catch {
      return '';
    }
  });

  // Coding Projects state
  const [codingTasks, setCodingTasks] = useState<CodingTask[]>(() => {
    try {
      const saved = localStorage.getItem('xp_coding_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [codingPrioritiesWeek, setCodingPrioritiesWeek] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('xp_coding_priorities_week');
      return saved ? JSON.parse(saved) : ['', '', '', '', ''];
    } catch {
      return ['', '', '', '', ''];
    }
  });

  const [codingPrioritiesMonth, setCodingPrioritiesMonth] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('xp_coding_priorities_month');
      return saved ? JSON.parse(saved) : ['', '', '', '', ''];
    } catch {
      return ['', '', '', '', ''];
    }
  });

  const [codingNotes, setCodingNotes] = useState<CodingNote[]>(() => {
    try {
      const saved = localStorage.getItem('xp_coding_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Daily Notes — a date→content map, consolidated from legacy per-day keys.
  const [dailyNotes, setDailyNotes] = useState<Record<string, string>>(loadDailyNotes);

  // Sync to LocalStorage (Acts as our permanent local database)
  useEffect(() => {
    localStorage.setItem('xp_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('xp_priorities_week', JSON.stringify(prioritiesWeek));
  }, [prioritiesWeek]);

  useEffect(() => {
    localStorage.setItem('xp_priorities_month', JSON.stringify(prioritiesMonth));
  }, [prioritiesMonth]);

  useEffect(() => {
    localStorage.setItem('xp_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('xp_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('xp_inbox_tasks', JSON.stringify(inboxTasks));
  }, [inboxTasks]);

  useEffect(() => {
    localStorage.setItem('xp_goals_inbox', JSON.stringify(goalsInbox));
  }, [goalsInbox]);

  useEffect(() => {
    localStorage.setItem('xp_freeform_content', freeformContent);
  }, [freeformContent]);

  useEffect(() => {
    localStorage.setItem('xp_coding_tasks', JSON.stringify(codingTasks));
  }, [codingTasks]);

  useEffect(() => {
    localStorage.setItem('xp_coding_priorities_week', JSON.stringify(codingPrioritiesWeek));
  }, [codingPrioritiesWeek]);

  useEffect(() => {
    localStorage.setItem('xp_coding_priorities_month', JSON.stringify(codingPrioritiesMonth));
  }, [codingPrioritiesMonth]);

  useEffect(() => {
    localStorage.setItem('xp_coding_notes', JSON.stringify(codingNotes));
  }, [codingNotes]);

  useEffect(() => {
    localStorage.setItem(DAILY_NOTES_KEY, JSON.stringify(dailyNotes));
  }, [dailyNotes]);

  useEffect(() => {
    localStorage.setItem('xp_layout_mode', layoutMode);
  }, [layoutMode]);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ----------------------------------------------------
  // CROSS-DEVICE CLOUD SYNC (Vercel KV via /api/state)
  // ----------------------------------------------------
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const cloudSyncRef = useRef<{
    ready: boolean;
    lastServerBlob: string;
    lastModified: number;
  }>({ ready: false, lastServerBlob: '', lastModified: 0 });
  const authToken = getExpectedAuthToken();

  type CloudState = {
    tasks: Task[];
    prioritiesWeek: string[];
    prioritiesMonth: string[];
    habits: Habit[];
    goals: Goal[];
    inboxTasks: string[];
    goalsInbox: string[];
    freeformContent: string;
    codingTasks: CodingTask[];
    codingPrioritiesWeek: string[];
    codingPrioritiesMonth: string[];
    codingNotes: CodingNote[];
    dailyNotes: Record<string, string>;
  };

  const applyRemote = (data: Partial<CloudState>) => {
    if (Array.isArray(data.tasks)) setTasks(data.tasks);
    if (Array.isArray(data.prioritiesWeek)) setPrioritiesWeek(data.prioritiesWeek);
    if (Array.isArray(data.prioritiesMonth)) setPrioritiesMonth(data.prioritiesMonth);
    // Re-apply the pre-Monday wipe to incoming cloud state so a dirty blob
    // from another device can't resurrect cleared history. The next push
    // will then send the cleaned version, converging the cloud.
    if (Array.isArray(data.habits)) setHabits(filterHabitHistoryToCutoff(data.habits));
    if (Array.isArray(data.goals)) setGoals(data.goals);
    if (Array.isArray(data.inboxTasks)) setInboxTasks(data.inboxTasks);
    if (Array.isArray(data.goalsInbox)) setGoalsInbox(data.goalsInbox);
    if (typeof data.freeformContent === 'string') setFreeformContent(data.freeformContent);
    if (Array.isArray(data.codingTasks)) setCodingTasks(data.codingTasks);
    if (Array.isArray(data.codingPrioritiesWeek)) setCodingPrioritiesWeek(data.codingPrioritiesWeek);
    if (Array.isArray(data.codingPrioritiesMonth)) setCodingPrioritiesMonth(data.codingPrioritiesMonth);
    if (Array.isArray(data.codingNotes)) setCodingNotes(data.codingNotes);
    // Merge (not replace) so notes only on this device — e.g. days typed
    // before sync existed — survive a pull instead of being overwritten.
    if (data.dailyNotes && typeof data.dailyNotes === 'object') {
      setDailyNotes(prev => mergeNotes(prev, data.dailyNotes as Record<string, string>));
    }
  };

  // Initial pull on auth
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setSyncStatus('syncing');
    fetch('/api/state', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(({ state }) => {
        if (cancelled) return;
        if (state && typeof state === 'object') {
          const { lastModified, ...data } = state as CloudState & { lastModified?: number };
          applyRemote(data);
          cloudSyncRef.current.lastServerBlob = JSON.stringify(data);
          cloudSyncRef.current.lastModified = lastModified || 0;
        }
        cloudSyncRef.current.ready = true;
        setSyncStatus('synced');
      })
      .catch(() => {
        if (cancelled) return;
        // Allow saves to proceed; localStorage still works as fallback.
        cloudSyncRef.current.ready = true;
        setSyncStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authToken]);

  const cloudState = useMemo<CloudState>(
    () => ({ tasks, prioritiesWeek, prioritiesMonth, habits, goals, inboxTasks, goalsInbox, freeformContent, codingTasks, codingPrioritiesWeek, codingPrioritiesMonth, codingNotes, dailyNotes }),
    [tasks, prioritiesWeek, prioritiesMonth, habits, goals, inboxTasks, goalsInbox, freeformContent, codingTasks, codingPrioritiesWeek, codingPrioritiesMonth, codingNotes, dailyNotes]
  );

  // Debounced push when anything changes
  useEffect(() => {
    if (!isAuthenticated || !cloudSyncRef.current.ready) return;
    const blob = JSON.stringify(cloudState);
    if (blob === cloudSyncRef.current.lastServerBlob) return;
    setSyncStatus('syncing');
    const handle = window.setTimeout(() => {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: blob,
      })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(({ state }) => {
          if (state && typeof state === 'object') {
            const { lastModified, ...data } = state as CloudState & { lastModified?: number };
            cloudSyncRef.current.lastServerBlob = JSON.stringify(data);
            cloudSyncRef.current.lastModified = lastModified || Date.now();
          }
          setSyncStatus('synced');
        })
        .catch(() => setSyncStatus('error'));
    }, 800);
    return () => window.clearTimeout(handle);
  }, [cloudState, isAuthenticated, authToken]);

  // Poll every 30s (and on tab refocus) for remote changes
  useEffect(() => {
    if (!isAuthenticated) return;
    const pull = () => {
      if (document.visibilityState !== 'visible') return;
      fetch('/api/state', { headers: { Authorization: `Bearer ${authToken}` } })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(({ state }) => {
          if (!state || typeof state !== 'object') return;
          const { lastModified, ...data } = state as CloudState & { lastModified?: number };
          if ((lastModified || 0) <= cloudSyncRef.current.lastModified) return;
          applyRemote(data);
          cloudSyncRef.current.lastServerBlob = JSON.stringify(data);
          cloudSyncRef.current.lastModified = lastModified || 0;
        })
        .catch(() => {});
    };
    const interval = window.setInterval(pull, 30000);
    document.addEventListener('visibilitychange', pull);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', pull);
    };
  }, [isAuthenticated, authToken]);

  if (!isAuthenticated) {
    return (
      <div className="app-wrapper">
        {/* Dynamic Background Glow Nodes */}
        <div className="bg-glow-orange"></div>
        <div className="bg-glow-purple"></div>
        <div className="bg-glow-cyan"></div>

        <div className="login-overlay-container">
          <GlassCard className={`login-glass-card ${loginError ? 'shake-error' : ''}`}>
            <div className="login-logo-container">
              <span className="login-icon">🔒</span>
              <h2 className="login-title">Productivity & Execution</h2>
              <p className="login-subtitle">Dashboard Access Key Required</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="login-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access key..."
                  className="login-password-input"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pwd-toggle-btn"
                  title={showPassword ? 'Hide Key' : 'Show Key'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>

              {loginError && (
                <div className="login-error-message">
                  Invalid Access Key. Please try again.
                </div>
              )}

              <button type="submit" className="login-submit-btn">
                Unlock Dashboard
              </button>
            </form>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {/* Dynamic Background Glow Nodes */}
      <div className="bg-glow-orange"></div>
      <div className="bg-glow-purple"></div>
      <div className="bg-glow-cyan"></div>

      {/* Dynamic Global Top Navigation Bar */}
      <GlassCard className="app-header" style={{ borderRadius: '0px 0px 16px 16px', borderTop: 'none' }}>
        <div className="brand-section">
          <span className="brand-title">Productivity & Execution Planning</span>
          <SyncBadge status={syncStatus} />
        </div>

        {/* Tab Controls */}
        <div className="tab-nav">
          <button 
            className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => setActiveTab('health')}
          >
            Health Scorecard
          </button>
          <button
            className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            Goals & Targets
          </button>
          <button
            className={`tab-btn ${activeTab === 'coding' ? 'active' : ''}`}
            onClick={() => setActiveTab('coding')}
          >
            Coding Projects
          </button>
          <button
            className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Daily Notes
          </button>
          <button
            className={`tab-btn ${activeTab === 'freeform' ? 'active' : ''}`}
            onClick={() => setActiveTab('freeform')}
          >
            Freeform
          </button>
        </div>

        {/* Theme + Layout switchers */}
        <div className="theme-selector-container">
          {(activeTab === 'daily' || activeTab === 'coding') && (
            <button
              className="layout-toggle-btn"
              onClick={() => setLayoutMode(layoutMode === '1x4' ? '2x2' : '1x4')}
              title={layoutMode === '1x4' ? 'Switch to 2×2 grid' : 'Switch to single-row layout'}
              aria-label="Toggle bucket layout"
            >
              {layoutMode === '1x4' ? '▦ 2×2' : '▤ 4-col'}
            </button>
          )}
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)' }}>THEME:</span>
          <button
            className={`theme-btn ${theme === 'dark-glassmorphism' ? 'active' : ''}`}
            onClick={() => setTheme('dark-glassmorphism')}
          >
            Dark Glass
          </button>
          <button
            className={`theme-btn ${theme === 'light-neumorphic' ? 'active' : ''}`}
            onClick={() => setTheme('light-neumorphic')}
          >
            Light Neumorphic
          </button>
          <button
            className={`theme-btn ${theme === 'cyberpunk' ? 'active' : ''}`}
            onClick={() => setTheme('cyberpunk')}
          >
            Cyberpunk
          </button>
        </div>
      </GlassCard>

      {/* Main Container rendering active tab */}
      <main className="container">
        {activeTab === 'daily' && (
          <TabDailyDashboard
            tasks={tasks}
            setTasks={setTasks}
            prioritiesWeek={prioritiesWeek}
            setPrioritiesWeek={setPrioritiesWeek}
            prioritiesMonth={prioritiesMonth}
            setPrioritiesMonth={setPrioritiesMonth}
            inboxTasks={inboxTasks}
            setInboxTasks={setInboxTasks}
            layoutMode={layoutMode}
          />
        )}
        {activeTab === 'health' && (
          <TabHealthScorecard
            habits={habits}
            setHabits={setHabits}
            tasks={tasks}
          />
        )}
        {activeTab === 'goals' && (
          <TabGoalsTargets
            goals={goals}
            setGoals={setGoals}
            goalsInbox={goalsInbox}
            setGoalsInbox={setGoalsInbox}
          />
        )}
        {activeTab === 'coding' && (
          <TabCodingProjects
            tasks={codingTasks}
            setTasks={setCodingTasks}
            prioritiesWeek={codingPrioritiesWeek}
            setPrioritiesWeek={setCodingPrioritiesWeek}
            prioritiesMonth={codingPrioritiesMonth}
            setPrioritiesMonth={setCodingPrioritiesMonth}
            inboxTasks={inboxTasks}
            setInboxTasks={setInboxTasks}
            layoutMode={layoutMode}
            notes={codingNotes}
            setNotes={setCodingNotes}
          />
        )}
        {activeTab === 'notes' && (
          <TabDailyNotes notes={dailyNotes} setNotes={setDailyNotes} />
        )}
        {activeTab === 'freeform' && (
          <TabFreeform
            content={freeformContent}
            setContent={setFreeformContent}
            onSendToTaskInbox={(lines) => setInboxTasks(prev => [...prev, ...lines])}
            onSendToGoalsInbox={(lines) => setGoalsInbox(prev => [...prev, ...lines])}
          />
        )}
      </main>

      <TaskInbox items={inboxTasks} setItems={setInboxTasks} />

      {/* Floating pomodoro — mounted at app level so the countdown persists
          across every tab; draggable, collapsible, position remembered. */}
      <PomodoroTimer />
    </div>
  );
}
