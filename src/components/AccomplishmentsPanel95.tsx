'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  GroupBox,
  TextInput,
  ScrollView,
} from 'react95';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';
import { format, parseISO, isValid } from 'date-fns';

const PanelWindow = styled(Window)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  z-index: 1000;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const Content = styled(WindowContent)`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 8px;
`;

const AccomplishmentsList = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
`;

const DayGroup = styled.div`
  margin-bottom: 12px;
`;

const DayHeader = styled.div`
  font-weight: bold;
  font-size: 12px;
  padding: 4px 8px;
  background: #c0c0c0;
  border: 1px solid #808080;
  margin-bottom: 4px;
`;

const AccomplishmentItem = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 6px 8px;
  border-bottom: 1px dotted #808080;
  font-size: 12px;
  gap: 8px;

  &:last-child {
    border-bottom: none;
  }
`;

const Bullet = styled.span`
  color: #008000;
  font-weight: bold;
`;

const AccomplishmentText = styled.span`
  flex: 1;
`;

const GoalTag = styled.span`
  background: #000080;
  color: white;
  padding: 1px 4px;
  font-size: 10px;
  border-radius: 2px;
`;

const InputArea = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 2px groove #c0c0c0;
`;

const StyledInput = styled(TextInput)`
  flex: 1;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #808080;
  font-size: 12px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
`;

const FilterButton = styled(Button)<{ $active?: boolean }>`
  font-size: 10px;
  padding: 2px 8px;
  ${(props) => props.$active && `
    background: #000080;
    color: white;
  `}
`;

const Stats = styled.div`
  display: flex;
  gap: 16px;
  padding: 8px;
  background: #ffffcc;
  border: 1px solid #808080;
  margin-bottom: 8px;
  font-size: 11px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatValue = styled.span`
  font-weight: bold;
  font-size: 14px;
`;

const StatLabel = styled.span`
  color: #808080;
  font-size: 10px;
`;

interface AccomplishmentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'week' | 'month';

export function AccomplishmentsPanel95({ isOpen, onClose }: AccomplishmentsPanelProps) {
  const { dailyLogs, saveDailyLog, fetchData, goalUpdateMessage, clearGoalUpdateMessage } = useLogStore();
  const { goals, saveGoal, fetchGoals } = useGoalStore();
  const [newAccomplishment, setNewAccomplishment] = useState('');
  const [filter, setFilter] = useState<FilterType>('week');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      fetchGoals();
    }
  }, [isOpen, fetchData, fetchGoals]);

  // Clear goal update message after showing
  useEffect(() => {
    if (goalUpdateMessage) {
      const timer = setTimeout(() => clearGoalUpdateMessage(), 5000);
      return () => clearTimeout(timer);
    }
  }, [goalUpdateMessage, clearGoalUpdateMessage]);

  if (!isOpen) return null;

  // Get all accomplishments from daily logs, sorted by date
  const allAccomplishments: Array<{ date: string; text: string }> = [];

  dailyLogs.forEach((log) => {
    if (log.accomplishments && Array.isArray(log.accomplishments)) {
      log.accomplishments.forEach((acc) => {
        allAccomplishments.push({ date: log.date, text: acc });
      });
    }
  });

  // Filter by time range
  const now = new Date();
  const filteredAccomplishments = allAccomplishments.filter((acc) => {
    const accDate = parseISO(acc.date);
    if (!isValid(accDate)) return false;

    if (filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return accDate >= weekAgo;
    } else if (filter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return accDate >= monthAgo;
    }
    return true;
  });

  // Group by date
  const groupedByDate: Record<string, string[]> = {};
  filteredAccomplishments.forEach((acc) => {
    if (!groupedByDate[acc.date]) {
      groupedByDate[acc.date] = [];
    }
    groupedByDate[acc.date].push(acc.text);
  });

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Stats
  const totalCount = filteredAccomplishments.length;
  const uniqueDays = sortedDates.length;
  const avgPerDay = uniqueDays > 0 ? (totalCount / uniqueDays).toFixed(1) : '0';

  const handleAddAccomplishment = async () => {
    if (!newAccomplishment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      // Find or create today's log
      const existingLog = dailyLogs.find((l) => l.date === today);
      const updatedLog = existingLog
        ? {
            ...existingLog,
            accomplishments: [...(existingLog.accomplishments || []), newAccomplishment.trim()],
          }
        : {
            date: today,
            day_type: null,
            energy_level: null,
            hours_slept: null,
            work_hours: null,
            school_hours: null,
            free_hours: null,
            overall_rating: null,
            notes: null,
            sick: false,
            accomplishments: [newAccomplishment.trim()],
            created_at: new Date().toISOString(),
          };

      // Save with goal matching
      await saveDailyLog(
        updatedLog,
        goals.filter((g) => g.status === 'active'),
        async (updatedGoal) => {
          await saveGoal(updatedGoal);
        }
      );

      setNewAccomplishment('');
    } catch (error) {
      console.error('Error adding accomplishment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddAccomplishment();
    }
  };

  return (
    <PanelWindow>
      <WindowHeader>
        <HeaderContent>
          <span>Accomplishments - Wins Log</span>
          <Button size="sm" onClick={onClose}>
            ✕
          </Button>
        </HeaderContent>
      </WindowHeader>

      <Content>
        {/* Goal Update Toast */}
        {goalUpdateMessage && (
          <div style={{
            background: '#90EE90',
            border: '2px solid #008000',
            padding: '8px',
            marginBottom: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}>
            {goalUpdateMessage}
          </div>
        )}

        {/* Stats */}
        <Stats>
          <StatItem>
            <StatValue>{totalCount}</StatValue>
            <StatLabel>Total Wins</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{uniqueDays}</StatValue>
            <StatLabel>Days Logged</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{avgPerDay}</StatValue>
            <StatLabel>Avg/Day</StatLabel>
          </StatItem>
        </Stats>

        {/* Filter */}
        <FilterBar>
          <FilterButton $active={filter === 'week'} onClick={() => setFilter('week')}>
            This Week
          </FilterButton>
          <FilterButton $active={filter === 'month'} onClick={() => setFilter('month')}>
            This Month
          </FilterButton>
          <FilterButton $active={filter === 'all'} onClick={() => setFilter('all')}>
            All Time
          </FilterButton>
        </FilterBar>

        {/* Accomplishments List */}
        <GroupBox label="Your Wins" style={{ flex: 1, overflow: 'hidden' }}>
          <AccomplishmentsList>
            {sortedDates.length === 0 ? (
              <EmptyState>
                No accomplishments logged yet.
                <br />
                Start by adding your first win below!
              </EmptyState>
            ) : (
              sortedDates.map((date) => {
                const dateObj = parseISO(date);
                const formattedDate = isValid(dateObj)
                  ? format(dateObj, 'EEEE, MMM d, yyyy')
                  : date;

                return (
                  <DayGroup key={date}>
                    <DayHeader>{formattedDate}</DayHeader>
                    {groupedByDate[date].map((text, idx) => (
                      <AccomplishmentItem key={idx}>
                        <Bullet>✓</Bullet>
                        <AccomplishmentText>{text}</AccomplishmentText>
                      </AccomplishmentItem>
                    ))}
                  </DayGroup>
                );
              })
            )}
          </AccomplishmentsList>
        </GroupBox>

        {/* Add New */}
        <InputArea>
          <StyledInput
            placeholder="What did you accomplish?"
            value={newAccomplishment}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAccomplishment(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <Button onClick={handleAddAccomplishment} disabled={isSubmitting || !newAccomplishment.trim()}>
            {isSubmitting ? '...' : 'Add'}
          </Button>
        </InputArea>
      </Content>
    </PanelWindow>
  );
}
