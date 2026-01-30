'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  TextInput,
  Checkbox,
  GroupBox,
} from 'react95';

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
  width: 500px;
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

const ReminderItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid #c0c0c0;
  background: #fff;
`;

const ReminderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ReminderText = styled.span`
  font-size: 12px;
  font-weight: bold;
`;

const ReminderTime = styled.span`
  font-size: 11px;
  color: #666;
`;

const DaysRow = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
`;

const DayBadge = styled.span<{ $active: boolean }>`
  font-size: 10px;
  padding: 2px 6px;
  background: ${(props) => (props.$active ? '#0000aa' : '#ddd')};
  color: ${(props) => (props.$active ? '#fff' : '#666')};
`;

const AddForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid #c0c0c0;
  background: #f0f0f0;
  margin-top: 12px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const DayCheckboxes = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

interface Reminder {
  id: string;
  message: string;
  time: string;
  days: string[];
  enabled: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface RemindersPanel95Props {
  isOpen: boolean;
  onClose: () => void;
}

export function RemindersPanel95({ isOpen, onClose }: RemindersPanel95Props) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newDays, setNewDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [saving, setSaving] = useState(false);

  // Load reminders from proxy context
  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const res = await fetch('http://localhost:3457/context');
      if (res.ok) {
        const ctx = await res.json();
        setReminders(ctx.reminders || []);
      }
    } catch (err) {
      console.error('Failed to load reminders:', err);
    }
  };

  const saveReminders = async (updated: Reminder[]) => {
    setSaving(true);
    try {
      await fetch('http://localhost:3457/context', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminders: updated }),
      });
      setReminders(updated);
    } catch (err) {
      console.error('Failed to save reminders:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddReminder = async () => {
    if (!newMessage.trim() || !newTime) return;

    const newReminder: Reminder = {
      id: `rem_${Date.now()}`,
      message: newMessage.trim(),
      time: newTime,
      days: newDays,
      enabled: true,
    };

    await saveReminders([...reminders, newReminder]);
    setNewMessage('');
    setNewTime('09:00');
    setNewDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  };

  const handleDeleteReminder = async (id: string) => {
    await saveReminders(reminders.filter((r) => r.id !== id));
  };

  const handleToggleReminder = async (id: string) => {
    await saveReminders(
      reminders.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const toggleDay = (day: string) => {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <PopupWindow onClick={(e) => e.stopPropagation()}>
        <StyledWindowHeader>
          <span>Telegram Reminders</span>
          <Button size="sm" onClick={onClose}>
            X
          </Button>
        </StyledWindowHeader>
        <Content>
          <GroupBox label="Scheduled Reminders">
            {reminders.length === 0 ? (
              <p style={{ fontSize: 12, color: '#666', padding: 8 }}>
                No reminders set. Add one below!
              </p>
            ) : (
              reminders.map((reminder) => (
                <ReminderItem key={reminder.id}>
                  <ReminderHeader>
                    <div>
                      <Checkbox
                        checked={reminder.enabled}
                        onChange={() => handleToggleReminder(reminder.id)}
                        label=""
                        style={{ marginRight: 4 }}
                      />
                      <ReminderText style={{ opacity: reminder.enabled ? 1 : 0.5 }}>
                        {reminder.message}
                      </ReminderText>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <ReminderTime>{reminder.time}</ReminderTime>
                      <Button
                        size="sm"
                        onClick={() => handleDeleteReminder(reminder.id)}
                        style={{ fontSize: 10, padding: '2px 6px', minWidth: 20 }}
                      >
                        X
                      </Button>
                    </div>
                  </ReminderHeader>
                  <DaysRow>
                    {DAYS.map((day) => (
                      <DayBadge key={day} $active={reminder.days.includes(day)}>
                        {day}
                      </DayBadge>
                    ))}
                  </DaysRow>
                </ReminderItem>
              ))
            )}

            <AddForm>
              <strong style={{ fontSize: 12 }}>Add New Reminder</strong>
              <TextInput
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message (e.g., Time to log your progress!)"
                style={{ width: '100%' }}
              />
              <FormRow>
                <span style={{ fontSize: 11 }}>Time:</span>
                <TextInput
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  style={{ width: 100 }}
                />
              </FormRow>
              <div>
                <span style={{ fontSize: 11 }}>Days:</span>
                <DayCheckboxes>
                  {DAYS.map((day) => (
                    <Button
                      key={day}
                      size="sm"
                      active={newDays.includes(day)}
                      onClick={() => toggleDay(day)}
                      style={{ fontSize: 10, padding: '2px 6px' }}
                    >
                      {day}
                    </Button>
                  ))}
                </DayCheckboxes>
              </div>
              <Button onClick={handleAddReminder} disabled={!newMessage.trim() || saving}>
                {saving ? 'Saving...' : 'Add Reminder'}
              </Button>
            </AddForm>
          </GroupBox>

          <p style={{ fontSize: 10, color: '#888', marginTop: 8 }}>
            Reminders are sent via Telegram bot at the scheduled times.
          </p>

          <ButtonRow>
            <Button onClick={onClose}>Done</Button>
          </ButtonRow>
        </Content>
      </PopupWindow>
    </Overlay>
  );
}
