'use client';

import { useState, useEffect } from 'react';
import { Button } from '../shared/Button';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { Habit } from '@/types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEMES = [
  { id: 'terminal-classic', name: 'Terminal Classic', category: 'dark' },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'dark' },
  { id: 'synthwave', name: 'Synthwave', category: 'dark' },
  { id: 'obsidian', name: 'Obsidian', category: 'dark' },
  { id: 'hacker-matrix', name: 'Matrix', category: 'dark' },
  { id: 'nord', name: 'Nord', category: 'dark' },
  { id: 'scandinavian', name: 'Scandinavian', category: 'light' },
  { id: 'paper-notebook', name: 'Paper Notebook', category: 'light' },
  { id: 'sepia', name: 'Sepia', category: 'light' },
  { id: 'minimal-white', name: 'Minimal White', category: 'light' },
];

const DEFAULT_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeaa7',
  '#dfe6e9',
  '#fd79a8',
  '#00b894',
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    theme,
    week_colors,
    notifications_enabled,
    setTheme,
    setWeekColor,
    setNotificationsEnabled,
    saveSettings,
  } = useSettingsStore();

  const { habits, dailyLogs, tasks, habitCompletions } = useLogStore();
  const { goals } = useGoalStore();
  const {
    pendingProposals,
    detectedKeywords,
    isLoadingProposals,
    isAnalyzingNotes,
    fetchProposals,
    analyzeForProposals,
    approveProposal,
    rejectProposal,
  } = useAnalyticsStore();

  const [activeSection, setActiveSection] = useState<string | null>('theme');
  const [isSaving, setIsSaving] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', targetMinutes: '' });
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Fetch proposals when settings panel opens
  useEffect(() => {
    if (isOpen) {
      fetchProposals();
    }
  }, [isOpen, fetchProposals]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings();
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHabit = async () => {
    if (!newHabit.name.trim()) return;

    const habit: Habit = {
      habit_id: `h_${Date.now()}`,
      name: newHabit.name.trim(),
      target_minutes: newHabit.targetMinutes ? Number(newHabit.targetMinutes) : null,
      days_active: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      active: true,
      sort_order: habits.length,
      created_at: new Date().toISOString(),
    };

    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habit),
      });
      setNewHabit({ name: '', targetMinutes: '' });
      // Refresh data would happen via store
    } catch (error) {
      console.error('Failed to add habit:', error);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await fetch(`/api/habits?id=${habitId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };

  const handleExportData = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      goals,
      tasks,
      dailyLogs,
      habits,
      habitCompletions,
      settings: { theme, week_colors, notifications_enabled },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.exportedAt) {
        throw new Error('Invalid export file: missing exportedAt timestamp');
      }

      // Count items to import
      const counts = {
        goals: data.goals?.length || 0,
        tasks: data.tasks?.length || 0,
        dailyLogs: data.dailyLogs?.length || 0,
        habits: data.habits?.length || 0,
        habitCompletions: data.habitCompletions?.length || 0,
      };

      // Send to import API
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      setImportSuccess(true);
      // Reset file input
      event.target.value = '';
    } catch (error) {
      setImportError((error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed right-0 top-0 h-full w-80 z-50 flex flex-col animate-slideIn"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-tertiary"
          style={{ color: 'var(--text-muted)' }}
        >
          X
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Theme Section */}
        <SettingsSection
          title="Theme & Appearance"
          isOpen={activeSection === 'theme'}
          onToggle={() =>
            setActiveSection(activeSection === 'theme' ? null : 'theme')
          }
        >
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Choose your visual style
            </p>

            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="p-3 rounded text-left text-sm"
                  style={{
                    backgroundColor:
                      theme === t.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color:
                      theme === t.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </SettingsSection>

        {/* Week Colors Section */}
        <SettingsSection
          title="Week Colors"
          isOpen={activeSection === 'colors'}
          onToggle={() =>
            setActiveSection(activeSection === 'colors' ? null : 'colors')
          }
        >
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Customize week row colors
            </p>

            {[1, 2, 3, 4, 5].map((week) => (
              <div key={week} className="flex items-center gap-2">
                <span
                  className="text-sm w-16"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Week {week}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setWeekColor(String(week), color)}
                      className="w-6 h-6 rounded"
                      style={{
                        backgroundColor: color,
                        border:
                          week_colors[String(week)] === color
                            ? '2px solid var(--text-primary)'
                            : '1px solid var(--border-color)',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>

        {/* Habits Section */}
        <SettingsSection
          title="Habits"
          isOpen={activeSection === 'habits'}
          onToggle={() =>
            setActiveSection(activeSection === 'habits' ? null : 'habits')
          }
        >
          <div className="space-y-3">
            {/* Existing Habits */}
            {habits.length > 0 && (
              <div className="space-y-2">
                {habits.map((habit) => (
                  <div
                    key={habit.habit_id}
                    className="flex items-center justify-between p-2 rounded"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: habit.active
                            ? 'var(--accent-success)'
                            : 'var(--text-muted)',
                        }}
                      />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {habit.name}
                      </span>
                      {habit.target_minutes && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          ({habit.target_minutes}m)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteHabit(habit.habit_id)}
                      className="text-xs px-2 py-1 rounded hover:opacity-80"
                      style={{ color: 'var(--accent-error)' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Habit */}
            <div className="space-y-2">
              <input
                type="text"
                value={newHabit.name}
                onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                placeholder="New habit name..."
                className="w-full px-2 py-1.5 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddHabit();
                }}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newHabit.targetMinutes}
                  onChange={(e) => setNewHabit({ ...newHabit, targetMinutes: e.target.value })}
                  placeholder="Target min (optional)"
                  className="flex-1 px-2 py-1.5 rounded text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                />
                <Button onClick={handleAddHabit} size="sm" disabled={!newHabit.name.trim()}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection
          title="Notifications"
          isOpen={activeSection === 'notifications'}
          onToggle={() =>
            setActiveSection(
              activeSection === 'notifications' ? null : 'notifications'
            )
          }
        >
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications_enabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Enable notifications
              </span>
            </label>
          </div>
        </SettingsSection>

        {/* Data Management Section */}
        <SettingsSection
          title="Data Management"
          isOpen={activeSection === 'export'}
          onToggle={() =>
            setActiveSection(activeSection === 'export' ? null : 'export')
          }
        >
          <div className="space-y-4">
            {/* Export */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Export Data
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Download all your data as JSON
              </p>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <ul className="ml-3 space-y-0.5">
                  <li>• {goals.length} goals</li>
                  <li>• {tasks.length} tasks</li>
                  <li>• {dailyLogs.length} daily logs</li>
                  <li>• {habits.length} habits</li>
                  <li>• {habitCompletions.length} habit records</li>
                </ul>
              </div>
              <Button onClick={handleExportData} size="sm" variant="ghost">
                Download Export
              </Button>
            </div>

            {/* Divider */}
            <div
              className="border-t"
              style={{ borderColor: 'var(--border-color)' }}
            />

            {/* Import */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Import Data
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Restore from a previous export (will merge with existing data)
              </p>

              <label
                className="block cursor-pointer"
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  disabled={isImporting}
                  className="hidden"
                />
                <div
                  className="px-3 py-2 rounded text-sm text-center"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px dashed var(--border-color)',
                    color: isImporting ? 'var(--text-muted)' : 'var(--text-secondary)',
                  }}
                >
                  {isImporting ? 'Importing...' : 'Choose file to import'}
                </div>
              </label>

              {importError && (
                <div
                  className="text-xs p-2 rounded"
                  style={{
                    backgroundColor: 'var(--accent-error)',
                    color: 'var(--bg-primary)',
                  }}
                >
                  Error: {importError}
                </div>
              )}

              {importSuccess && (
                <div
                  className="text-xs p-2 rounded"
                  style={{
                    backgroundColor: 'var(--accent-success)',
                    color: 'var(--bg-primary)',
                  }}
                >
                  Import successful! Refresh to see changes.
                </div>
              )}
            </div>
          </div>
        </SettingsSection>

        {/* Smart Fields Section */}
        <SettingsSection
          title="Smart Fields"
          isOpen={activeSection === 'smart-fields'}
          onToggle={() =>
            setActiveSection(activeSection === 'smart-fields' ? null : 'smart-fields')
          }
        >
          <div className="space-y-4">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Claude analyzes your notes and suggests new fields to track
            </p>

            {/* Analyze Button */}
            <Button
              onClick={analyzeForProposals}
              size="sm"
              variant="ghost"
              disabled={isAnalyzingNotes}
            >
              {isAnalyzingNotes ? 'Analyzing...' : 'Analyze Notes for Patterns'}
            </Button>

            {/* Pending Proposals */}
            {isLoadingProposals ? (
              <div className="text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>
                Loading proposals...
              </div>
            ) : pendingProposals.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Suggested Fields ({pendingProposals.length})
                </h4>
                {pendingProposals.map((proposal) => (
                  <div
                    key={proposal.proposal_id}
                    className="p-3 rounded space-y-2"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {proposal.field_name.replace(/_/g, ' ')}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {proposal.field_type}
                      </span>
                    </div>

                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {proposal.rationale}
                    </p>

                    {proposal.expected_insight && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Expected insight: {proposal.expected_insight}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        onClick={() => approveProposal(proposal.proposal_id)}
                        size="sm"
                        className="flex-1"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => rejectProposal(proposal.proposal_id)}
                        size="sm"
                        variant="ghost"
                        className="flex-1"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
                No pending field suggestions. Click &quot;Analyze Notes&quot; to find patterns.
              </div>
            )}

            {/* Detected Keywords */}
            {detectedKeywords.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Detected Keywords
                </h4>
                <div className="flex flex-wrap gap-1">
                  {detectedKeywords.slice(0, 10).map((kw) => (
                    <span
                      key={kw.keyword}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {kw.keyword} ({kw.count})
                    </span>
                  ))}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  These words appear frequently in your notes
                </p>
              </div>
            )}
          </div>
        </SettingsSection>
      </div>

      {/* Footer */}
      <div
        className="p-4 border-t"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? 'Saving...' : 'Save & Close'}
        </Button>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 rounded hover:bg-tertiary"
        style={{
          backgroundColor: isOpen ? 'var(--bg-tertiary)' : 'transparent',
        }}
      >
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {isOpen ? '▼' : '▶'} {title}
        </span>
      </button>

      {isOpen && (
        <div
          className="p-3 rounded-b"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
