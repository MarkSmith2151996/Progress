'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button } from 'react95';
import { useRouter } from 'next/navigation';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { FontSize, KeyboardSize, CoachTone, DigestFrequency } from '@/types';
import {
  MobileContainer,
  MainWindow,
  ContentArea,
  TitleBar,
  TitleBarButton,
  ScrollArea,
  SectionHeader,
  ListContainer,
  ListItem,
  ListItemText,
  PopupOverlay,
  PopupWindow,
  PopupContent,
  StyledInput,
  StyledTextArea,
  StyledSelect,
  ToggleButton,
  ToggleGroup,
  FormRow,
  FormLabel,
} from '@/components/mobile/MobileShared';

// ============================================
// SETTINGS SPECIFIC STYLES
// ============================================

const SettingsList = styled.div`
  background: #fff;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  margin: 4px 0;
`;

const SettingsItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 8px;
  border-bottom: 1px solid #e0e0e0;
  min-height: 44px;

  &:last-child {
    border-bottom: none;
  }

  &:nth-child(even) {
    background: #f8f8f8;
  }
`;

const ItemContent = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 8px;
`;

const ItemIcon = styled.span<{ color?: string }>`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.color || '#4ecdc4'};
  border: 1px solid #000;
  border-radius: 2px;
  font-size: 12px;
  flex-shrink: 0;
`;

const ItemText = styled.span`
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DeleteButton = styled(Button)`
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  font-size: 12px;
  color: #800000;
  margin-left: 8px;
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 8px;
  border-bottom: 1px solid #e0e0e0;
  min-height: 44px;
  background: #fff;

  &:last-child {
    border-bottom: none;
  }
`;

const SettingLabel = styled.span`
  font-size: 12px;
  color: #000;
  font-weight: bold;
  flex-shrink: 0;
`;

const SettingValue = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ColorSwatch = styled.button<{ $color: string; $active?: boolean }>`
  width: 28px;
  height: 28px;
  background: ${props => props.$color};
  border: 2px solid;
  border-color: ${props => props.$active
    ? '#000 #000 #000 #000'
    : '#dfdfdf #808080 #808080 #dfdfdf'};
  box-shadow: ${props => props.$active ? 'inset 0 0 0 2px #fff' : 'none'};
  cursor: pointer;
  padding: 0;

  &:focus {
    outline: none;
  }
`;

const ToggleSwitch = styled.button<{ $on?: boolean }>`
  width: 44px;
  height: 24px;
  background: ${props => props.$on ? '#008000' : '#808080'};
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  position: relative;
  cursor: pointer;
  padding: 0;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.$on ? '20px' : '2px'};
    width: 16px;
    height: 16px;
    background: #c0c0c0;
    border: 1px solid;
    border-color: #dfdfdf #808080 #808080 #dfdfdf;
    transition: left 0.15s;
  }

  &:focus {
    outline: none;
  }
`;

const SectionContent = styled.div<{ $collapsed?: boolean }>`
  display: ${props => props.$collapsed ? 'none' : 'block'};
`;

const CollapsibleHeader = styled(SectionHeader)<{ $collapsed?: boolean }>`
  cursor: pointer;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &::after {
    content: '${props => props.$collapsed ? '+' : '-'}';
    font-size: 14px;
    font-weight: bold;
  }
`;

const AboutSection = styled.div`
  background: #c0c0c0;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  margin: 8px 0;
  padding: 12px;
`;

const AboutTitle = styled.div`
  font-size: 16px;
  font-weight: bold;
  font-style: italic;
  color: #ff00ff;
  text-shadow: 1px 1px 0 #800080;
  margin-bottom: 8px;
`;

const AboutText = styled.p`
  font-size: 11px;
  color: #000;
  margin: 4px 0;
  line-height: 1.4;
`;

const BackButton = styled(Button)`
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
`;

const SmallSelect = styled(StyledSelect)`
  width: auto;
  min-width: 100px;
  padding: 4px 6px;
  font-size: 11px;
`;

const SmallInput = styled(StyledInput)`
  width: 140px;
  padding: 4px 6px;
  font-size: 12px;
`;

const DangerButton = styled(Button)`
  background: #ff6b6b;
  color: #fff;
  font-weight: bold;

  &:hover {
    background: #ff4444;
  }
`;

// ============================================
// CONSTANTS
// ============================================

const ACCENT_COLORS = [
  { name: 'Teal', value: '#008080' },
  { name: 'Navy', value: '#000080' },
  { name: 'Purple', value: '#800080' },
  { name: 'Dark', value: '#2d2d2d' },
  { name: 'Forest', value: '#006400' },
];

const TAB_OPTIONS = [
  { value: 0, label: 'Wins' },
  { value: 1, label: 'To Do' },
  { value: 2, label: 'Monthly Goals' },
  { value: 3, label: 'Goal Summary' },
  { value: 4, label: 'Coach' },
];

const habitColors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
  '#fd79a8', '#a29bfe', '#00b894', '#e17055', '#74b9ff',
];

function getHabitEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('gym') || lower.includes('workout') || lower.includes('exercise')) return '💪';
  if (lower.includes('read')) return '📚';
  if (lower.includes('meditat')) return '🧘';
  if (lower.includes('water') || lower.includes('drink')) return '💧';
  if (lower.includes('sleep') || lower.includes('bed')) return '😴';
  if (lower.includes('walk') || lower.includes('run')) return '🏃';
  if (lower.includes('study') || lower.includes('sat') || lower.includes('learn')) return '📖';
  if (lower.includes('code') || lower.includes('program')) return '💻';
  if (lower.includes('eat') || lower.includes('diet') || lower.includes('food')) return '🥗';
  if (lower.includes('journal') || lower.includes('write')) return '✍️';
  if (lower.includes('pray') || lower.includes('church')) return '🙏';
  if (lower.includes('save') || lower.includes('money')) return '💰';
  return '✓';
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MobileSettingsPage() {
  const router = useRouter();

  // Collapsed sections state
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    profile: false,
    appearance: false,
    coach: true,
    habits: true,
    goals: true,
    data: true,
    about: true,
  });

  // Habit/goal add popups
  const [newHabit, setNewHabit] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [addingHabit, setAddingHabit] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Stores
  const { habits, fetchData, addHabit, deleteHabit } = useLogStore();
  const { goals, fetchGoals, saveGoal, deleteGoal } = useGoalStore();
  const {
    display_name, setDisplayName,
    default_tab, setDefaultTab,
    accent_color, setAccentColor,
    font_size, setFontSize,
    coach_tone, setCoachTone,
    coach_context, setCoachContext,
    digest_enabled, setDigestEnabled,
    digest_frequency, setDigestFrequency,
    keyboard_size, setKeyboardSize,
    show_streaks, setShowStreaks,
    notifications_enabled, setNotificationsEnabled,
    fetchSettings,
  } = useSettingsStore();

  useEffect(() => {
    fetchData();
    fetchGoals();
    fetchSettings();
  }, []);

  const activeHabits = habits.filter((h) => h.active);
  const activeGoals = goals.filter((g) => g.status === 'active');

  const toggleSection = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Habit handlers
  const handleAddHabit = async () => {
    if (!newHabit.trim()) return;
    setAddingHabit(true);
    try {
      await addHabit({
        habit_id: `habit_${Date.now()}`,
        name: newHabit.trim(),
        active: true,
        target_minutes: null,
        days_active: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        sort_order: habits.length,
        created_at: new Date().toISOString(),
      });
      setNewHabit('');
      setShowAddHabit(false);
    } catch (err) {
      console.error('Failed to add habit:', err);
    } finally {
      setAddingHabit(false);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await deleteHabit(habitId);
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

  // Goal handlers
  const handleAddGoal = async () => {
    if (!newGoal.trim()) return;
    setAddingGoal(true);
    try {
      await saveGoal({
        goal_id: `g_${Date.now()}`,
        title: newGoal.trim(),
        type: 'monthly',
        parent_goal_id: null,
        target_value: 100,
        starting_value: 0,
        current_value: 0,
        unit: '%',
        start_date: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        priority: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setNewGoal('');
      setShowAddGoal(false);
    } catch (err) {
      console.error('Failed to add goal:', err);
    } finally {
      setAddingGoal(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (deleteGoal) {
      await deleteGoal(goalId);
    }
  };

  // Clear all data
  const handleClearData = () => {
    const keys = [
      'progress95_goals', 'progress95_habits', 'progress95_habitCompletions',
      'progress95_dailyLogs', 'progress95_tasks',
    ];
    keys.forEach(k => localStorage.removeItem(k));
    setShowClearConfirm(false);
    window.location.reload();
  };

  // Export data
  const handleExport = () => {
    const data = {
      goals: JSON.parse(localStorage.getItem('progress95_goals') || '[]'),
      habits: JSON.parse(localStorage.getItem('progress95_habits') || '[]'),
      dailyLogs: JSON.parse(localStorage.getItem('progress95_dailyLogs') || '[]'),
      tasks: JSON.parse(localStorage.getItem('progress95_tasks') || '[]'),
      habitCompletions: JSON.parse(localStorage.getItem('progress95_habitCompletions') || '[]'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress95-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import data
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.goals) localStorage.setItem('progress95_goals', JSON.stringify(data.goals));
          if (data.habits) localStorage.setItem('progress95_habits', JSON.stringify(data.habits));
          if (data.dailyLogs) localStorage.setItem('progress95_dailyLogs', JSON.stringify(data.dailyLogs));
          if (data.tasks) localStorage.setItem('progress95_tasks', JSON.stringify(data.tasks));
          if (data.habitCompletions) localStorage.setItem('progress95_habitCompletions', JSON.stringify(data.habitCompletions));
          window.location.reload();
        } catch {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <>
      <MobileContainer>
        <MainWindow style={{ marginBottom: 70 }}>
          <TitleBar>
            <span>⚙️ Settings</span>
            <TitleBarButton size="sm" onClick={() => router.push('/mobile')}>
              ✕
            </TitleBarButton>
          </TitleBar>

          <ContentArea>
            <ScrollArea>

              {/* ===== PROFILE ===== */}
              <CollapsibleHeader $collapsed={collapsed.profile} onClick={() => toggleSection('profile')}>
                👤 Profile
              </CollapsibleHeader>
              <SectionContent $collapsed={collapsed.profile}>
                <SettingsList>
                  <SettingRow>
                    <SettingLabel>Display Name</SettingLabel>
                    <SmallInput
                      value={display_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                    />
                  </SettingRow>
                  <SettingRow>
                    <SettingLabel>Notifications</SettingLabel>
                    <ToggleSwitch
                      $on={notifications_enabled}
                      onClick={() => setNotificationsEnabled(!notifications_enabled)}
                    />
                  </SettingRow>
                </SettingsList>
              </SectionContent>

              {/* ===== APPEARANCE ===== */}
              <CollapsibleHeader $collapsed={collapsed.appearance} onClick={() => toggleSection('appearance')}>
                🎨 Appearance
              </CollapsibleHeader>
              <SectionContent $collapsed={collapsed.appearance}>
                <SettingsList>
                  <SettingRow>
                    <SettingLabel>Default Tab</SettingLabel>
                    <SmallSelect
                      value={default_tab}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDefaultTab(Number(e.target.value))}
                    >
                      {TAB_OPTIONS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </SmallSelect>
                  </SettingRow>
                  <SettingRow>
                    <SettingLabel>Accent Color</SettingLabel>
                    <SettingValue>
                      {ACCENT_COLORS.map(c => (
                        <ColorSwatch
                          key={c.value}
                          $color={c.value}
                          $active={accent_color === c.value}
                          onClick={() => setAccentColor(c.value)}
                          title={c.name}
                        />
                      ))}
                    </SettingValue>
                  </SettingRow>
                  <SettingRow>
                    <SettingLabel>Font Size</SettingLabel>
                    <ToggleGroup>
                      {(['small', 'medium', 'large'] as FontSize[]).map(size => (
                        <ToggleButton
                          key={size}
                          $active={font_size === size}
                          onClick={() => setFontSize(size)}
                          style={{ padding: '4px 8px', fontSize: 11 }}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </ToggleButton>
                      ))}
                    </ToggleGroup>
                  </SettingRow>
                  <SettingRow>
                    <SettingLabel>Keyboard Size</SettingLabel>
                    <ToggleGroup>
                      {(['compact', 'medium', 'large'] as KeyboardSize[]).map(size => (
                        <ToggleButton
                          key={size}
                          $active={keyboard_size === size}
                          onClick={() => setKeyboardSize(size)}
                          style={{ padding: '4px 8px', fontSize: 11 }}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </ToggleButton>
                      ))}
                    </ToggleGroup>
                  </SettingRow>
                </SettingsList>
              </SectionContent>

              {/* ===== COACH ===== */}
              <CollapsibleHeader $collapsed={collapsed.coach} onClick={() => toggleSection('coach')}>
                🤖 Coach
              </CollapsibleHeader>
              <SectionContent $collapsed={collapsed.coach}>
                <SettingsList>
                  <SettingRow>
                    <SettingLabel>Coach Tone</SettingLabel>
                    <SmallSelect
                      value={coach_tone}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCoachTone(e.target.value as CoachTone)}
                    >
                      <option value="direct">Direct</option>
                      <option value="encouraging">Encouraging</option>
                      <option value="balanced">Balanced</option>
                    </SmallSelect>
                  </SettingRow>
                  <SettingRow>
                    <SettingLabel>Daily Digest</SettingLabel>
                    <ToggleSwitch
                      $on={digest_enabled}
                      onClick={() => setDigestEnabled(!digest_enabled)}
                    />
                  </SettingRow>
                  {digest_enabled && (
                    <SettingRow>
                      <SettingLabel>Digest Frequency</SettingLabel>
                      <ToggleGroup>
                        {(['daily', 'weekly'] as DigestFrequency[]).map(freq => (
                          <ToggleButton
                            key={freq}
                            $active={digest_frequency === freq}
                            onClick={() => setDigestFrequency(freq)}
                            style={{ padding: '4px 10px', fontSize: 11 }}
                          >
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </ToggleButton>
                        ))}
                      </ToggleGroup>
                    </SettingRow>
                  )}
                  <SettingRow>
                    <SettingLabel>Show Streaks</SettingLabel>
                    <ToggleSwitch
                      $on={show_streaks}
                      onClick={() => setShowStreaks(!show_streaks)}
                    />
                  </SettingRow>
                </SettingsList>
                <div style={{ padding: '8px 0' }}>
                  <FormLabel style={{ padding: '0 8px' }}>Custom Context (what should the coach know about you?)</FormLabel>
                  <div style={{ padding: '0 4px' }}>
                    <StyledTextArea
                      value={coach_context}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCoachContext(e.target.value)}
                      placeholder="e.g., I'm 17, studying for SAT, working part-time at a restaurant..."
                      style={{ minHeight: 80 }}
                    />
                  </div>
                </div>
              </SectionContent>

              {/* ===== HABITS ===== */}
              <CollapsibleHeader $collapsed={collapsed.habits} onClick={() => toggleSection('habits')}>
                💪 Habits ({activeHabits.length})
              </CollapsibleHeader>
              <SectionContent $collapsed={collapsed.habits}>
                <SettingsList>
                  {activeHabits.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                      <div style={{ fontSize: 12, color: '#808080' }}>No habits yet</div>
                    </div>
                  ) : (
                    activeHabits.map((habit, index) => (
                      <SettingsItem key={habit.habit_id}>
                        <ItemContent>
                          <ItemIcon color={habitColors[index % habitColors.length]}>
                            {getHabitEmoji(habit.name)}
                          </ItemIcon>
                          <ItemText>{habit.name}</ItemText>
                        </ItemContent>
                        <DeleteButton onClick={() => handleDeleteHabit(habit.habit_id)}>
                          ✕
                        </DeleteButton>
                      </SettingsItem>
                    ))
                  )}
                </SettingsList>
                <Button fullWidth onClick={() => setShowAddHabit(true)}>
                  + Add Habit
                </Button>
              </SectionContent>

              {/* ===== GOALS ===== */}
              <CollapsibleHeader $collapsed={collapsed.goals} onClick={() => toggleSection('goals')}>
                🎯 Goals ({activeGoals.length})
              </CollapsibleHeader>
              <SectionContent $collapsed={collapsed.goals}>
                <SettingsList>
                  {activeGoals.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
                      <div style={{ fontSize: 12, color: '#808080' }}>No goals yet</div>
                    </div>
                  ) : (
                    activeGoals.map((goal) => (
                      <SettingsItem key={goal.goal_id}>
                        <ItemContent>
                          <ItemIcon color="#4ecdc4">🎯</ItemIcon>
                          <ItemText>{goal.title}</ItemText>
                        </ItemContent>
                        <DeleteButton onClick={() => handleDeleteGoal(goal.goal_id)}>
                          ✕
                        </DeleteButton>
                      </SettingsItem>
                    ))
                  )}
                </SettingsList>
                <Button fullWidth onClick={() => setShowAddGoal(true)}>
                  + Add Goal
                </Button>
              </SectionContent>

              {/* ===== DATA MANAGEMENT ===== */}
              <CollapsibleHeader $collapsed={collapsed.data} onClick={() => toggleSection('data')}>
                💾 Data Management
              </CollapsibleHeader>
              <SectionContent $collapsed={collapsed.data}>
                <SettingsList>
                  <SettingsItem>
                    <ItemContent>
                      <ItemIcon color="#00b894">📤</ItemIcon>
                      <ItemText>Export Data</ItemText>
                    </ItemContent>
                    <Button size="sm" onClick={handleExport}>
                      Export
                    </Button>
                  </SettingsItem>
                  <SettingsItem>
                    <ItemContent>
                      <ItemIcon color="#0984e3">📥</ItemIcon>
                      <ItemText>Import Data</ItemText>
                    </ItemContent>
                    <Button size="sm" onClick={handleImport}>
                      Import
                    </Button>
                  </SettingsItem>
                  <SettingsItem>
                    <ItemContent>
                      <ItemIcon color="#ff6b6b">🗑️</ItemIcon>
                      <ItemText>Clear All Data</ItemText>
                    </ItemContent>
                    <DangerButton size="sm" onClick={() => setShowClearConfirm(true)}>
                      Clear
                    </DangerButton>
                  </SettingsItem>
                </SettingsList>
                <SettingsList style={{ marginTop: 8 }}>
                  <SettingsItem onClick={() => router.push('/mobile/calendar')} style={{ cursor: 'pointer' }}>
                    <ItemContent>
                      <ItemIcon color="#74b9ff">📅</ItemIcon>
                      <ItemText>View Calendar</ItemText>
                    </ItemContent>
                    <span style={{ color: '#808080' }}>→</span>
                  </SettingsItem>
                </SettingsList>
              </SectionContent>

              {/* ===== ABOUT ===== */}
              <CollapsibleHeader $collapsed={collapsed.about} onClick={() => toggleSection('about')}>
                ℹ️ About
              </CollapsibleHeader>
              <SectionContent $collapsed={collapsed.about}>
                <AboutSection>
                  <AboutTitle>Progress95</AboutTitle>
                  <AboutText>
                    <strong>Version:</strong> 1.0.0
                  </AboutText>
                  <AboutText>
                    Personal productivity and goal tracking with Windows 95 nostalgia.
                  </AboutText>
                  <AboutText style={{ marginTop: 8, color: '#808080' }}>
                    Data syncs to cloud. Coach powered by Claude AI.
                  </AboutText>
                  <div style={{
                    marginTop: 12,
                    padding: 8,
                    background: '#fff',
                    border: '2px inset #808080',
                    fontSize: 10,
                    textAlign: 'center'
                  }}>
                    Built with ❤️ by {display_name}
                  </div>
                </AboutSection>
              </SectionContent>

              {/* Bottom spacer */}
              <div style={{ height: 40 }} />

            </ScrollArea>
          </ContentArea>
        </MainWindow>

        <BackButton onClick={() => router.push('/mobile')}>
          ← Back to Home
        </BackButton>
      </MobileContainer>

      {/* Add Habit Popup */}
      {showAddHabit && (
        <PopupOverlay onClick={() => setShowAddHabit(false)}>
          <PopupWindow onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <TitleBar>
              <span>💪 Add New Habit</span>
              <TitleBarButton size="sm" onClick={() => setShowAddHabit(false)}>✕</TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>What habit do you want to build?</FormLabel>
                <StyledInput
                  value={newHabit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewHabit(e.target.value)}
                  placeholder="e.g., Go to gym, Read 30 min..."
                  autoFocus
                />
              </FormRow>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={handleAddHabit}
                  disabled={addingHabit || !newHabit.trim()}
                >
                  {addingHabit ? 'Adding...' : 'Add Habit'}
                </Button>
                <Button style={{ flex: 1 }} onClick={() => setShowAddHabit(false)}>
                  Cancel
                </Button>
              </div>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Add Goal Popup */}
      {showAddGoal && (
        <PopupOverlay onClick={() => setShowAddGoal(false)}>
          <PopupWindow onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <TitleBar>
              <span>🎯 Add New Goal</span>
              <TitleBarButton size="sm" onClick={() => setShowAddGoal(false)}>✕</TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>What do you want to achieve?</FormLabel>
                <StyledInput
                  value={newGoal}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGoal(e.target.value)}
                  placeholder="e.g., SAT 1500+, Save $1000..."
                  autoFocus
                />
              </FormRow>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={handleAddGoal}
                  disabled={addingGoal || !newGoal.trim()}
                >
                  {addingGoal ? 'Adding...' : 'Add Goal'}
                </Button>
                <Button style={{ flex: 1 }} onClick={() => setShowAddGoal(false)}>
                  Cancel
                </Button>
              </div>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Clear Data Confirmation */}
      {showClearConfirm && (
        <PopupOverlay onClick={() => setShowClearConfirm(false)}>
          <PopupWindow onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <TitleBar>
              <span>⚠️ Clear All Data</span>
              <TitleBarButton size="sm" onClick={() => setShowClearConfirm(false)}>✕</TitleBarButton>
            </TitleBar>
            <PopupContent>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>
                  Are you sure?
                </div>
                <div style={{ fontSize: 11, color: '#808080' }}>
                  This will remove all local data including goals, habits, tasks, and daily logs.
                  Cloud data in Supabase will not be affected.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <DangerButton
                  style={{ flex: 1 }}
                  onClick={handleClearData}
                >
                  Yes, Clear
                </DangerButton>
                <Button style={{ flex: 1 }} onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}
    </>
  );
}
