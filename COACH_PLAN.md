# Coach Integration Plan — Claude CLI via Supabase Relay

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  MOBILE (Vercel)                                            │
│  ┌───────────────────────────────────────┐                  │
│  │  Coach Tab (5th tab)                  │                  │
│  │  ├── Chat View (real-time)            │                  │
│  │  ├── Daily Digest                     │                  │
│  │  ├── Data Dashboard                   │                  │
│  │  └── Win95 Keyboard (custom)          │                  │
│  └────────────┬──────────────────────────┘                  │
│               │ write message (status: 'pending')           │
│               ▼                                             │
│          Supabase                                           │
│       coach_messages table                                  │
│       (real-time subscription)                              │
│               │                                             │
└───────────────┼─────────────────────────────────────────────┘
                │
                │  real-time subscription
                ▼
┌─────────────────────────────────────────────────────────────┐
│  YOUR PC (Coach Server — always running)                    │
│  ┌───────────────────────────────────────┐                  │
│  │  1. Detects new pending message       │                  │
│  │  2. Builds context from Supabase data │                  │
│  │  3. Calls Claude CLI (-p flag)        │                  │
│  │  4. Writes response back to Supabase  │                  │
│  │  5. Mobile gets it via subscription   │                  │
│  └───────────────────────────────────────┘                  │
│                                                             │
│  Also: generates daily digests on schedule                  │
│  Also: desktop coach works directly (existing IPC)          │
│  Starts automatically with Windows (startup shortcut)       │
└─────────────────────────────────────────────────────────────┘
```

## Constraint: NO Claude API — CLI Only (Max subscription)

---

## Phase 1: Supabase Tables

### New table: `coach_messages`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| session_id | text | Groups messages in a conversation |
| role | text | 'user' or 'assistant' |
| content | text | Message content |
| platform | text | 'mobile' or 'desktop' |
| status | text | 'pending', 'processing', 'completed', 'error' |
| created_at | timestamptz | Auto |
| processed_at | timestamptz | When server processed it |

### New table: `coach_digests`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| digest_type | text | 'daily' or 'weekly' |
| content | text | The generated digest text |
| metrics | jsonb | Snapshot of metrics at digest time |
| digest_date | date | Which day/week this is for |
| created_at | timestamptz | Auto |

---

## Phase 2: Coach Server (runs on your PC)

**Location**: `coach-server/` at project root

### Files:
- `coach-server/package.json` — deps: @supabase/supabase-js, dotenv
- `coach-server/server.ts` — main loop: subscribe to pending messages, process, respond
- `coach-server/cli.ts` — Claude CLI wrapper (spawn `claude -p`)
- `coach-server/context.ts` — builds context from Supabase data (mirrors contextBuilder.ts logic)
- `coach-server/.env` — Supabase URL + anon key (same as app)

### Server Flow:
```
1. Start → Connect to Supabase
2. Subscribe to coach_messages where status = 'pending' (real-time)
3. On new pending message:
   a. Set status → 'processing'
   b. Fetch last 6 messages from same session_id (conversation history)
   c. Build context package from Supabase data (goals, tasks, habits, logs)
   d. Build system prompt (same format as existing buildSystemPrompt)
   e. Call Claude CLI: `claude -p "SYSTEM: ... USER: ..."`
   f. Write assistant response to coach_messages (status: 'completed')
   g. If error → write error message with status: 'error'
4. Daily digest (scheduled, e.g., 7 AM):
   a. Build full context package
   b. Ask Claude for daily summary + insights + recommendations
   c. Store in coach_digests table
5. Online status: Write heartbeat to a coach_status table or Supabase key
```

### Auto-start:
- Create a `.bat` file that runs `node server.js`
- Add shortcut to `shell:startup` folder
- Shows a small console window (or runs hidden with `start /min`)

---

## Phase 3: Mobile Coach Tab (5th tab in mobile UI)

### Tab Design:
Add `COACH: 4` to TABS constant. New Coach tab with 3 sub-views via ToggleGroup:

#### Sub-view 1: Chat
- Message list (Outlook Express style, same as desktop but mobile-sized)
- Each message: role indicator, content, timestamp
- Input area at bottom with Win95 Keyboard (no native keyboard)
- Status indicator: "Coach: Online" / "Coach: Offline" (based on heartbeat)
- Loading state while waiting for response (pulsing "..." in Win95 style)
- If offline: "Message queued — will be processed when coach server is online"

#### Sub-view 2: Digest
- Shows latest daily digest from coach_digests table
- Card layout: Summary, Key Insights, Alerts, Recommendations
- Date selector to view past digests
- If no digest: "No digest yet today — server generates one each morning"

#### Sub-view 3: Dashboard
- **No Claude needed** — computed entirely from Supabase data
- Logging streak counter
- Habit completion rate (this week)
- Goal progress bars (active goals)
- Weekly score trend (sparkline or bar chart)
- Alerts (same as contextBuilder generates)
- This is a data-only view, always works even offline

### Files Modified:
- `src/app/mobile/page.tsx` — Add COACH tab, render coach sub-views
- `src/types/index.ts` — Add CoachMessage, CoachDigest, CoachSession types
- `src/stores/coachStore.ts` — Rewrite for Supabase relay (non-Electron path)
- `src/lib/supabase.ts` — Add coach_messages + coach_digests CRUD + subscriptions

---

## Phase 4: Win95 Custom Keyboard

**New file**: `src/components/mobile/Win95Keyboard.tsx`

### Design:
- Built with react95 `Button` components
- QWERTY layout, 4 rows + space bar row
- Keys styled like Win95 buttons (raised 3D border, depressed on press)
- Special keys: Shift (toggle), Backspace (←), Space, Enter (↵)
- Numbers row at top
- Compact for mobile (keys ~32px wide)
- Slides up from bottom when chat input is focused

### Behavior:
- Chat input uses `inputMode="none"` to suppress native keyboard
- Each key press appends to input value
- Backspace removes last character
- Enter sends the message
- Shift toggles uppercase for one key press
- Keyboard height: ~200px

### Style reference (Win95 button):
```
background: #c0c0c0
border: 2px solid
border-color: #dfdfdf #808080 #808080 #dfdfdf (raised)
border-color: #808080 #dfdfdf #dfdfdf #808080 (pressed)
```

---

## Phase 5: Desktop Integration

Desktop already works via Electron IPC → Claude CLI. Changes:
- When desktop sends/receives coach messages, ALSO write them to Supabase coach_messages
- This syncs desktop chat history with mobile
- Desktop can show digests from Supabase too

---

## Phase 6: Context Management

### Context file structure for Claude CLI:
The system prompt sent to Claude CLI is built from:
1. **Static context** — user profile (age, goals, situation) — rarely changes
2. **Dynamic context** — today's data (habits, tasks, scores, alerts) — built fresh
3. **Conversation history** — last 6 messages from the session
4. **Tone calibration** — based on weekly score + trend

### Keeping it efficient:
- Total prompt target: <4000 chars (CLI works best with concise prompts)
- Context is rebuilt per-message from Supabase data
- No persistent Claude conversation (each CLI call is independent)
- Conversation history included in prompt gives continuity

---

## Implementation Order

1. **Supabase tables** — Create coach_messages + coach_digests tables
2. **Types** — Add TypeScript types for new tables
3. **Coach server** — Build and test the relay server
4. **supabase.ts** — Add CRUD + subscriptions for coach tables
5. **coachStore.ts** — Rewrite non-Electron path to use Supabase relay
6. **Win95Keyboard** — Build the custom keyboard component
7. **Mobile page** — Add 5th Coach tab with chat, digest, dashboard sub-views
8. **Desktop sync** — Write desktop messages to Supabase too
9. **Auto-start** — Create startup script for coach server
10. **Test** — End-to-end: mobile sends message → server processes → mobile receives

---

## Files Summary

### New Files:
| File | Purpose |
|------|---------|
| `coach-server/package.json` | Server dependencies |
| `coach-server/server.ts` | Main relay server |
| `coach-server/cli.ts` | Claude CLI wrapper |
| `coach-server/context.ts` | Context builder from Supabase |
| `coach-server/.env` | Supabase credentials |
| `coach-server/start.bat` | Windows startup script |
| `src/components/mobile/Win95Keyboard.tsx` | Custom Win95 keyboard |

### Modified Files:
| File | Changes |
|------|---------|
| `src/types/index.ts` | Add CoachMessage, CoachDigest types |
| `src/lib/supabase.ts` | Add coach table CRUD + real-time |
| `src/stores/coachStore.ts` | Supabase relay for non-Electron |
| `src/app/mobile/page.tsx` | 5th Coach tab + sub-views |
| `src/components/mobile/MobileShared.tsx` | Any new shared styles needed |
| `main/background.ts` | Sync desktop messages to Supabase |
