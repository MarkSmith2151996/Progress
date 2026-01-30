'use client';

import { useState } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  TextInput,
  Tabs,
  Tab,
  TabBody,
  Checkbox,
  GroupBox,
  Select,
} from 'react95';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const PopupWindow = styled(Window)`
  width: 450px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
`;

const StyledWindowHeader = styled(WindowHeader)`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Content = styled(WindowContent)`
  flex: 1;
  overflow: auto;
`;

const HabitItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid #c0c0c0;
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 8px 0;
`;

const ColorSwatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 24px;
  height: 24px;
  border: ${(props) => (props.$selected ? '2px solid #000' : '1px solid #888')};
  background: ${(props) => props.$color};
  cursor: pointer;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

const WEEK_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeaa7',
  '#dfe6e9',
  '#a29bfe',
  '#fd79a8',
  '#00b894',
  '#e17055',
];

interface SettingsPanel95Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel95({ isOpen, onClose }: SettingsPanel95Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [newHabitName, setNewHabitName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const {
    week_colors,
    notifications_enabled,
    setWeekColor,
    setNotificationsEnabled,
    saveSettings,
  } = useSettingsStore();

  const { habits, dailyLogs, tasks, habitCompletions } = useLogStore();
  const { goals } = useGoalStore();

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      goals,
      tasks,
      dailyLogs,
      habits,
      habitCompletions,
      settings: { week_colors, notifications_enabled },
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

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;

    const newHabit = {
      habit_id: `habit_${Date.now()}`,
      name: newHabitName.trim(),
      active: true,
      target_minutes: null,
      days_active: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      sort_order: habits.length,
      created_at: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHabit),
      });

      if (response.ok) {
        setNewHabitName('');
        // Refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to add habit:', error);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <PopupWindow onClick={(e) => e.stopPropagation()}>
        <StyledWindowHeader>
          <span>Settings</span>
          <Button size="sm" onClick={onClose}>
            X
          </Button>
        </StyledWindowHeader>
        <Content>
          <Tabs value={activeTab} onChange={(val) => setActiveTab(val as number)}>
            <Tab value={0}>Habits</Tab>
            <Tab value={1}>Week Colors</Tab>
            <Tab value={2}>Data</Tab>
          </Tabs>

          <TabBody style={{ minHeight: 250, padding: 8 }}>
            {activeTab === 0 && (
              <GroupBox label="Manage Habits">
                {habits.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#666' }}>No habits configured</p>
                ) : (
                  habits.map((habit) => (
                    <HabitItem key={habit.habit_id}>
                      <span style={{ fontSize: 12 }}>{habit.name}</span>
                      <Checkbox
                        checked={habit.active}
                        label="Active"
                        disabled
                      />
                    </HabitItem>
                  ))
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                  <TextInput
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="New habit name..."
                    style={{ flex: 1 }}
                  />
                  <Button disabled={!newHabitName.trim()} onClick={handleAddHabit}>Add</Button>
                </div>
              </GroupBox>
            )}

            {activeTab === 1 && (
              <GroupBox label="Week Colors">
                <p style={{ fontSize: 11, marginBottom: 8 }}>
                  Customize the color for each week of the month:
                </p>
                {[1, 2, 3, 4, 5].map((weekNum) => (
                  <div key={weekNum} style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12 }}>Week {weekNum}:</span>
                    <ColorPicker>
                      {WEEK_COLORS.map((color) => (
                        <ColorSwatch
                          key={color}
                          $color={color}
                          $selected={week_colors[String(weekNum)] === color}
                          onClick={() => setWeekColor(String(weekNum), color)}
                        />
                      ))}
                    </ColorPicker>
                  </div>
                ))}
              </GroupBox>
            )}

            {activeTab === 2 && (
              <div>
                <GroupBox label="Export Data">
                  <p style={{ fontSize: 11, marginBottom: 8 }}>
                    Download all your data as JSON:
                  </p>
                  <ul style={{ fontSize: 11, marginBottom: 8, marginLeft: 16 }}>
                    <li>{goals.length} goals</li>
                    <li>{tasks.length} tasks</li>
                    <li>{dailyLogs.length} daily logs</li>
                    <li>{habits.length} habits</li>
                  </ul>
                  <Button onClick={handleExport}>Export Data</Button>
                </GroupBox>

                <GroupBox label="Notifications" style={{ marginTop: 8 }}>
                  <Checkbox
                    checked={notifications_enabled}
                    onChange={() => setNotificationsEnabled(!notifications_enabled)}
                    label="Enable notifications"
                  />
                </GroupBox>
              </div>
            )}
          </TabBody>

          <ButtonRow>
            <Button onClick={onClose}>Cancel</Button>
            <Button primary onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </ButtonRow>
        </Content>
      </PopupWindow>
    </Overlay>
  );
}
