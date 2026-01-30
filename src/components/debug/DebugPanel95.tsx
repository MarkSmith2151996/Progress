'use client';

import React, { useState, useEffect } from 'react';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  ScrollView,
  Fieldset,
  Tabs,
  Tab,
  TabBody,
} from 'react95';
import styled from 'styled-components';
import { getDebugLogs, clearDebugLogs } from '@/lib/debug';
import { checkProxyHealth } from '@/lib/coachSync';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';

const StyledWindow = styled(Window)`
  width: 650px;
  height: 550px;
  position: fixed;
  top: 50px;
  left: 50px;
  z-index: 1000;
`;

const CloseButton = styled(Button)`
  margin-left: auto;
`;

const LogEntry = styled.div<{ $level: string }>`
  font-size: 11px;
  font-family: monospace;
  color: ${({ $level }) => {
    switch ($level) {
      case 'error': return '#e74c3c';
      case 'warn': return '#f39c12';
      case 'success': return '#2ecc71';
      default: return '#3498db';
    }
  }};
  border-bottom: 1px solid #ccc;
  padding: 2px 0;
  word-break: break-word;
`;

const StatusIndicator = styled.span<{ $status: string }>`
  color: ${({ $status }) => {
    switch ($status) {
      case 'online': return '#2ecc71';
      case 'offline': return '#f39c12';
      default: return '#95a5a6';
    }
  }};
`;

const PreBlock = styled.pre`
  font-size: 10px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow: auto;
`;

interface DebugPanelProps {
  onClose: () => void;
}

export function DebugPanel95({ onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [proxyStatus, setProxyStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState(0);
  const [testResults, setTestResults] = useState<string[]>([]);

  const dailyLogs = useLogStore((s) => s.dailyLogs);
  const habits = useLogStore((s) => s.habits);
  const habitCompletions = useLogStore((s) => s.habitCompletions);
  const tasks = useLogStore((s) => s.tasks);
  const goals = useGoalStore((s) => s.goals);
  const logError = useLogStore((s) => s.error);
  const goalError = useGoalStore((s) => s.error);

  useEffect(() => {
    setLogs(getDebugLogs());
    checkProxyHealth().then((ok) => setProxyStatus(ok ? 'online' : 'offline'));
  }, []);

  const refreshLogs = () => {
    setLogs(getDebugLogs());
  };

  const handleClearLogs = () => {
    clearDebugLogs();
    setLogs([]);
  };

  const runTests = async () => {
    const results: string[] = [];

    // Test 1: LocalStorage
    try {
      localStorage.setItem('debug_test', 'test');
      localStorage.removeItem('debug_test');
      results.push('LocalStorage: Working');
    } catch {
      results.push('LocalStorage: FAILED');
    }

    // Test 2: Proxy Health
    const proxyOk = await checkProxyHealth();
    setProxyStatus(proxyOk ? 'online' : 'offline');
    results.push(proxyOk ? 'Proxy: Online' : 'Proxy: Offline (coach features disabled)');

    // Test 3: Log Store State
    results.push(`Log Store: ${dailyLogs.length} logs, ${habits.length} habits, ${habitCompletions.length} completions, ${tasks.length} tasks`);
    if (logError) results.push(`Log Store Error: ${logError}`);

    // Test 4: Goal Store State
    results.push(`Goal Store: ${goals.length} goals`);
    if (goalError) results.push(`Goal Store Error: ${goalError}`);

    // Test 5: API Connectivity
    try {
      const response = await fetch('/api/daily-logs');
      if (response.ok) {
        results.push('Daily Logs API: OK');
      } else {
        results.push(`Daily Logs API: Error ${response.status}`);
      }
    } catch (err: any) {
      results.push(`Daily Logs API: FAILED - ${err.message}`);
    }

    try {
      const response = await fetch('/api/goals');
      if (response.ok) {
        results.push('Goals API: OK');
      } else {
        results.push(`Goals API: Error ${response.status}`);
      }
    } catch (err: any) {
      results.push(`Goals API: FAILED - ${err.message}`);
    }

    try {
      const response = await fetch('/api/habits');
      if (response.ok) {
        results.push('Habits API: OK');
      } else {
        results.push(`Habits API: Error ${response.status}`);
      }
    } catch (err: any) {
      results.push(`Habits API: FAILED - ${err.message}`);
    }

    setTestResults(results);
  };

  const handleTabChange = (value: number) => {
    setActiveTab(value);
  };

  return (
    <StyledWindow>
      <WindowHeader className="window-header">
        <span>Debug Panel</span>
        <CloseButton size="sm" onClick={onClose}>
          X
        </CloseButton>
      </WindowHeader>
      <WindowContent>
        <Fieldset label="Status" style={{ marginBottom: 8 }}>
          <StatusIndicator $status={proxyStatus}>
            {proxyStatus === 'online' && 'Coach proxy: Online'}
            {proxyStatus === 'offline' && 'Coach proxy: Offline (app works, no sync)'}
            {proxyStatus === 'checking' && 'Coach proxy: Checking...'}
          </StatusIndicator>
          {logError && <div style={{ color: '#e74c3c' }}>LogStore Error: {logError}</div>}
          {goalError && <div style={{ color: '#e74c3c' }}>GoalStore Error: {goalError}</div>}
        </Fieldset>

        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab value={0}>Logs</Tab>
          <Tab value={1}>State</Tab>
          <Tab value={2}>Tests</Tab>
        </Tabs>

        <TabBody style={{ height: 320 }}>
          {activeTab === 0 && (
            <>
              <div style={{ marginBottom: 8 }}>
                <Button onClick={refreshLogs} size="sm">Refresh</Button>
                {' '}
                <Button onClick={handleClearLogs} size="sm">Clear</Button>
                {' '}
                <span style={{ fontSize: 11, color: '#666' }}>{logs.length} logs</span>
              </div>
              <ScrollView style={{ height: 260 }}>
                {logs.slice().reverse().map((log, i) => (
                  <LogEntry key={i} $level={log.level || 'info'}>
                    <strong>[{log.timestamp}] [{log.area}]</strong> {log.message}
                    {log.data && (
                      <span style={{ color: '#666' }}>
                        {' '}
                        {typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}
                      </span>
                    )}
                  </LogEntry>
                ))}
                {logs.length === 0 && (
                  <div style={{ color: '#666', padding: 10 }}>No logs yet. Perform some actions to generate logs.</div>
                )}
              </ScrollView>
            </>
          )}

          {activeTab === 1 && (
            <ScrollView style={{ height: 300 }}>
              <Fieldset label={`Daily Logs (${dailyLogs.length})`}>
                <PreBlock>
                  {dailyLogs.length > 0
                    ? JSON.stringify(dailyLogs.slice(-3), null, 2)
                    : 'No logs'}
                </PreBlock>
              </Fieldset>
              <Fieldset label={`Goals (${goals.length})`}>
                <PreBlock>
                  {goals.length > 0
                    ? JSON.stringify(goals, null, 2)
                    : 'No goals'}
                </PreBlock>
              </Fieldset>
              <Fieldset label={`Habits (${habits.length})`}>
                <PreBlock>
                  {habits.length > 0
                    ? JSON.stringify(habits, null, 2)
                    : 'No habits'}
                </PreBlock>
              </Fieldset>
              <Fieldset label={`Tasks (${tasks.length})`}>
                <PreBlock>
                  {tasks.length > 0
                    ? JSON.stringify(tasks.slice(-5), null, 2)
                    : 'No tasks'}
                </PreBlock>
              </Fieldset>
            </ScrollView>
          )}

          {activeTab === 2 && (
            <div>
              <Button onClick={runTests}>Run All Tests</Button>
              {testResults.length > 0 && (
                <div style={{ marginTop: 16, fontFamily: 'monospace', fontSize: 12 }}>
                  {testResults.map((result, i) => (
                    <div
                      key={i}
                      style={{
                        color: result.includes('FAILED') || result.includes('Error')
                          ? '#e74c3c'
                          : result.includes('Offline')
                          ? '#f39c12'
                          : '#2ecc71',
                        marginBottom: 4,
                      }}
                    >
                      {result.includes('FAILED') || result.includes('Error') ? '!' : result.includes('Offline') ? '~' : '='} {result}
                    </div>
                  ))}
                </div>
              )}
              {testResults.length === 0 && (
                <p style={{ marginTop: 16, color: '#666' }}>
                  Click &quot;Run All Tests&quot; to run diagnostic tests on all app features.
                </p>
              )}
            </div>
          )}
        </TabBody>
      </WindowContent>
    </StyledWindow>
  );
}

export default DebugPanel95;
