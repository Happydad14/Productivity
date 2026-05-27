import { useState, useEffect } from 'react';
import { GlassCard } from './components/GlassCard';
import { TabDailyDashboard, type Task } from './components/TabDailyDashboard';
import { TabHealthScorecard, type Habit } from './components/TabHealthScorecard';
import { TabGoalsTargets, type Goal } from './components/TabGoalsTargets';
import { TaskInbox } from './components/TaskInbox';

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

// Helper to seed habit history dots so dashboard looks fully active ending today
const seedHabitHistory = (density: number, skipDays: number[] = []) => {
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('xp_session_active') === 'true';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctKey = import.meta.env.VITE_ACCESS_KEY || "productivity2026";
    if (password === correctKey) {
      sessionStorage.setItem('xp_session_active', 'true');
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 600);
    }
  };

  const [activeTab, setActiveTab] = useState<'daily' | 'health' | 'goals'>('daily');
  const [theme, setTheme] = useState<'dark-glassmorphism' | 'light-neumorphic' | 'cyberpunk'>('dark-glassmorphism');

  // One-time wipe of stale template data — runs once per browser when DATA_RESET_VERSION changes
  if (typeof window !== 'undefined' && localStorage.getItem('xp_data_reset_version') !== DATA_RESET_VERSION) {
    localStorage.removeItem('xp_tasks');
    localStorage.removeItem('xp_priorities_week');
    localStorage.removeItem('xp_priorities_month');
    localStorage.setItem('xp_data_reset_version', DATA_RESET_VERSION);
  }

  // Core app state
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('xp_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS();
  });

  const [prioritiesWeek, setPrioritiesWeek] = useState<string[]>(() => {
    const saved = localStorage.getItem('xp_priorities_week');
    return saved ? JSON.parse(saved) : INITIAL_PRIORITIES_WEEK;
  });

  const [prioritiesMonth, setPrioritiesMonth] = useState<string[]>(() => {
    const saved = localStorage.getItem('xp_priorities_month');
    return saved ? JSON.parse(saved) : INITIAL_PRIORITIES_MONTH;
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('xp_habits');
    let loaded: Habit[] = saved ? JSON.parse(saved) : INITIAL_HABITS();

    // ----------------------------------------------------
    // LOCAL STORAGE HABITS MIGRATION LAYER
    // ----------------------------------------------------
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

    if (needsUpdate && saved) {
      localStorage.setItem('xp_habits', JSON.stringify(loaded));
    }

    return loaded;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('xp_goals');
    return saved ? JSON.parse(saved) : INITIAL_GOALS();
  });

  const [inboxTasks, setInboxTasks] = useState<string[]>(() => {
    const saved = localStorage.getItem('xp_inbox_tasks');
    return saved ? JSON.parse(saved) : [];
  });

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

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
        </div>

        {/* Theme Engine Switcher */}
        <div className="theme-selector-container">
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
          />
        )}
        {activeTab === 'health' && (
          <TabHealthScorecard
            habits={habits}
            setHabits={setHabits}
          />
        )}
        {activeTab === 'goals' && (
          <TabGoalsTargets
            goals={goals}
            setGoals={setGoals}
          />
        )}
      </main>

      <TaskInbox items={inboxTasks} setItems={setInboxTasks} />
    </div>
  );
}
