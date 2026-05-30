import React, { useState } from 'react';
import { GlassCard } from './GlassCard';

export interface Habit {
  id: string;
  name: string;
  target: number;
  isSubHabit?: boolean;
  parentId?: string;
  history: Record<string, boolean>; // Key: "YYYY-MM-DD"
}

interface TabHealthScorecardProps {
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
}

export const TabHealthScorecard: React.FC<TabHealthScorecardProps> = ({
  habits,
  setHabits,
}) => {
  // Reference date for the active week view. Defaults to today.
  const [referenceDate, setReferenceDate] = useState(() => new Date());

  // Shift week by +/- 7 days
  const shiftWeek = (direction: 'prev' | 'next') => {
    setReferenceDate(prev => {
      const nextDate = new Date(prev);
      nextDate.setDate(prev.getDate() + (direction === 'prev' ? -7 : 7));
      return nextDate;
    });
  };

  const setTodayWeek = () => {
    setReferenceDate(new Date());
  };

  // Get dynamic dates for Sun - Sat of the reference week
  const getWeekDates = (refDate: Date): Date[] => {
    const dates: Date[] = [];
    const dayOfWeek = refDate.getDay(); // 0 is Sun, 6 is Sat
    const sunDate = new Date(refDate);
    sunDate.setDate(refDate.getDate() - dayOfWeek); // Go back to Sunday

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunDate);
      d.setDate(sunDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(referenceDate);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const formatDateLabel = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getLogKey = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const toggleHabitDate = (habitId: string, dateKey: string) => {
    setHabits(prevHabits =>
      prevHabits.map(h => {
        if (h.id === habitId) {
          const currentVal = !!h.history[dateKey];
          const updatedHistory = { ...h.history };
          if (currentVal) {
            delete updatedHistory[dateKey];
          } else {
            updatedHistory[dateKey] = true;
          }
          return { ...h, history: updatedHistory };
        }
        return h;
      })
    );
  };

  const handleTargetChange = (habitId: string, targetVal: number) => {
    setHabits(prev =>
      prev.map(h => {
        if (h.id === habitId) {
          return { ...h, target: Math.max(0, Math.min(7, targetVal)) };
        }
        return h;
      })
    );
  };

  // Calculate Week to Date (WTD) completions for current week
  const getWtdCompletions = (habit: Habit): number => {
    let count = 0;
    weekDates.forEach(date => {
      const key = getLogKey(date);
      if (habit.history[key]) {
        count++;
      }
    });
    return count;
  };

  // ----------------------------------------------------
  // Monthly Progress Calculations (Rolling 4-week grid)
  // The window always begins on the most recent Sunday (start of the current
  // ISO week) and runs forward 28 days. Anything before last Sunday is
  // excluded from both the dot grid and the percentage. Days after today are
  // rendered as empty "upcoming" dots and do not count toward the percentage.
  // ----------------------------------------------------

  // The most recent Sunday relative to today (today itself if today is Sunday).
  const getLastSunday = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek); // go back to Sunday
    lastSunday.setHours(0, 0, 0, 0);
    return lastSunday;
  };

  // Midnight today, for comparing whether a dot is in the past, present, or future.
  const getTodayMidnight = (): Date => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  };

  const getMonthlyDots = (
    habit: Habit
  ): { dateKey: string; isCompleted: boolean; isFuture: boolean }[] => {
    const dots: { dateKey: string; isCompleted: boolean; isFuture: boolean }[] = [];
    const lastSunday = getLastSunday();
    const todayMidnight = getTodayMidnight().getTime();

    // 4 weeks (28 days) of dots starting from last Sunday, going forward.
    for (let i = 0; i < 28; i++) {
      const d = new Date(lastSunday);
      d.setDate(lastSunday.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const key = getLogKey(d);
      dots.push({
        dateKey: key,
        isCompleted: !!habit.history[key],
        isFuture: d.getTime() > todayMidnight,
      });
    }
    return dots;
  };

  // Rolling percentage: completions since last Sunday / days elapsed since last
  // Sunday (inclusive of today). Missed days drag it down; future days are
  // ignored. On Sunday this is x/1, Monday x/2, etc.
  const getMonthlyCompliance = (habit: Habit): number => {
    const lastSunday = getLastSunday();
    const todayMidnight = getTodayMidnight();
    const daysElapsed =
      Math.floor((todayMidnight.getTime() - lastSunday.getTime()) / 86400000) + 1;

    if (daysElapsed <= 0) return 0;

    let completed = 0;
    for (let i = 0; i < daysElapsed; i++) {
      const d = new Date(lastSunday);
      d.setDate(lastSunday.getDate() + i);
      if (habit.history[getLogKey(d)]) {
        completed++;
      }
    }
    return Math.round((completed / daysElapsed) * 100);
  };

  const lastSunday = getLastSunday();

  return (
    <div className="health-scorecard-tab">
      {/* Table Header and Control Ribbon */}
      <GlassCard className="scorecard-controls-card">
        <div className="scorecard-controls-header">
          <div className="controls-title-group">
            <div>
              <div className="title">Health & Fitness Weekly Scorecard</div>
              <div className="date-range">
                Week of {formatDateLabel(weekStart)} – {formatDateLabel(weekEnd)}, {weekStart.getFullYear()}
              </div>
            </div>
          </div>
          
          <div className="controls-nav-group">
            <button className="nav-btn" onClick={() => shiftWeek('prev')} title="Previous Week">◀</button>
            <button className="today-nav-btn" onClick={setTodayWeek}>This Week</button>
            <button className="nav-btn" onClick={() => shiftWeek('next')} title="Next Week">▶</button>
          </div>
        </div>
      </GlassCard>

      {/* Habits & Metrics Weekly Table */}
      <GlassCard className="scorecard-table-card">
        <div className="table-wrapper">
          <table className="scorecard-table">
            <thead>
              <tr>
                <th className="habit-header-cell">Habit / Metric</th>
                {weekDates.map(date => {
                  const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = date.getDate();
                  const isToday = getLogKey(date) === getLogKey(new Date());

                  return (
                    <th key={getLogKey(date)} className={`calendar-day-header ${isToday ? 'today-day' : ''}`}>
                      <div className="day-lbl">{dayLabel}</div>
                      <div className="day-num">{dayNum}</div>
                    </th>
                  );
                })}
                <th className="stats-header-cell">Current (WTD)</th>
                <th className="stats-header-cell">Target</th>
              </tr>
            </thead>
            <tbody>
              {habits.map(habit => {
                const wtd = getWtdCompletions(habit);
                const isGoalMet = wtd >= habit.target;

                return (
                  <tr 
                    key={habit.id} 
                    className={`scorecard-row ${habit.isSubHabit ? 'sub-habit-row' : ''}`}
                  >
                    <td className="habit-name-cell">
                      {habit.isSubHabit ? (
                        <span className="sub-indent">↳ • {habit.name}</span>
                      ) : (
                        <span className="parent-habit">{habit.name}</span>
                      )}
                    </td>

                    {weekDates.map(date => {
                      const key = getLogKey(date);
                      const isChecked = !!habit.history[key];

                      return (
                        <td key={key} className="scorecard-cell">
                          <button
                            onClick={() => toggleHabitDate(habit.id, key)}
                            className={`scorecard-check-btn ${isChecked ? 'checked' : 'unchecked'}`}
                          >
                            {isChecked ? '✓' : '○'}
                          </button>
                        </td>
                      );
                    })}

                    <td className={`wtd-cell ${isGoalMet ? 'goal-achieved' : 'goal-pending'}`}>
                      {wtd}
                    </td>

                    <td className="target-cell">
                      <input
                        type="number"
                        min="0"
                        max="7"
                        value={habit.target}
                        onChange={(e) => handleTargetChange(habit.id, parseInt(e.target.value) || 0)}
                        className="target-input"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Monthly Progress Matrix Grid */}
      <GlassCard className="monthly-progress-card">
        <div className="monthly-progress-header">
          <div>
            <div className="title">Monthly Rolling Progress</div>
            <div className="subtitle">4-week window starting {formatDateLabel(lastSunday)} (last Sunday) · % is rolling, this week onward</div>
          </div>
        </div>

        <div className="monthly-legend">
          <span className="legend-title">Weeks Key:</span>
          <div className="legend-item"><span className="dot dot-w1"></span>Week 1</div>
          <div className="legend-item"><span className="dot dot-w2"></span>Week 2</div>
          <div className="legend-item"><span className="dot dot-w3"></span>Week 3</div>
          <div className="legend-item"><span className="dot dot-w4"></span>Week 4</div>
        </div>

        <div className="monthly-metrics-grid">
          {habits.map(habit => {
            const dots = getMonthlyDots(habit);
            const rate = getMonthlyCompliance(habit);

            return (
              <div key={`month-row-${habit.id}`} className="monthly-progress-row">
                <div className="monthly-habit-name">
                  {habit.isSubHabit ? `• ${habit.name}` : habit.name}
                </div>

                <div className="monthly-dots-grid">
                  {dots.map((dot, idx) => {
                    // Divide into 4 colored week segments of 7 dots each
                    const weekIdx = Math.floor(idx / 7) + 1;
                    const colorClass = `week-color-${weekIdx}`;

                    const statusClass = dot.isFuture
                      ? 'upcoming'
                      : dot.isCompleted
                        ? 'active'
                        : 'inactive';
                    const statusLabel = dot.isFuture
                      ? 'Upcoming'
                      : dot.isCompleted
                        ? 'Completed'
                        : 'Missed';

                    return (
                      <span
                        key={dot.dateKey + '-' + idx}
                        className={`progress-dot ${colorClass} ${statusClass}`}
                        title={`${dot.dateKey}: ${statusLabel}`}
                      />
                    );
                  })}
                </div>

                <div className="monthly-rate-cell">
                  <div className="compliance-percentage">{rate}%</div>
                  <div 
                    className="compliance-bar-outer" 
                    title={`${rate}% Overall Compliance`}
                  >
                    <div 
                      className="compliance-bar-inner" 
                      style={{ 
                        width: `${rate}%`,
                        backgroundColor: rate >= 80 ? 'var(--success)' : rate >= 50 ? 'var(--color-health)' : '#ef4444'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
};
