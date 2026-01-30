import React, { useState, useEffect } from 'react';
import { Window, WindowHeader, WindowContent, Button, TextInput, GroupBox } from 'react95';
import { debug, debugSuccess, debugError } from '../lib/debug';

interface QuickLogProps {
  onClose: () => void;
}

interface DetectedItems {
  sat: number | null;
  savings: number | null;
  hours: number | null;
  habits: string[];
}

// Local parsing for live preview
function parseInput(text: string): DetectedItems {
  const result: DetectedItems = {
    sat: null,
    savings: null,
    hours: null,
    habits: [],
  };

  const lower = text.toLowerCase();

  // SAT score detection: "got 1420", "scored 1380", "sat 1450"
  const satMatch = text.match(/(?:got|scored|sat|test)\s*(\d{3,4})/i);
  if (satMatch) {
    const score = parseInt(satMatch[1]);
    if (score >= 400 && score <= 1600) {
      result.sat = score;
    }
  }

  // Savings detection: "saved $50", "put away 100", "saved 50 bucks"
  const savingsMatch = text.match(/(?:saved?|put away|deposited?)\s*\$?(\d+)/i);
  if (savingsMatch) {
    result.savings = parseInt(savingsMatch[1]);
  }

  // Work hours detection: "worked 6 hours", "6hr shift", "8 hours"
  const hoursMatch = text.match(/(?:worked?\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)/i);
  if (hoursMatch) {
    result.hours = parseFloat(hoursMatch[1]);
  }

  // Habit detection
  const habitKeywords = ['gym', 'workout', 'exercise', 'meditation', 'meditated', 'reading', 'read', 'sat practice', 'practice test'];
  habitKeywords.forEach(keyword => {
    if (lower.includes(keyword)) {
      // Normalize habit names
      let habit = keyword;
      if (keyword === 'workout' || keyword === 'exercise') habit = 'gym';
      if (keyword === 'meditated') habit = 'meditation';
      if (keyword === 'read') habit = 'reading';
      if (keyword === 'practice test') habit = 'sat practice';

      if (!result.habits.includes(habit)) {
        result.habits.push(habit);
      }
    }
  });

  return result;
}

export function QuickLog95({ onClose }: QuickLogProps) {
  const [input, setInput] = useState('');
  const [detected, setDetected] = useState<DetectedItems>({ sat: null, savings: null, hours: null, habits: [] });
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live parse as user types
  useEffect(() => {
    setDetected(parseInput(input));
  }, [input]);

  const hasDetected = detected.sat || detected.savings || detected.hours || detected.habits.length > 0;

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setSending(true);
    setError(null);
    debug('QuickLog', 'Sending to coach: ' + input);

    try {
      const res = await fetch('http://localhost:3457/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude',
          messages: [{ role: 'user', content: input }]
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || data.error?.message || 'No response';

      debugSuccess('QuickLog', 'Coach response received');
      setResponse(text);
    } catch (err: any) {
      debugError('QuickLog', 'Failed to send', err);
      setError(err.message || 'Failed to connect to coach');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Success view with coach response
  if (response) {
    return (
      <Window style={{ width: 400, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
        <WindowHeader>
          <span>Coach Says</span>
        </WindowHeader>
        <WindowContent>
          <div style={{
            background: '#000',
            color: '#0f0',
            padding: 12,
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1.5,
            maxHeight: 200,
            overflow: 'auto',
            marginBottom: 12
          }}>
            {response}
          </div>

          {hasDetected && (
            <div style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>
              Logged:
              {detected.sat && ` SAT ${detected.sat}`}
              {detected.savings && ` +$${detected.savings}`}
              {detected.hours && ` ${detected.hours}hrs`}
              {detected.habits.length > 0 && ` [${detected.habits.join(', ')}]`}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => { setResponse(null); setInput(''); }} style={{ flex: 1 }}>
              Log More
            </Button>
            <Button primary onClick={onClose} style={{ flex: 1 }}>
              Done
            </Button>
          </div>
        </WindowContent>
      </Window>
    );
  }

  return (
    <Window style={{ width: 400, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
      <WindowHeader className="flex justify-between items-center">
        <span>Quick Log</span>
        <Button size="sm" onClick={onClose}>X</Button>
      </WindowHeader>
      <WindowContent>
        <p style={{ fontSize: 12, marginBottom: 8, color: '#666' }}>
          Type naturally: &quot;got 1420 on SAT, saved $50, did gym&quot;
        </p>

        <TextInput
          multiline
          rows={3}
          placeholder="What did you do today?"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ width: '100%', fontFamily: 'monospace' }}
          autoFocus
        />

        {/* Live Preview */}
        {hasDetected && (
          <GroupBox label="Detected" style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {detected.sat && (
                <span style={{ background: '#90EE90', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                  SAT: {detected.sat}
                </span>
              )}
              {detected.savings && (
                <span style={{ background: '#90EE90', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                  Saved: ${detected.savings}
                </span>
              )}
              {detected.hours && (
                <span style={{ background: '#90EE90', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                  Hours: {detected.hours}
                </span>
              )}
              {detected.habits.map(h => (
                <span key={h} style={{ background: '#87CEEB', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                  {h}
                </span>
              ))}
            </div>
          </GroupBox>
        )}

        {error && (
          <div style={{ color: 'red', fontSize: 12, marginTop: 8 }}>
            Error: {error}
          </div>
        )}

        <Button
          primary
          onClick={handleSubmit}
          disabled={sending || !input.trim()}
          style={{ width: '100%', marginTop: 12, padding: 8 }}
        >
          {sending ? 'Sending...' : 'Send to Coach'}
        </Button>

        <p style={{ fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center' }}>
          Press Enter to send | Coach will parse and respond
        </p>
      </WindowContent>
    </Window>
  );
}
