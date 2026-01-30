'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  Toolbar,
  AppBar,
} from 'react95';
import { MonthCalendar95 } from './calendar/MonthCalendar95';
import { CoachPanel95 } from './coach/CoachPanel95';
import { DayPopup95 } from './popups/DayPopup95';
import { WeeklyGoalsPopup95 } from './popups/WeeklyGoalsPopup95';
import { MonthlyGoalsPopup95 } from './popups/MonthlyGoalsPopup95';
import { SettingsPanel95 } from './settings/SettingsPanel95';
import { RemindersPanel95 } from './settings/RemindersPanel95';
import { DebugPanel95 } from './debug/DebugPanel95';
import { QuickLog95 } from './QuickLog95';
import { useGoalStore } from '@/stores/goalStore';
import { useLogStore } from '@/stores/logStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { debug } from '@/lib/debug';

const Desktop = styled.div`
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 8px;
  padding-bottom: 48px;
  gap: 8px;
  box-sizing: border-box;
`;

const MainArea = styled.div`
  flex: 1;
  display: flex;
  gap: 8px;
  min-height: 0;
  height: 100%;
`;

const CalendarContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 400px;
`;

const CoachContainer = styled.div`
  width: 320px;
  display: flex;
  flex-direction: column;
  min-height: 400px;
  max-height: calc(100vh - 80px);
`;

// Wrapper for WindowHeader content - don't extend WindowHeader itself
const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

export function Dashboard() {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<{
    id: string;
    start: string;
    end: string;
  } | null>(null);
  const [showMonthlyGoals, setShowMonthlyGoals] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [coachMinimized, setCoachMinimized] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { fetchSettings } = useSettingsStore();
  const { fetchGoals } = useGoalStore();
  const { fetchData, dailyLogs, tasks } = useLogStore();

  // Initial data fetch
  useEffect(() => {
    debug('Dashboard', 'Initial data fetch starting');
    fetchSettings();
    fetchGoals();
    fetchData();
    debug('Dashboard', 'Initial data fetch initiated');
  }, [fetchSettings, fetchGoals, fetchData]);

  // Build day data for calendar
  const dayData: Record<string, { hasData: boolean; completionRate: number }> = {};
  dailyLogs.forEach((log) => {
    const dayTasks = tasks.filter((t) => t.planned_date === log.date);
    const completed = dayTasks.filter((t) => t.status === 'completed').length;
    const total = dayTasks.length;

    dayData[log.date] = {
      hasData: true,
      completionRate: total > 0 ? completed / total : 0,
    };
  });

  return (
    <Desktop>
      <MainArea>
        {/* Calendar Window */}
        <CalendarContainer>
          <Window style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <WindowHeader>
              <HeaderContent>
                <span style={{ fontSize: 12 }}>Progress Tracker</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button size="sm" onClick={() => setShowMonthlyGoals(true)} style={{ fontSize: 11, padding: '2px 6px' }}>
                    Goals
                  </Button>
                  <Button size="sm" onClick={() => setShowSettings(true)} style={{ fontSize: 11, padding: '2px 6px' }}>
                    Settings
                  </Button>
                </div>
              </HeaderContent>
            </WindowHeader>
            <WindowContent style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              <MonthCalendar95
                onDayClick={setSelectedDay}
                onWeekClick={(id, start, end) => setSelectedWeek({ id, start, end })}
                dayData={dayData}
              />
            </WindowContent>
          </Window>
        </CalendarContainer>

        {/* Coach Window */}
        {!coachMinimized && (
          <CoachContainer>
            <Window style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <WindowHeader>
                <HeaderContent>
                  <span>The Coach</span>
                  <Button size="sm" onClick={() => setCoachMinimized(true)} style={{ marginLeft: 4, minWidth: 20, padding: '0 4px' }}>
                    _
                  </Button>
                </HeaderContent>
              </WindowHeader>
              <WindowContent style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                <CoachPanel95 />
              </WindowContent>
            </Window>
          </CoachContainer>
        )}
      </MainArea>

      {/* Taskbar */}
      <AppBar style={{ position: 'fixed', bottom: 0, left: 0, right: 0, top: 'auto', zIndex: 100 }}>
        <Toolbar style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <Button
              active={showSettings}
              onClick={() => setShowSettings(!showSettings)}
            >
              Start
            </Button>
            <Button
              onClick={() => setShowQuickLog(true)}
              style={{ background: '#90EE90', fontWeight: 'bold' }}
            >
              Quick Log
            </Button>
            <Button
              size="sm"
              onClick={() => setShowReminders(true)}
            >
              Reminders
            </Button>
            {coachMinimized && (
              <Button onClick={() => setCoachMinimized(false)}>
                The Coach
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              style={{ marginLeft: 8 }}
            >
              Debug
            </Button>
          </div>
          <span style={{ padding: '0 8px', fontSize: 12 }}>
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </Toolbar>
      </AppBar>

      {/* Day Popup */}
      {selectedDay && (
        <DayPopup95
          date={selectedDay}
          isOpen={!!selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Weekly Goals Popup */}
      {selectedWeek && (
        <WeeklyGoalsPopup95
          weekId={selectedWeek.id}
          weekStart={selectedWeek.start}
          weekEnd={selectedWeek.end}
          isOpen={!!selectedWeek}
          onClose={() => setSelectedWeek(null)}
        />
      )}

      {/* Monthly Goals Popup */}
      {showMonthlyGoals && (
        <MonthlyGoalsPopup95
          month={currentMonth}
          isOpen={showMonthlyGoals}
          onClose={() => setShowMonthlyGoals(false)}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel95
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Debug Panel */}
      {showDebug && (
        <DebugPanel95 onClose={() => setShowDebug(false)} />
      )}

      {/* Quick Log */}
      {showQuickLog && (
        <QuickLog95 onClose={() => setShowQuickLog(false)} />
      )}

      {/* Reminders */}
      {showReminders && (
        <RemindersPanel95
          isOpen={showReminders}
          onClose={() => setShowReminders(false)}
        />
      )}
    </Desktop>
  );
}
