'use client';

import { useState, useEffect } from 'react';
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
  Slider,
  Fieldset,
} from 'react95';
import { format, parseISO } from 'date-fns';
import { useLogStore } from '@/stores/logStore';

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

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 4px;
  font-family: 'ms_sans_serif', sans-serif;
  font-size: 12px;
  border: 2px inset #fff;
  resize: vertical;
`;

const HabitsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
`;

const HabitItem = styled.div`
  padding: 4px;
  font-size: 12px;
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
`;

const SliderLabel = styled.span`
  width: 100px;
  font-size: 12px;
`;

const SliderValue = styled.span`
  width: 40px;
  text-align: right;
  font-size: 12px;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

interface DayPopup95Props {
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DayPopup95({ date, isOpen, onClose }: DayPopup95Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [overallRating, setOverallRating] = useState(3);
  const [notes, setNotes] = useState('');

  const {
    dailyLogs,
    habits,
    habitCompletions,
    saveDailyLog,
    toggleHabit,
  } = useLogStore();

  const dayLog = dailyLogs.find((l) => l.date === date);
  const dayHabits = habits.filter((h) => h.active);
  const dayCompletions = habitCompletions.filter((c) => c.date === date);

  useEffect(() => {
    if (dayLog) {
      setEnergy(dayLog.energy_level || 3);
      setSleep(dayLog.hours_slept || 7);
      setOverallRating(dayLog.overall_rating || 3);
      setNotes(dayLog.notes || '');
    }
  }, [dayLog]);

  if (!isOpen) return null;

  const formattedDate = format(parseISO(date), 'EEEE, MMMM d, yyyy');

  const handleSave = async () => {
    const existingLog = dayLog || {
      date,
      day_type: null,
      work_hours: null,
      school_hours: null,
      free_hours: null,
      sick: false,
      created_at: new Date().toISOString(),
    };

    await saveDailyLog({
      ...existingLog,
      energy_level: energy,
      hours_slept: sleep,
      overall_rating: overallRating,
      notes,
    });
    onClose();
  };

  const isHabitCompleted = (habitId: string) => {
    return dayCompletions.some((c) => c.habit_id === habitId && c.completed);
  };

  return (
    <Overlay onClick={onClose}>
      <PopupWindow onClick={(e) => e.stopPropagation()}>
        <StyledWindowHeader>
          <span>{formattedDate}</span>
          <Button size="sm" onClick={onClose}>
            X
          </Button>
        </StyledWindowHeader>
        <Content>
          <Tabs value={activeTab} onChange={(val) => setActiveTab(val as number)}>
            <Tab value={0}>Notes</Tab>
            <Tab value={1}>Habits</Tab>
            <Tab value={2}>Daily Log</Tab>
          </Tabs>

          <TabBody style={{ minHeight: 200, padding: 8 }}>
            {activeTab === 0 && (
              <div>
                <p style={{ fontSize: 11, marginBottom: 8 }}>
                  Daily notes &amp; accomplishments:
                </p>
                <TextArea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="- Completed SAT practice section&#10;- Worked 4 hours at Rocky's&#10;- Finished homework"
                />
              </div>
            )}

            {activeTab === 1 && (
              <div>
                {dayHabits.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#666' }}>
                    No habits configured. Add habits in Settings.
                  </p>
                ) : (
                  <HabitsGrid>
                    {dayHabits.map((habit) => (
                      <HabitItem key={habit.habit_id}>
                        <Checkbox
                          checked={isHabitCompleted(habit.habit_id)}
                          onChange={() => toggleHabit(habit.habit_id, date)}
                          label={habit.name}
                        />
                      </HabitItem>
                    ))}
                  </HabitsGrid>
                )}
              </div>
            )}

            {activeTab === 2 && (
              <Fieldset label="Daily Context">
                <SliderRow>
                  <SliderLabel>Energy Level:</SliderLabel>
                  <Slider
                    value={energy}
                    onChange={(val) => setEnergy(val as number)}
                    min={1}
                    max={5}
                    step={1}
                    style={{ flex: 1 }}
                  />
                  <SliderValue>{energy}/5</SliderValue>
                </SliderRow>

                <SliderRow>
                  <SliderLabel>Hours Slept:</SliderLabel>
                  <Slider
                    value={sleep}
                    onChange={(val) => setSleep(val as number)}
                    min={0}
                    max={12}
                    step={0.5}
                    style={{ flex: 1 }}
                  />
                  <SliderValue>{sleep}h</SliderValue>
                </SliderRow>

                <SliderRow>
                  <SliderLabel>Day Rating:</SliderLabel>
                  <Slider
                    value={overallRating}
                    onChange={(val) => setOverallRating(val as number)}
                    min={1}
                    max={5}
                    step={1}
                    style={{ flex: 1 }}
                  />
                  <SliderValue>{overallRating}/5</SliderValue>
                </SliderRow>
              </Fieldset>
            )}
          </TabBody>

          <ButtonRow>
            <Button onClick={onClose}>Cancel</Button>
            <Button primary onClick={handleSave}>
              Save
            </Button>
          </ButtonRow>
        </Content>
      </PopupWindow>
    </Overlay>
  );
}
