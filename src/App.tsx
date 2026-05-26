import { useState, useEffect } from 'react';
import { GlassCard } from './components/GlassCard';
import { TabDailyDashboard, type Task } from './components/TabDailyDashboard';
import { TabHealthScorecard, type Habit } from './components/TabHealthScorecard';
import { TabGoalsTargets, type Goal } from './components/TabGoalsTargets';

// ----------------------------------------------------
// DEFAULT HIGH-FIDELITY DOCK DATASETS
// (Modeled closely on user's reference screenshot)
// ----------------------------------------------------

const getTodayDateString = () => {
  return new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
};

const getYesterdayDateString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
};

const getTwoDaysAgoDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
};

const INITIAL_TASKS = (): Task[] => {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const twoDaysAgo = getTwoDaysAgoDateString();

  return [
    // --- WORK ---
    { id: 'w-t1', title: 'Deliver outstanding results', category: 'work', timeframe: 'target', isCompleted: false, dateAdded: twoDaysAgo, tier: 'tier-3' },
    { id: 'w-t2', title: 'Streamline team processes', category: 'work', timeframe: 'target', isCompleted: false, dateAdded: twoDaysAgo, tier: 'tier-2' },
    { id: 'w-n1', title: 'Send follow-up emails', category: 'work', timeframe: 'near', isCompleted: false, dateAdded: yesterday, tier: 'tier-1' },
    { id: 'w-n2', title: 'Review buyer list', category: 'work', timeframe: 'near', isCompleted: false, dateAdded: yesterday, tier: 'tier-2' },
    { id: 'w-m1', title: 'Optimize reporting dashboard', category: 'work', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo, tier: 'tier-3' },
    { id: 'w-m2', title: 'Automate lead workflow', category: 'work', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo, tier: 'tier-1' },
    { id: 'w-m3', title: 'Improve team documentation', category: 'work', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo, tier: 'tier-2' },

    // --- CAREER ---
    { id: 'c-t1', title: 'Grow expertise', category: 'career', timeframe: 'target', isCompleted: false, dateAdded: twoDaysAgo, tier: 'tier-2' },
    { id: 'c-t2', title: 'Build valuable network', category: 'career', timeframe: 'target', isCompleted: false, dateAdded: twoDaysAgo, tier: 'tier-3' },
    { id: 'c-n1', title: 'Update LinkedIn profile', category: 'career', timeframe: 'near', isCompleted: false, dateAdded: today, tier: 'tier-1' },
    { id: 'c-m1', title: 'Complete UI certification', category: 'career', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo, tier: 'tier-3' },
    { id: 'c-m2', title: 'Attend industry conference', category: 'career', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo, tier: 'tier-2' },
    { id: 'c-m3', title: 'Build personal brand', category: 'career', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo, tier: 'tier-1' },

    // --- HOME & FAMILY ---
    { id: 'h-t1', title: 'Maintain a happy home', category: 'family', timeframe: 'target', isCompleted: false, dateAdded: twoDaysAgo },
    { id: 'h-t2', title: 'Be present with family', category: 'family', timeframe: 'target', isCompleted: false, dateAdded: twoDaysAgo },
    { id: 'h-n1', title: 'Call parents', category: 'family', timeframe: 'near', isCompleted: false, dateAdded: today },
    { id: 'h-m1', title: 'Plan weekend trip', category: 'family', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo },
    { id: 'h-m2', title: 'Organize home office', category: 'family', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo },
    { id: 'h-m3', title: 'Home improvement project', category: 'family', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo },

    // --- HEALTH & FITNESS ---
    { id: 'f-t1', title: 'Stay fit and strong', category: 'health', timeframe: 'target', isCompleted: false, dateAdded: twoDaysAgo },
    { id: 'f-t2', title: 'Build healthy daily habits', category: 'health', timeframe: 'target', isCompleted: false, dateAdded: twoDaysAgo },
    { id: 'f-n1', title: 'Avoid alcohol', category: 'health', timeframe: 'near', isCompleted: false, dateAdded: today },
    { id: 'f-n2', title: 'Calorie spend 850', category: 'health', timeframe: 'near', isCompleted: false, dateAdded: today },
    { id: 'f-n3', title: 'Morning fast', category: 'health', timeframe: 'near', isCompleted: false, dateAdded: today },
    { id: 'f-n4', title: 'Meditation 5min+', category: 'health', timeframe: 'near', isCompleted: false, dateAdded: today },
    { id: 'f-m1', title: 'Run a 10K', category: 'health', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo },
    { id: 'f-m2', title: 'Build muscle', category: 'health', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo },
    { id: 'f-m3', title: 'Improve sleep quality', category: 'health', timeframe: 'medium-long', isCompleted: false, dateAdded: twoDaysAgo },

    // --- COMPLETED TODAY (COMPLETED ON CURRENT DATE) ---
    { id: 'comp-1', title: 'Update CRM notes', category: 'work', timeframe: 'near', isCompleted: true, dateAdded: twoDaysAgo, dateCompleted: today, tier: 'tier-2' },
    { id: 'comp-2', title: 'Schedule appointment', category: 'family', timeframe: 'near', isCompleted: true, dateAdded: yesterday, dateCompleted: today },
    { id: 'comp-3', title: 'Workout', category: 'health', timeframe: 'near', isCompleted: true, dateAdded: yesterday, dateCompleted: today },
    { id: 'comp-4', title: 'Reach out to mentor', category: 'career', timeframe: 'near', isCompleted: true, dateAdded: twoDaysAgo, dateCompleted: today, tier: 'tier-3' },
    { id: 'comp-5', title: 'Grocery shopping', category: 'family', timeframe: 'near', isCompleted: true, dateAdded: yesterday, dateCompleted: today },

    // --- ALL HISTORICAL COMPLETIONS (OLDER COMPLETED DATES) ---
    { id: 'hist-1', title: 'Prepare presentation', category: 'work', timeframe: 'near', isCompleted: true, dateAdded: twoDaysAgo, dateCompleted: yesterday, tier: 'tier-3' },
    { id: 'hist-2', title: 'Buy groceries', category: 'family', timeframe: 'near', isCompleted: true, dateAdded: yesterday, dateCompleted: yesterday },
    { id: 'hist-3', title: 'Avoid alcohol', category: 'health', timeframe: 'near', isCompleted: true, dateAdded: twoDaysAgo, dateCompleted: twoDaysAgo },
    { id: 'hist-4', title: 'Read one sector report', category: 'career', timeframe: 'near', isCompleted: true, dateAdded: twoDaysAgo, dateCompleted: yesterday, tier: 'tier-1' },
    { id: 'hist-5', title: 'Pay electricity bill', category: 'family', timeframe: 'near', isCompleted: true, dateAdded: twoDaysAgo, dateCompleted: yesterday },
    { id: 'hist-6', title: 'Client meeting', category: 'work', timeframe: 'near', isCompleted: true, dateAdded: twoDaysAgo, dateCompleted: twoDaysAgo, tier: 'tier-2' },
  ];
};

const INITIAL_PRIORITIES_WEEK = [
  'Finalize project proposal',
  'Workout 4x',
  'Client meeting',
  'Review team updates',
  'Grocery shopping',
];

const INITIAL_PRIORITIES_MONTH = [
  'Achieve sales target',
  'Launch new feature',
  'Workout 20x',
  'Save $500',
  'Read 4 books',
];

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
  const [activeTab, setActiveTab] = useState<'daily' | 'health' | 'goals'>('daily');
  const [theme, setTheme] = useState<'dark-glassmorphism' | 'light-neumorphic' | 'cyberpunk'>('dark-glassmorphism');

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

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
    </div>
  );
}
