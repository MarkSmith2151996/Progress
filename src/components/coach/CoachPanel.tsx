'use client';

import { useState, useEffect, useRef } from 'react';
import { ProgressBar } from '../shared/ProgressBar';
import { Alert } from '../shared/Alert';
import { useCoachStore } from '@/stores/coachStore';
import { useGoalStore } from '@/stores/goalStore';
import { useLogStore } from '@/stores/logStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { calculateLoggingStreak, calculateWeeklyScore } from '@/lib/metrics';
import { differenceInDays, parseISO, startOfWeek, endOfWeek, format } from 'date-fns';

interface CoachPanelProps {
  minimized: boolean;
  onToggle: () => void;
}

export function CoachPanel({ minimized, onToggle }: CoachPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [recordsExpanded, setRecordsExpanded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const {
    summary,
    chatHistory,
    alerts,
    isLoadingSummary,
    isLoadingChat,
    fetchSummary,
    sendMessage,
    dismissAlert,
  } = useCoachStore();

  const { goals, getActiveGoals } = useGoalStore();
  const { dailyLogs, tasks, habitCompletions, habits, getTodayHabits } = useLogStore();

  const {
    correlations,
    patterns,
    predictiveAlerts,
    overallHealth,
    keyInsight,
    personalRecords,
    currentStreak,
    streakMilestone,
    nextMilestone,
    isLoadingAnalysis,
    fetchAnalysis,
  } = useAnalyticsStore();

  const activeGoals = getActiveGoals();
  const todayHabits = getTodayHabits();
  const streak = calculateLoggingStreak(dailyLogs);
  const habitsCompleted = todayHabits.filter((h) => h.completed).length;
  const activeAlerts = alerts.filter((a) => !a.dismissed);

  // Calculate weekly score
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const weeklyScore = calculateWeeklyScore(
    tasks,
    goals,
    habitCompletions,
    habits,
    dailyLogs
  );

  // Calculate weekly habit completion %
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const activeHabits = habits.filter((h) => h.active);
  const weekCompletions = habitCompletions.filter(
    (hc) => hc.date >= weekStartStr && hc.completed
  );
  const expectedHabitDays = activeHabits.length * 7; // simplified
  const weeklyHabitPercent = expectedHabitDays > 0
    ? Math.round((weekCompletions.length / expectedHabitDays) * 100)
    : 0;

  // Find nearest deadline
  const nearestDeadline = activeGoals
    .filter((g) => g.deadline)
    .map((g) => ({
      title: g.title,
      daysLeft: differenceInDays(parseISO(g.deadline), today),
    }))
    .filter((d) => d.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  useEffect(() => {
    fetchSummary();
    fetchAnalysis();
  }, [fetchSummary, fetchAnalysis]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoadingChat) return;

    sendMessage(inputValue.trim());
    setInputValue('');
  };

  if (minimized) {
    return (
      <div
        className="fixed right-0 top-0 h-full w-12 flex flex-col items-center justify-start pt-4"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-color)',
        }}
      >
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center rounded"
          style={{
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
          title="Expand Coach"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 h-full flex flex-col"
      style={{
        width: '340px',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <h2
          className="font-bold terminal-cursor"
          style={{ color: 'var(--text-primary)' }}
        >
          {'> THE COACH'}
        </h2>
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-tertiary"
          style={{ color: 'var(--text-muted)' }}
          title="Minimize"
        >
          -
        </button>
      </div>

      {/* Summary Section */}
      <div
        className="p-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <h3
          className="text-xs font-bold mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          SUMMARY
        </h3>

        <div
          className="p-3 rounded mb-3"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Goal Progress */}
          {activeGoals.slice(0, 3).map((goal) => (
            <div key={goal.goal_id} className="mb-3">
              <ProgressBar
                label={goal.title.length > 20 ? goal.title.slice(0, 20) + '...' : goal.title}
                value={goal.progress}
                size="sm"
                color={
                  goal.statusIndicator === 'ahead'
                    ? 'success'
                    : goal.statusIndicator === 'behind'
                    ? 'warning'
                    : 'accent'
                }
              />
            </div>
          ))}

          {/* Stats */}
          <div className="space-y-1.5 text-sm">
            {/* Weekly Score */}
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-secondary)' }}>Week score:</span>
              <span
                className="font-bold"
                style={{
                  color: weeklyScore >= 70
                    ? 'var(--accent-success)'
                    : weeklyScore >= 40
                    ? 'var(--accent-warning)'
                    : 'var(--accent-error)',
                }}
              >
                {weeklyScore}
              </span>
            </div>

            {/* Streak with milestone */}
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-secondary)' }}>Streak:</span>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-primary)' }}>{currentStreak || streak} days</span>
                {streakMilestone && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--accent-success)',
                      color: 'var(--bg-primary)',
                    }}
                  >
                    {streakMilestone.label}
                  </span>
                )}
              </div>
            </div>
            {nextMilestone && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Next:</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {nextMilestone.label} ({nextMilestone.message})
                </span>
              </div>
            )}

            {/* Habits Today */}
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Habits today:</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {habitsCompleted}/{todayHabits.length}
              </span>
            </div>

            {/* Habits This Week */}
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Habits week:</span>
              <span style={{ color: 'var(--text-primary)' }}>{weeklyHabitPercent}%</span>
            </div>

            {/* Nearest Deadline */}
            {nearestDeadline && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Next deadline:</span>
                <span
                  style={{
                    color: nearestDeadline.daysLeft <= 7
                      ? 'var(--accent-warning)'
                      : 'var(--text-primary)',
                  }}
                >
                  {nearestDeadline.daysLeft}d
                </span>
              </div>
            )}

            {/* Alerts - clickable */}
            {activeAlerts.length > 0 && (
              <button
                onClick={() => setAlertsExpanded(!alertsExpanded)}
                className="flex justify-between w-full hover:opacity-80"
              >
                <span style={{ color: 'var(--text-secondary)' }}>
                  Alerts {alertsExpanded ? '▼' : '▶'}
                </span>
                <span style={{ color: 'var(--accent-warning)' }}>
                  {activeAlerts.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Coach Message */}
        <div
          className="text-sm p-3 rounded"
          style={{
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {isLoadingSummary ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            summary || 'Welcome! Start logging to get personalized insights.'
          )}
        </div>
      </div>

      {/* Alerts - Expandable */}
      {alertsExpanded && activeAlerts.length > 0 && (
        <div
          className="p-4 border-b max-h-40 overflow-y-auto"
          style={{ borderColor: 'var(--border-color)' }}
        >
          {activeAlerts.map((alert) => (
            <Alert
              key={alert.id}
              level={alert.level}
              message={alert.contextualMessage || alert.message}
              onDismiss={() => dismissAlert(alert.id)}
            />
          ))}
        </div>
      )}

      {/* Insights Section */}
      <div
        className="border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button
          onClick={() => setInsightsExpanded(!insightsExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-tertiary"
        >
          <span
            className="text-xs font-bold"
            style={{ color: 'var(--text-muted)' }}
          >
            {insightsExpanded ? '▼' : '▶'} INSIGHTS
          </span>
          {overallHealth && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor:
                  overallHealth === 'excellent'
                    ? 'var(--accent-success)'
                    : overallHealth === 'good'
                    ? 'var(--accent-primary)'
                    : overallHealth === 'fair'
                    ? 'var(--accent-warning)'
                    : 'var(--accent-error)',
                color: 'var(--bg-primary)',
              }}
            >
              {overallHealth.replace('_', ' ')}
            </span>
          )}
        </button>

        {insightsExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {isLoadingAnalysis ? (
              <div className="text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>
                Analyzing patterns...
              </div>
            ) : (
              <>
                {/* Key Insight */}
                {keyInsight && (
                  <div
                    className="p-2 rounded text-sm"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--accent-primary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span style={{ color: 'var(--accent-primary)' }}>TIP:</span> {keyInsight}
                  </div>
                )}

                {/* Correlations */}
                {correlations.length > 0 && (
                  <div>
                    <h4 className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      CORRELATIONS
                    </h4>
                    <div className="space-y-1.5">
                      {correlations
                        .filter((c) => Math.abs(c.correlation) >= 0.3)
                        .slice(0, 3)
                        .map((c, i) => (
                          <div
                            key={i}
                            className="text-xs p-2 rounded"
                            style={{ backgroundColor: 'var(--bg-primary)' }}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {c.factor1} → {c.factor2}
                              </span>
                              <span
                                style={{
                                  color:
                                    c.correlation > 0
                                      ? 'var(--accent-success)'
                                      : 'var(--accent-error)',
                                }}
                              >
                                {c.correlation > 0 ? '+' : ''}
                                {Math.round(c.correlation * 100)}%
                              </span>
                            </div>
                            {c.recommendation && (
                              <div style={{ color: 'var(--text-muted)' }}>{c.recommendation}</div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Patterns */}
                {patterns.length > 0 && (
                  <div>
                    <h4 className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      PATTERNS
                    </h4>
                    <div className="space-y-1.5">
                      {patterns.slice(0, 3).map((p, i) => (
                        <div
                          key={i}
                          className="text-xs p-2 rounded"
                          style={{ backgroundColor: 'var(--bg-primary)' }}
                        >
                          <div
                            className="flex items-center gap-1 mb-1"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  p.confidence === 'high'
                                    ? 'var(--accent-success)'
                                    : p.confidence === 'medium'
                                    ? 'var(--accent-warning)'
                                    : 'var(--text-muted)',
                              }}
                            />
                            {p.insight}
                          </div>
                          <div style={{ color: 'var(--text-muted)' }}>{p.recommendation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Predictive Alerts */}
                {predictiveAlerts.length > 0 && (
                  <div>
                    <h4 className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      PREDICTIONS
                    </h4>
                    <div className="space-y-1.5">
                      {predictiveAlerts.slice(0, 3).map((a, i) => (
                        <div
                          key={i}
                          className="text-xs p-2 rounded"
                          style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderLeft: `2px solid ${
                              a.level === 'critical'
                                ? 'var(--accent-error)'
                                : a.level === 'warning'
                                ? 'var(--accent-warning)'
                                : a.level === 'positive'
                                ? 'var(--accent-success)'
                                : 'var(--text-muted)'
                            }`,
                          }}
                        >
                          <div style={{ color: 'var(--text-secondary)' }}>{a.message}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{a.actionable}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {correlations.length === 0 && patterns.length === 0 && predictiveAlerts.length === 0 && (
                  <div className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                    Keep logging to unlock insights
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Personal Records Section */}
      <div
        className="border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button
          onClick={() => setRecordsExpanded(!recordsExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-tertiary"
        >
          <span
            className="text-xs font-bold"
            style={{ color: 'var(--text-muted)' }}
          >
            {recordsExpanded ? '▼' : '▶'} RECORDS
          </span>
        </button>

        {recordsExpanded && personalRecords && (
          <div className="px-4 pb-4 space-y-2">
            {/* Best Weekly Score */}
            {personalRecords.bestWeeklyScore && (
              <div
                className="flex justify-between text-xs p-2 rounded"
                style={{ backgroundColor: 'var(--bg-primary)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>Best week:</span>
                <span style={{ color: 'var(--accent-success)' }}>
                  {personalRecords.bestWeeklyScore.score} pts ({personalRecords.bestWeeklyScore.weekId})
                </span>
              </div>
            )}

            {/* Longest Logging Streak */}
            <div
              className="flex justify-between text-xs p-2 rounded"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Best streak:</span>
              <span style={{ color: 'var(--accent-primary)' }}>
                {personalRecords.longestLoggingStreak} days
              </span>
            </div>

            {/* Longest Habit Streak */}
            {personalRecords.longestHabitStreak && (
              <div
                className="flex justify-between text-xs p-2 rounded"
                style={{ backgroundColor: 'var(--bg-primary)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>Best habit:</span>
                <span style={{ color: 'var(--accent-primary)' }}>
                  {personalRecords.longestHabitStreak.habitName} ({personalRecords.longestHabitStreak.days}d)
                </span>
              </div>
            )}

            {/* Most Productive Day */}
            {personalRecords.mostProductiveDay && personalRecords.mostProductiveDay.tasks > 0 && (
              <div
                className="flex justify-between text-xs p-2 rounded"
                style={{ backgroundColor: 'var(--bg-primary)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>Most tasks:</span>
                <span style={{ color: 'var(--accent-primary)' }}>
                  {personalRecords.mostProductiveDay.tasks} ({personalRecords.mostProductiveDay.date})
                </span>
              </div>
            )}

            {/* Best Habit Week */}
            {personalRecords.bestHabitWeek && (
              <div
                className="flex justify-between text-xs p-2 rounded"
                style={{ backgroundColor: 'var(--bg-primary)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>Best habit week:</span>
                <span style={{ color: 'var(--accent-success)' }}>
                  {Math.round(personalRecords.bestHabitWeek.rate * 100)}% ({personalRecords.bestHabitWeek.weekId})
                </span>
              </div>
            )}

            {/* Empty state */}
            {!personalRecords.bestWeeklyScore &&
              !personalRecords.longestHabitStreak &&
              !personalRecords.mostProductiveDay && (
              <div className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                Keep logging to set personal records
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {chatHistory.length === 0 ? (
          <div
            className="text-sm text-center py-8"
            style={{ color: 'var(--text-muted)' }}
          >
            Ask me anything about your progress
          </div>
        ) : (
          <div className="space-y-3">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm p-2 rounded ${
                  msg.role === 'user' ? 'ml-4' : 'mr-4'
                }`}
                style={{
                  backgroundColor:
                    msg.role === 'user'
                      ? 'var(--bg-tertiary)'
                      : 'var(--bg-primary)',
                  color:
                    msg.role === 'user'
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                }}
              >
                {msg.content}
              </div>
            ))}
            {isLoadingChat && (
              <div
                className="text-sm p-2 mr-4 animate-pulse"
                style={{ color: 'var(--text-muted)' }}
              >
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-primary)' }}>&gt;</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
            disabled={isLoadingChat}
          />
        </div>
      </form>
    </div>
  );
}
