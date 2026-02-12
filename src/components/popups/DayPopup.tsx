'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Popup } from '../shared/Popup';
import { TabBar } from '../shared/TabBar';
import { LoadingSlider } from '../shared/LoadingSlider';
import { Button } from '../shared/Button';
import { useLogStore } from '@/stores/logStore';
import { DailyLog, DayType, HabitWithStatus, ParsedAccomplishment } from '@/types';

interface DayPopupProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: 'accomplishments', label: 'Accomplishments' },
  { id: 'habits', label: 'Habits' },
  { id: 'log', label: 'Log' },
];

const DAY_TYPES: { value: DayType; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'work', label: 'Work' },
  { value: 'both', label: 'Both' },
  { value: 'off', label: 'Off' },
];

export function DayPopup({ date, isOpen, onClose }: DayPopupProps) {
  const [activeTab, setActiveTab] = useState('accomplishments');
  const [accomplishments, setAccomplishments] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedAccomplishment[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    getLogByDate,
    getHabitsByDate,
    saveDailyLog,
    toggleHabit,
  } = useLogStore();

  const existingLog = getLogByDate(date);
  const habits = getHabitsByDate(date);

  const [logData, setLogData] = useState<Partial<DailyLog>>({
    day_type: existingLog?.day_type || null,
    energy_level: existingLog?.energy_level || 3,
    hours_slept: existingLog?.hours_slept || 7,
    work_hours: existingLog?.work_hours || 0,
    school_hours: existingLog?.school_hours || 0,
    overall_rating: existingLog?.overall_rating || 3,
    notes: existingLog?.notes || '',
    sick: existingLog?.sick || false,
  });

  useEffect(() => {
    if (existingLog) {
      setLogData({
        day_type: existingLog.day_type,
        energy_level: existingLog.energy_level || 3,
        hours_slept: existingLog.hours_slept || 7,
        work_hours: existingLog.work_hours || 0,
        school_hours: existingLog.school_hours || 0,
        overall_rating: existingLog.overall_rating || 3,
        notes: existingLog.notes || '',
        sick: existingLog.sick || false,
      });
      setAccomplishments(existingLog.notes || '');
    }
  }, [existingLog]);

  // Parse accomplishments with debounce
  useEffect(() => {
    if (!accomplishments.trim()) {
      setParsedItems([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsParsing(true);
      try {
        const res = await fetch('/api/coach/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: accomplishments }),
        });
        const data = await res.json();
        setParsedItems(data.parsed || []);
      } catch {
        setParsedItems([]);
      } finally {
        setIsParsing(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [accomplishments]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const log: DailyLog = {
        date,
        day_type: logData.day_type || null,
        energy_level: logData.energy_level || null,
        hours_slept: logData.hours_slept || null,
        work_hours: logData.work_hours || null,
        school_hours: logData.school_hours || null,
        free_hours: null,
        overall_rating: logData.overall_rating || null,
        notes: accomplishments || logData.notes || null,
        sick: logData.sick || false,
        created_at: existingLog?.created_at || new Date().toISOString(),
      };

      await saveDailyLog(log);
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = format(parseISO(date), 'EEEE, MMMM d');

  return (
    <Popup
      isOpen={isOpen}
      onClose={onClose}
      title={formattedDate}
      width="lg"
    >
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-4 min-h-[300px]">
        {/* Accomplishments Tab */}
        {activeTab === 'accomplishments' && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Type freely - Claude will parse time, difficulty, and goal associations.
            </p>
            <textarea
              value={accomplishments}
              onChange={(e) => setAccomplishments(e.target.value)}
              placeholder="- SAT practice 45 min
- Worked at Rocky's 5-9pm
- Finished history essay (struggled)
- ..."
              className="w-full h-32 p-3 rounded resize-none text-sm"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            />

            {/* Parsed Preview */}
            {(parsedItems.length > 0 || isParsing) && (
              <div
                className="p-3 rounded"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                    PARSED PREVIEW
                  </span>
                  {isParsing && (
                    <span className="text-xs animate-pulse" style={{ color: 'var(--accent-primary)' }}>
                      parsing...
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {parsedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="text-xs p-2 rounded"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      <div style={{ color: 'var(--text-primary)' }}>{item.description}</div>
                      <div className="flex gap-3 mt-1" style={{ color: 'var(--text-muted)' }}>
                        {item.timeSpent && <span>{item.timeSpent} min</span>}
                        {item.difficulty && <span>D:{item.difficulty}/5</span>}
                        {item.category && <span>[{item.category}]</span>}
                        {item.goalId && <span style={{ color: 'var(--accent-success)' }}>✓ linked</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Habits Tab */}
        {activeTab === 'habits' && (
          <div className="space-y-2">
            {habits.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No habits configured. Add habits in Settings.
              </p>
            ) : (
              habits.map((habit) => (
                <HabitRow
                  key={habit.habit_id}
                  habit={habit}
                  onToggle={() => toggleHabit(habit.habit_id, date)}
                />
              ))
            )}
          </div>
        )}

        {/* Log Tab */}
        {activeTab === 'log' && (
          <div className="space-y-4">
            {/* Day Type */}
            <div>
              <label className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                Day Type
              </label>
              <div className="flex gap-2">
                {DAY_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setLogData({ ...logData, day_type: type.value })}
                    className="px-3 py-1 rounded text-sm"
                    style={{
                      backgroundColor:
                        logData.day_type === type.value
                          ? 'var(--accent-primary)'
                          : 'var(--bg-tertiary)',
                      color:
                        logData.day_type === type.value
                          ? 'var(--bg-primary)'
                          : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <LoadingSlider
              label="Energy Level"
              value={logData.energy_level || 3}
              max={5}
              step={1}
              onChange={(v) => setLogData({ ...logData, energy_level: v })}
              showGradient
            />

            <LoadingSlider
              label="Hours Slept"
              value={logData.hours_slept || 7}
              max={12}
              step={0.5}
              unit="hrs"
              onChange={(v) => setLogData({ ...logData, hours_slept: v })}
            />

            <LoadingSlider
              label="Work Hours"
              value={logData.work_hours || 0}
              max={12}
              step={0.5}
              unit="hrs"
              onChange={(v) => setLogData({ ...logData, work_hours: v })}
            />

            <LoadingSlider
              label="School Hours"
              value={logData.school_hours || 0}
              max={12}
              step={0.5}
              unit="hrs"
              onChange={(v) => setLogData({ ...logData, school_hours: v })}
            />

            <LoadingSlider
              label="Overall Rating"
              value={logData.overall_rating || 3}
              max={5}
              step={1}
              onChange={(v) => setLogData({ ...logData, overall_rating: v })}
              showGradient
            />

            {/* Sick checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={logData.sick || false}
                onChange={(e) => setLogData({ ...logData, sick: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sick today
              </span>
            </label>

            {/* Notes */}
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                Notes
              </label>
              <textarea
                value={logData.notes || ''}
                onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
                placeholder="Any additional context..."
                className="w-full h-20 p-2 rounded resize-none text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </Popup>
  );
}

function HabitRow({
  habit,
  onToggle,
}: {
  habit: HabitWithStatus;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 rounded hover:bg-tertiary"
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-5 h-5 flex items-center justify-center rounded text-xs"
          style={{
            backgroundColor: habit.completed
              ? 'var(--accent-success)'
              : 'transparent',
            color: habit.completed ? 'var(--bg-primary)' : 'var(--text-muted)',
            border: habit.completed
              ? 'none'
              : '1px solid var(--border-color)',
          }}
        >
          {habit.completed && '✓'}
        </span>
        <span style={{ color: 'var(--text-primary)' }}>{habit.name}</span>
        {habit.target_minutes && (
          <span
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            ({habit.target_minutes} min)
          </span>
        )}
      </div>
      <span
        className="text-sm"
        style={{
          color: habit.streak > 0 ? 'var(--accent-success)' : 'var(--text-muted)',
        }}
      >
        {habit.streak} days
      </span>
    </button>
  );
}
