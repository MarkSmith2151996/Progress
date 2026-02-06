'use client';

import { useState, useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';
import { Button } from 'react95';
import { useCoachStore } from '@/stores/coachStore';
import { useGoalStore } from '@/stores/goalStore';
import { useLogStore } from '@/stores/logStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { calculateLoggingStreak, calculateWeeklyScore } from '@/lib/metrics';

// Windows 95 3D border effects
const sunken3D = css`
  border-top: 2px solid #808080;
  border-left: 2px solid #808080;
  border-right: 2px solid #ffffff;
  border-bottom: 2px solid #ffffff;
  box-shadow: inset 1px 1px 0 #000000;
`;

const raised3D = css`
  border-top: 2px solid #ffffff;
  border-left: 2px solid #ffffff;
  border-right: 2px solid #808080;
  border-bottom: 2px solid #808080;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 4px;
  font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 4px;
  background: #c0c0c0;
  font-size: 11px;
  flex-wrap: wrap;
`;

const StatItem = styled.span`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const StatLabel = styled.span`
  color: #000;
`;

const StatValue = styled.strong`
  color: #000080;
`;

const AlertBadge = styled.span`
  background: #ff0000;
  color: #fff;
  padding: 0 4px;
  font-size: 9px;
  font-weight: bold;
`;

// Outlook Express style message list
const MessageListContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  ${sunken3D}
  background: #ffffff;
  min-height: 120px;
  overflow: hidden;
`;

const MessageListHeader = styled.div`
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: 4px;
  padding: 2px 4px;
  background: #c0c0c0;
  border-bottom: 1px solid #808080;
  font-size: 10px;
  font-weight: bold;
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  background: #ffffff;
`;

const MessageRow = styled.div<{ $isUser: boolean; $isSelected?: boolean }>`
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: 4px;
  padding: 2px 4px;
  font-size: 11px;
  cursor: default;
  background: ${props => props.$isSelected ? '#000080' : '#ffffff'};
  color: ${props => props.$isSelected ? '#ffffff' : '#000000'};
  border-bottom: 1px solid #e0e0e0;

  &:hover {
    background: ${props => props.$isSelected ? '#000080' : '#e8e8e8'};
  }
`;

const MessageIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
`;

const MessageFrom = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: ${props => props.className?.includes('unread') ? 'bold' : 'normal'};
`;

const MessageTime = styled.span`
  font-size: 10px;
  color: inherit;
  opacity: 0.8;
`;

// Message preview/reading pane
const PreviewPane = styled.div`
  ${sunken3D}
  background: #ffffff;
  padding: 8px;
  min-height: 80px;
  max-height: 120px;
  overflow-y: auto;
  font-size: 11px;
  line-height: 1.4;
`;

const PreviewHeader = styled.div`
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #c0c0c0;
  font-size: 10px;
  color: #808080;
`;

// Compose area (like email compose)
const ComposeArea = styled.div`
  ${sunken3D}
  background: #ffffff;
  padding: 4px;
`;

const ComposeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  background: #c0c0c0;
  margin: -4px -4px 4px -4px;
  font-size: 10px;
`;

const ComposeInput = styled.textarea`
  width: 100%;
  min-height: 40px;
  max-height: 60px;
  border: none;
  resize: none;
  font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
  font-size: 11px;
  outline: none;
  background: #ffffff;

  &::placeholder {
    color: #808080;
  }
`;

const SendToolbar = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
  justify-content: flex-end;
`;

const ContextModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #c0c0c0;
  border: 2px outset #ffffff;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
  z-index: 2000;
  min-width: 400px;
  max-width: 90vw;
`;

const ContextModalHeader = styled.div`
  background: linear-gradient(90deg, #000080, #1084d0);
  color: white;
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 12px;
`;

const ContextModalContent = styled.div`
  padding: 12px;
`;

const ContextTextarea = styled.textarea`
  width: 100%;
  min-height: 150px;
  font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
  font-size: 11px;
  padding: 8px;
  border: 2px inset #808080;
  resize: vertical;
  margin-bottom: 8px;
`;

const ContextHint = styled.div`
  font-size: 10px;
  color: #808080;
  margin-bottom: 8px;
  line-height: 1.4;
`;

const ContextSection = styled.div`
  margin-bottom: 12px;
  padding: 8px;
  background: #ffffff;
  border: 1px inset #808080;
`;

const ContextSectionTitle = styled.div`
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 6px;
  color: #000080;
`;

const ContextKnownItem = styled.div`
  font-size: 11px;
  padding: 2px 0;
  display: flex;
  align-items: flex-start;
  gap: 4px;
`;

const ContextBullet = styled.span`
  color: #008000;
`;

const ContextQuestion = styled.div`
  margin-top: 8px;
`;

const ContextLabel = styled.label`
  font-size: 10px;
  font-weight: bold;
  display: block;
  margin-bottom: 2px;
`;

const ContextInput = styled.input`
  width: 100%;
  padding: 4px;
  font-size: 11px;
  border: 1px inset #808080;
  margin-bottom: 6px;
`;

const ContextSmallTextarea = styled.textarea`
  width: 100%;
  min-height: 50px;
  font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
  font-size: 11px;
  padding: 4px;
  border: 1px inset #808080;
  resize: vertical;
  margin-bottom: 6px;
`;

const ContextButtonRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const ContextButton = styled(Button)`
  font-size: 11px;
  min-width: 60px;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1999;
`;

export function CoachPanel95() {
  const [inputValue, setInputValue] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [editingContext, setEditingContext] = useState('');
  const [contextFields, setContextFields] = useState({
    age: '',
    situation: '',
    workSchedule: '',
    constraints: '',
    preferences: '',
    corrections: '',
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    summary,
    chatHistory,
    alerts,
    isLoadingSummary,
    isLoadingChat,
    fetchSummary,
    sendMessage,
  } = useCoachStore();

  const { goals, getActiveGoals } = useGoalStore();
  const { dailyLogs, tasks, habitCompletions, habits, getTodayHabits } = useLogStore();
  const { fetchAnalysis, overallHealth } = useAnalyticsStore();
  const { coach_context, setCoachContext } = useSettingsStore();

  const activeGoals = getActiveGoals();
  const todayHabits = getTodayHabits();
  const streak = calculateLoggingStreak(dailyLogs);
  const habitsCompleted = todayHabits.filter((h) => h.completed).length;
  const activeAlerts = alerts.filter((a) => !a.dismissed);
  const weeklyScore = calculateWeeklyScore(tasks, goals, habitCompletions, habits, dailyLogs);

  useEffect(() => {
    fetchSummary(coach_context);
    fetchAnalysis();
  }, [fetchSummary, fetchAnalysis, coach_context]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Auto-select newest message
    if (chatHistory.length > 0) {
      setSelectedMessageId(chatHistory[chatHistory.length - 1].id);
    }
  }, [chatHistory]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim(), coach_context);
    setInputValue('');
  };

  const handleOpenContextModal = () => {
    // Try to parse existing context into fields
    const lines = coach_context.split('\n').filter(l => l.trim());
    const fields = {
      age: '',
      situation: '',
      workSchedule: '',
      constraints: '',
      preferences: '',
      corrections: '',
    };

    // Simple parsing of existing context
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('year') && lower.includes('old') || lower.includes('age')) {
        fields.age = line;
      } else if (lower.includes('work') && (lower.includes('hour') || lower.includes('job') || lower.includes('schedule'))) {
        fields.workSchedule = line;
      } else if (lower.includes('constraint') || lower.includes('challenge') || lower.includes('balance')) {
        fields.constraints = fields.constraints ? fields.constraints + '\n' + line : line;
      } else if (lower.includes('prefer') || lower.includes('better') || lower.includes('adhd') || lower.includes('learn')) {
        fields.preferences = fields.preferences ? fields.preferences + '\n' + line : line;
      } else if (lower.includes('correct') || lower.includes('actually') || lower.includes('wrong')) {
        fields.corrections = fields.corrections ? fields.corrections + '\n' + line : line;
      } else {
        fields.situation = fields.situation ? fields.situation + '\n' + line : line;
      }
    });

    setContextFields(fields);
    setShowContextModal(true);
  };

  const handleSaveContext = () => {
    // Build context from fields
    const parts: string[] = [];

    if (contextFields.age.trim()) {
      parts.push(contextFields.age.trim());
    }
    if (contextFields.situation.trim()) {
      parts.push(contextFields.situation.trim());
    }
    if (contextFields.workSchedule.trim()) {
      parts.push(contextFields.workSchedule.trim());
    }
    if (contextFields.constraints.trim()) {
      parts.push(`Constraints: ${contextFields.constraints.trim()}`);
    }
    if (contextFields.preferences.trim()) {
      parts.push(`Preferences: ${contextFields.preferences.trim()}`);
    }
    if (contextFields.corrections.trim()) {
      parts.push(`Corrections: ${contextFields.corrections.trim()}`);
    }

    const fullContext = parts.join('\n');
    setCoachContext(fullContext);
    setShowContextModal(false);
  };

  const updateContextField = (field: keyof typeof contextFields, value: string) => {
    setContextFields(prev => ({ ...prev, [field]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedMessage = chatHistory.find(m => m.id === selectedMessageId);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const truncateMessage = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Container>
      {/* Status Bar - compact stats */}
      <StatsBar>
        <StatItem>
          <StatLabel>Score:</StatLabel>
          <StatValue>{weeklyScore}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Streak:</StatLabel>
          <StatValue>{streak}d</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Habits:</StatLabel>
          <StatValue>{habitsCompleted}/{todayHabits.length}</StatValue>
        </StatItem>
        {activeAlerts.length > 0 && (
          <StatItem>
            <AlertBadge>{activeAlerts.length} Alert{activeAlerts.length > 1 ? 's' : ''}</AlertBadge>
          </StatItem>
        )}
        <Button
          size="sm"
          onClick={handleOpenContextModal}
          style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px' }}
        >
          {coach_context ? 'Edit Context' : 'Add Context'}
        </Button>
      </StatsBar>

      {/* Message List - Outlook Express style inbox */}
      <MessageListContainer>
        <MessageListHeader>
          <span></span>
          <span>From</span>
          <span>Time</span>
        </MessageListHeader>
        <MessageList>
          {isLoadingSummary ? (
            <MessageRow $isUser={false}>
              <MessageIcon>...</MessageIcon>
              <MessageFrom>Loading coach...</MessageFrom>
              <MessageTime></MessageTime>
            </MessageRow>
          ) : chatHistory.length === 0 ? (
            <MessageRow $isUser={false} onClick={() => setSelectedMessageId('welcome')}>
              <MessageIcon>{'>'}</MessageIcon>
              <MessageFrom className="unread">Coach</MessageFrom>
              <MessageTime>Now</MessageTime>
            </MessageRow>
          ) : (
            chatHistory.map((msg) => (
              <MessageRow
                key={msg.id}
                $isUser={msg.role === 'user'}
                $isSelected={selectedMessageId === msg.id}
                onClick={() => setSelectedMessageId(msg.id)}
              >
                <MessageIcon>
                  {msg.role === 'user' ? '\u{1F464}' : '\u{1F4BB}'}
                </MessageIcon>
                <MessageFrom>
                  {msg.role === 'user' ? 'You' : 'Coach'}
                  {' - '}
                  {truncateMessage(msg.content)}
                </MessageFrom>
                <MessageTime>{formatTime(msg.timestamp)}</MessageTime>
              </MessageRow>
            ))
          )}
          <div ref={chatEndRef} />
        </MessageList>
      </MessageListContainer>

      {/* Preview Pane - shows selected message */}
      <PreviewPane>
        <PreviewHeader>
          {selectedMessage ? (
            <>
              <strong>From:</strong> {selectedMessage.role === 'user' ? 'You' : 'Coach'} |
              <strong> Date:</strong> {new Date(selectedMessage.timestamp).toLocaleString()}
            </>
          ) : chatHistory.length === 0 ? (
            <>
              <strong>From:</strong> Coach | <strong>Subject:</strong> Welcome
            </>
          ) : (
            'Select a message to read'
          )}
        </PreviewHeader>
        {selectedMessage ? (
          selectedMessage.content
        ) : chatHistory.length === 0 ? (
          summary || 'Ask me anything about your progress! I can help you track goals, analyze patterns, and stay motivated.'
        ) : (
          <span style={{ color: '#808080' }}>Click a message above to view it here.</span>
        )}
      </PreviewPane>

      {/* Compose Area - like writing an email */}
      <ComposeArea>
        <ComposeHeader>
          <span>To: Coach</span>
          <span style={{ marginLeft: 'auto', color: '#808080' }}>
            {isLoadingChat && 'Sending...'}
          </span>
        </ComposeHeader>
        <ComposeInput
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here... (Enter to send, Shift+Enter for new line)"
          disabled={isLoadingChat}
        />
        <SendToolbar>
          <Button size="sm" onClick={() => setInputValue('')} disabled={!inputValue}>
            Clear
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isLoadingChat || !inputValue.trim()}
          >
            {isLoadingChat ? 'Sending...' : 'Send'}
          </Button>
        </SendToolbar>
      </ComposeArea>

      {/* Context Editor Modal */}
      {showContextModal && (
        <>
          <Overlay onClick={() => setShowContextModal(false)} />
          <ContextModal style={{ maxHeight: '85vh', overflow: 'auto' }}>
            <ContextModalHeader>
              <span>Coach Context - What I Know About You</span>
              <Button
                size="sm"
                onClick={() => setShowContextModal(false)}
                style={{ minWidth: 20, padding: '0 4px' }}
              >
                X
              </Button>
            </ContextModalHeader>
            <ContextModalContent>
              {/* What the system knows */}
              <ContextSection>
                <ContextSectionTitle>What I Currently Know (from your goals):</ContextSectionTitle>
                {activeGoals.length > 0 ? (
                  activeGoals.map((goal) => (
                    <ContextKnownItem key={goal.goal_id}>
                      <ContextBullet>•</ContextBullet>
                      <span>
                        <strong>{goal.title}</strong>: {goal.current_value}/{goal.target_value} {goal.unit}
                        {goal.deadline && ` (due ${goal.deadline})`}
                      </span>
                    </ContextKnownItem>
                  ))
                ) : (
                  <ContextKnownItem>
                    <span style={{ color: '#808080' }}>No active goals yet</span>
                  </ContextKnownItem>
                )}
                <ContextKnownItem style={{ marginTop: 8 }}>
                  <ContextBullet>•</ContextBullet>
                  <span>Logging streak: <strong>{streak} days</strong></span>
                </ContextKnownItem>
                <ContextKnownItem>
                  <ContextBullet>•</ContextBullet>
                  <span>Weekly score: <strong>{weeklyScore}</strong></span>
                </ContextKnownItem>
              </ContextSection>

              {/* Clarification questions */}
              <ContextSection>
                <ContextSectionTitle>Tell me more (so I can give better advice):</ContextSectionTitle>

                <ContextQuestion>
                  <ContextLabel>How old are you? What's your situation?</ContextLabel>
                  <ContextInput
                    value={contextFields.age}
                    onChange={(e) => updateContextField('age', e.target.value)}
                    placeholder="e.g., I'm a 17-year-old high school senior"
                  />
                </ContextQuestion>

                <ContextQuestion>
                  <ContextLabel>What's your work/school schedule?</ContextLabel>
                  <ContextInput
                    value={contextFields.workSchedule}
                    onChange={(e) => updateContextField('workSchedule', e.target.value)}
                    placeholder="e.g., School 8-3, work 4-9 three days a week"
                  />
                </ContextQuestion>

                <ContextQuestion>
                  <ContextLabel>What are your main constraints/challenges?</ContextLabel>
                  <ContextSmallTextarea
                    value={contextFields.constraints}
                    onChange={(e) => updateContextField('constraints', e.target.value)}
                    placeholder="e.g., Balancing school + work + SAT prep, limited free time on weekdays"
                  />
                </ContextQuestion>

                <ContextQuestion>
                  <ContextLabel>How do you learn/work best?</ContextLabel>
                  <ContextSmallTextarea
                    value={contextFields.preferences}
                    onChange={(e) => updateContextField('preferences', e.target.value)}
                    placeholder="e.g., I have ADHD, work better in 25-min bursts, mornings are best for focus"
                  />
                </ContextQuestion>

                <ContextQuestion>
                  <ContextLabel>Anything I got wrong? Corrections?</ContextLabel>
                  <ContextSmallTextarea
                    value={contextFields.corrections}
                    onChange={(e) => updateContextField('corrections', e.target.value)}
                    placeholder="e.g., My SAT goal is actually 1500 not 1340, I already have $19k saved"
                  />
                </ContextQuestion>
              </ContextSection>

              <ContextButtonRow>
                <ContextButton onClick={() => setShowContextModal(false)}>
                  Cancel
                </ContextButton>
                <ContextButton onClick={handleSaveContext}>
                  Save Context
                </ContextButton>
              </ContextButtonRow>
            </ContextModalContent>
          </ContextModal>
        </>
      )}
    </Container>
  );
}
