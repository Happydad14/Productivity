import React, { useState } from 'react';
import { GlassCard } from './GlassCard';

export interface Goal {
  id: string;
  title: string;
  category: 'work' | 'career' | 'family' | 'health';
  term: 'medium' | 'long';
  isAchieved: boolean;
  dateAdded: string; // MM/DD/YY
}

interface TabGoalsTargetsProps {
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
}

const CATEGORIES = [
  { id: 'work', label: 'Work Goals', color: 'var(--color-work)', rgb: 'var(--color-work-rgb)' },
  { id: 'career', label: 'Career Goals', color: 'var(--color-career)', rgb: 'var(--color-career-rgb)' },
  { id: 'family', label: 'Home & Family Goals', color: 'var(--color-family)', rgb: 'var(--color-family-rgb)' },
  { id: 'health', label: 'Health & Fitness Goals', color: 'var(--color-health)', rgb: 'var(--color-health-rgb)' },
] as const;

export const TabGoalsTargets: React.FC<TabGoalsTargetsProps> = ({
  goals,
  setGoals,
}) => {
  const [newGoalTexts, setNewGoalTexts] = useState<Record<string, string>>({});

  const toggleGoal = (goalId: string) => {
    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          return { ...g, isAchieved: !g.isAchieved };
        }
        return g;
      })
    );
  };

  const handleAddGoal = (category: 'work' | 'career' | 'family' | 'health', term: 'medium' | 'long') => {
    const key = `${category}-${term}`;
    const title = newGoalTexts[key]?.trim();
    if (!title) return;

    const todayStr = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    });

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title,
      category,
      term,
      isAchieved: false,
      dateAdded: todayStr,
    };

    setGoals(prev => [...prev, newGoal]);
    setNewGoalTexts(prev => ({ ...prev, [key]: '' }));
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
  };

  return (
    <div className="goals-targets-tab">
      {/* Intro Ribbon */}
      <GlassCard className="goals-header-card">
        <div className="goals-header-content">
          <div>
            <div className="title">Strategic Goals & Targets</div>
            <div className="subtitle">Laying out long-term visions and medium-term milestones across categories</div>
          </div>
        </div>
      </GlassCard>

      {/* Grid of Categories */}
      <div className="goals-grid">
        {CATEGORIES.map(cat => {
          const catGoals = goals.filter(g => g.category === cat.id);
          const mediumTerm = catGoals.filter(g => g.term === 'medium');
          const longTerm = catGoals.filter(g => g.term === 'long');

          return (
            <GlassCard key={cat.id} accentColor={cat.rgb} className="goals-category-card">
              <div className="goals-cat-header" style={{ color: cat.color }}>
                <span className="cat-label">{cat.label}</span>
              </div>

              <div className="goals-terms-split">
                {/* Medium Term Goals */}
                <div className="term-column">
                  <div className="term-column-title">Medium Term</div>
                  
                  <div className="goals-list">
                    {mediumTerm.map(goal => (
                      <div 
                        key={goal.id} 
                        className={`goal-item ${goal.isAchieved ? 'achieved' : ''}`}
                      >
                        <label className="goal-checkbox-container">
                          <input
                            type="checkbox"
                            checked={goal.isAchieved}
                            onChange={() => toggleGoal(goal.id)}
                          />
                          <span className="checkbox-custom" style={{ borderColor: cat.color }}></span>
                          <span className="goal-text">{goal.title}</span>
                        </label>
                        <button 
                          className="delete-goal-btn" 
                          onClick={() => handleDeleteGoal(goal.id)}
                          title="Delete Goal"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    
                    <div className="add-goal-row">
                      <input
                        type="text"
                        placeholder="+ Add Milestone..."
                        value={newGoalTexts[`${cat.id}-medium`] || ''}
                        onChange={(e) => setNewGoalTexts(prev => ({ ...prev, [`${cat.id}-medium`]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddGoal(cat.id, 'medium')}
                        className="add-goal-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Long Term Goals */}
                <div className="term-column">
                  <div className="term-column-title">Long Term</div>
                  
                  <div className="goals-list">
                    {longTerm.map(goal => (
                      <div 
                        key={goal.id} 
                        className={`goal-item ${goal.isAchieved ? 'achieved' : ''}`}
                      >
                        <label className="goal-checkbox-container">
                          <input
                            type="checkbox"
                            checked={goal.isAchieved}
                            onChange={() => toggleGoal(goal.id)}
                          />
                          <span className="checkbox-custom" style={{ borderColor: cat.color }}></span>
                          <span className="goal-text">{goal.title}</span>
                        </label>
                        <button 
                          className="delete-goal-btn" 
                          onClick={() => handleDeleteGoal(goal.id)}
                          title="Delete Goal"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    
                    <div className="add-goal-row">
                      <input
                        type="text"
                        placeholder="+ Add Vision..."
                        value={newGoalTexts[`${cat.id}-long`] || ''}
                        onChange={(e) => setNewGoalTexts(prev => ({ ...prev, [`${cat.id}-long`]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddGoal(cat.id, 'long')}
                        className="add-goal-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
