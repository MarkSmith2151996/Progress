# Progress Tracker - Complete Documentation

> **Last Updated:** February 6, 2026
> **Main File:** `C:\Users\Big A\Progress-temp`
> **Mobile:** https://progress-umber-six.vercel.app/mobile
> **Desktop:** `dist\win-unpacked\Progress Tracker.exe`
> **Repo:** https://github.com/MarkSmith2151996/Progress.git

---

## Quick Start

```bash
# Mobile — open on any phone
https://progress-umber-six.vercel.app/mobile

# Desktop — run the Electron app
C:\Users\Big A\Progress-temp\dist\win-unpacked\Progress Tracker.exe

# Development
npm run dev              # Next.js dev server (localhost:3000)
npm run electron:dev     # Electron dev mode
npm run desktop:build    # Build desktop .exe

# Coach Server (must be running on PC for mobile coach to work)
cd coach-server && npm install && node server.js

# Deploy (auto-deploys to Vercel on push)
git push origin main
```

---

## Architecture

```
┌───────────────────────┐     ┌───────────────────────┐
│     Mobile App        │     │     Desktop App       │
│     (Vercel)          │     │     (Electron)        │
│                       │     │                       │
│  5 tabs: Wins, To Do, │     │  Calendar + Coach     │
│  Monthly, Goals, Coach│     │  Outlook Express UI   │
│                       │     │                       │
│  Win95 keyboard       │     │  Direct Claude CLI    │
│  (no native keyboard) │     │  via Electron IPC     │
└───────────┬───────────┘     └───────────┬───────────┘
            │                             │
            └──────────┬──────────────────┘
                       │
                ┌──────▼──────┐
                │  Supabase   │
                │  (Postgres) │
                │  Real-time  │
                └──────┬──────┘
                       │
            ┌──────────▼──────────┐
            │   Coach Server      │
            │   (Your PC)         │
            │                     │
            │   Supabase listener │
            │   → Claude CLI      │
            │   → Response back   │
            │   + Daily digests   │
            └─────────────────────┘
```

**Key insight:** NO Claude API key is used anywhere. All AI features use Claude CLI (Max subscription). The coach server on your PC bridges mobile to Claude CLI via Supabase as a message queue.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18 | App framework, SSR |
| UI | react95, styled-components | Windows 95 retro theme |
| State | Zustand | goalStore, logStore, coachStore |
| Database | Supabase (Postgres) | Cloud storage + real-time sync |
| Desktop | Electron 40 | Windows app wrapper |
| AI | Claude CLI | Coach chat, goal matching, digests |
| Offline | localStorage | Fallback when Supabase unavailable |
| Deploy | Vercel | Mobile web hosting (auto-deploy) |
| Deploy | electron-builder | Desktop .exe packaging |

---

## Database (Supabase)

**Project URL:** https://nmagobufnzbxcvbbntvn.supabase.co
**Dashboard:** https://supabase.com/dashboard/project/nmagobufnzbxcvbbntvn

### Tables

| Table | Primary Key | Purpose | Key Columns |
|-------|------------|---------|-------------|
| `goals` | goal_id (text) | Goal tracking | title, type, target_value, current_value, starting_value, deadline, status, keywords[], increment_type |
| `daily_logs` | date (date) | Daily journal | day_type, energy_level, hours_slept, work_hours, overall_rating, notes, accomplishments[] |
| `habits` | habit_id (text) | Habit definitions | name, target_minutes, days_active[], active, sort_order |
| `habit_completions` | completion_id (text) | Daily check-offs | habit_id (FK), date, completed |
| `tasks` | task_id (text) | Day-specific to-dos | goal_id (FK), description, planned_date, status, time_estimated, notes |
| `coach_messages` | id (uuid) | Chat relay queue | session_id, role, content, platform, status (pending/processing/completed/error) |
| `coach_digests` | id (uuid) | AI summaries | digest_type (daily/weekly), content, metrics (jsonb), digest_date |
| `user_settings` | id (text) | Preferences | coach_context, theme |

### Real-time
All tables have real-time subscriptions enabled (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`). Changes on mobile appear on desktop instantly.

### Schema File
Full SQL schema is in `supabase-schema.sql` — run in Supabase SQL Editor to recreate all tables.

---

## Environment Variables

### App (`.env.local` — gitignored)
```
NEXT_PUBLIC_SUPABASE_URL=https://nmagobufnzbxcvbbntvn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...        # For Supabase CLI/Management API
GOOGLE_SPREADSHEET_ID=...            # Google Sheets integration
GOOGLE_CREDENTIALS=...               # Service account JSON
```

### Coach Server (`coach-server/.env` — gitignored)
```
SUPABASE_URL=https://nmagobufnzbxcvbbntvn.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

**Note:** No ANTHROPIC_API_KEY needed. Claude CLI authenticates via Max subscription.

---

## Data Flow

### Every Write (optimistic update pattern)
```
User action (tap checkbox, submit form)
  → Zustand store updates local state immediately (feels instant)
  → browserStorage writes to localStorage (offline cache)
  → Supabase upserts to cloud (if configured)
  → syncStatus changes: syncing → synced (or error/offline)
```

### Every Read (Supabase-first)
```
App loads
  → Try Supabase fetch (cloud data)
  → If fails → Fall back to browserStorage (localStorage)
  → Hydrate Zustand store
  → Subscribe to Supabase real-time for live updates
```

### Smart Goal Matching
```
User logs accomplishment: "took one SAT test"
  → goalUpdater.ts tries Claude CLI first
  → Claude returns: { goalId: "sat-goal", delta: 1 }
  → Falls back to keyword matching if CLI unavailable
  → Goal auto-updates: 0/2 → 1/2
  → Toast notification: "Goal updated!"
```

### Coach Message Relay (mobile)
```
User sends message on mobile Coach tab
  → coachStore inserts into coach_messages (status: 'pending')
  → Coach server on PC detects via real-time subscription
  → Server builds context from Supabase data
  → Server calls: claude -p "SYSTEM: ... USER: ..."
  → Server inserts response (status: 'completed')
  → Mobile receives via real-time subscription
  → Message appears in chat
```

---

## File Structure (Complete)

```
Progress-temp/
├── .env.local                         # Environment variables (gitignored)
├── .gitignore
├── package.json                       # Dependencies + scripts
├── next.config.js                     # Next.js config (styled-components, standalone)
├── vercel.json                        # Vercel deploy config (iad1, 30s timeout)
├── electron-builder.yml               # Desktop build config (Windows/Mac/Linux)
├── tsconfig.json                      # TypeScript config
├── supabase-schema.sql                # Full database schema
├── SETUP.md                           # This file
├── COACH_PLAN.md                      # Coach integration architecture plan
│
├── src/
│   ├── app/
│   │   ├── page.tsx                   # Desktop entry → renders Dashboard
│   │   ├── layout.tsx                 # Root layout (React95Provider)
│   │   ├── login/page.tsx             # PIN login page
│   │   ├── mobile/
│   │   │   ├── page.tsx               # Main mobile UI (2,133 lines) — 5 tabs
│   │   │   ├── layout.tsx             # Mobile layout (PWA meta, Win95 keyboard)
│   │   │   ├── coach/page.tsx         # Redirects to main page Coach tab
│   │   │   ├── calendar/page.tsx      # Monthly calendar + day log editor (575 lines)
│   │   │   └── settings/page.tsx      # Habit/goal mgmt, import/export (511 lines)
│   │   └── api/
│   │       ├── auth/verify-pin/route.ts
│   │       ├── goals/route.ts
│   │       ├── habits/route.ts
│   │       ├── daily-logs/route.ts
│   │       ├── tasks/route.ts
│   │       ├── habit-completions/route.ts
│   │       ├── settings/route.ts
│   │       ├── coach/chat/route.ts
│   │       ├── coach/parse/route.ts
│   │       ├── coach/summary/route.ts
│   │       ├── analytics/route.ts
│   │       ├── field-proposals/route.ts
│   │       ├── import/route.ts
│   │       └── summaries/weekly|monthly/route.ts
│   │
│   ├── components/
│   │   ├── Dashboard.tsx              # Desktop: calendar + coach + taskbar
│   │   ├── AccomplishmentsPanel95.tsx  # Accomplishments panel
│   │   ├── QuickLog95.tsx             # Quick daily log entry
│   │   ├── coach/CoachPanel95.tsx     # Outlook Express-style AI coach (695 lines)
│   │   ├── calendar/MonthCalendar95.tsx
│   │   ├── popups/DayPopup95.tsx
│   │   ├── popups/WeeklyGoalsPopup95.tsx
│   │   ├── popups/MonthlyGoalsPopup95.tsx
│   │   ├── settings/SettingsPanel95.tsx
│   │   ├── settings/RemindersPanel95.tsx
│   │   ├── debug/DebugPanel95.tsx
│   │   ├── mobile/MobileShared.tsx    # 30+ shared styled components
│   │   ├── mobile/Win95Icons.tsx      # CSS pixel art icons (317 lines)
│   │   ├── mobile/Win95Keyboard.tsx   # Global on-screen keyboard (230 lines)
│   │   ├── providers/React95Provider.tsx
│   │   └── shared/                    # Alert, Button, LoadingSlider, etc.
│   │
│   ├── stores/
│   │   ├── goalStore.ts               # Goals CRUD + real-time (200 lines)
│   │   ├── logStore.ts                # Logs, habits, tasks, completions (500 lines)
│   │   ├── coachStore.ts              # Coach chat + digest + relay (275 lines)
│   │   ├── settingsStore.ts           # Theme, coach_context
│   │   └── analyticsStore.ts          # Analytics/patterns
│   │
│   ├── lib/
│   │   ├── supabase.ts                # All Supabase CRUD + subscriptions (782 lines)
│   │   ├── browserStorage.ts          # localStorage fallback (192 lines)
│   │   ├── goalUpdater.ts             # Smart goal matching: Claude + keywords (282 lines)
│   │   ├── claude.ts                  # Claude CLI wrapper + NLP parsing (584 lines)
│   │   ├── contextBuilder.ts          # Build context package for coach (166 lines)
│   │   ├── metrics.ts                 # Streaks, scores, patterns, milestones (794 lines)
│   │   ├── analytics.ts               # Analytics calculations
│   │   ├── coachSync.ts               # Legacy coach sync (Telegram proxy)
│   │   ├── summaryGenerator.ts        # Weekly/monthly summaries (460 lines)
│   │   ├── fieldProposals.ts          # AI field proposal system
│   │   ├── storage.ts                 # Generic storage utils
│   │   ├── localStorage.ts            # Low-level localStorage
│   │   ├── sheets.ts                  # Google Sheets integration
│   │   ├── debug.ts                   # Debug logging
│   │   ├── safeAsync.ts               # Safe async helpers
│   │   └── registry.tsx               # styled-components SSR registry
│   │
│   ├── hooks/
│   │   ├── useElectron.ts             # Electron detection
│   │   ├── useMediaQuery.ts           # Responsive breakpoints
│   │   └── useTheme.ts                # Theme hook
│   │
│   ├── types/index.ts                 # All TypeScript types (403 lines)
│   └── middleware.ts                  # PIN auth + Vercel route redirects
│
├── main/
│   ├── background.ts                  # Electron main process + Claude CLI
│   ├── env-loader.ts                  # Load .env.local for Electron
│   └── preload.ts                     # Electron IPC bridge (9 methods)
│
├── coach-server/
│   ├── server.js                      # Supabase relay → Claude CLI (517 lines)
│   ├── package.json                   # @supabase/supabase-js, dotenv
│   ├── .env                           # Supabase credentials (gitignored)
│   └── start.bat                      # Windows startup script
│
├── public/
│   ├── manifest.json                  # PWA manifest
│   ├── sw.js                          # Service worker
│   └── icons/                         # App icons
│
└── dist/                              # Electron build output (gitignored)
    └── win-unpacked/
        └── Progress Tracker.exe
```

---

## Mobile App — Detailed

### Tab 1: Wins (Accomplishments)
- Log what you accomplished today
- Free-text entry → auto-matched to goals via Claude
- Accomplishments list sorted by date (newest first)
- Edit/delete individual accomplishments
- Auto-goal update toast when Claude matches

### Tab 2: To Do
**Sub-tab: Habits**
- Recurring daily habits with checkboxes
- Shows streak count per habit
- Edit habit (name, target minutes, active days)
- Completion rate indicator

**Sub-tab: Tasks**
- Day-specific to-do items
- Date navigation (previous / today / next)
- Checkboxes to mark complete
- Edit task: description, date, status (planned/completed/skipped/rolled), goal link, time estimate, notes
- "+" button opens Add To-Do popup with Habit/Task type selector

### Tab 3: Monthly Goals
- Monthly goal cards with progress bars
- Goal details: title, current/target value, deadline, type
- Add/edit/delete goals
- Smart keywords for auto-matching
- Increment types: count, value, time

### Tab 4: Goals Summary
- All active goals at a glance
- Progress percentage + days remaining per goal
- Click to edit any goal
- Status indicators: ahead, on track, behind

### Tab 5: Coach (AI)
**Sub-view: Chat**
- Real-time conversation with Claude via Supabase relay
- Online/offline status indicator
- 90s timeout with "coach offline" fallback message
- Messages displayed as Win95-styled bubbles

**Sub-view: Digest**
- Latest daily AI-generated summary
- Previous digests history
- Generated by coach server every 24 hours

**Sub-view: Stats (Dashboard)**
- Habits completed today (count + percentage)
- Tasks completed this week
- Active goals with progress bars + days remaining
- Total log days and total wins logged
- No AI needed — computed from Supabase data

### Global Features
- **Win95 on-screen keyboard**: Auto-appears on ALL text inputs. Native iOS keyboard is suppressed via `inputMode="none"`. QWERTY layout with numbers, shift, backspace, enter, punctuation. Date pickers and selects still use native controls.
- **Sync status bar**: Shows synced/offline/syncing/error with colored indicator
- **Refresh button**: Manual sync
- **Title bar**: Tab name + context-appropriate "+" button + calendar/settings shortcuts
- **Bottom tab bar**: 5 tabs (Wins, To Do, Monthly, Goals, Coach) with Win95-styled icons

### Popups (8 total)
1. **Add Goal** — title, target value, deadline, type, keywords, increment type
2. **Edit Goal** — same fields + current progress + status dropdown
3. **Add Accomplishment** — free-text textarea
4. **Edit Accomplishment** — edit text + delete option
5. **Edit Habit** — name, target minutes, active toggle
6. **Add To-Do** — type selector (Habit/Task), then appropriate fields
7. **Edit Task** — description, date, status, goal link, time, notes + delete
8. **Toast** — auto-hide notification for goal updates

---

## Desktop App — Detailed

### Layout
- **Left panel**: Calendar (MonthCalendar95) — month grid, day/week click
- **Right panel**: Coach (CoachPanel95) — Outlook Express-style chat
- **Bottom taskbar**: Start, Quick Log, Wins, Reminders, Debug, clock

### CoachPanel95 (695 lines)
- Stats bar: weekly score, streak, habits completed, active alerts count
- Message list with Outlook-style inbox
- Preview pane for selected message
- Compose area with Enter-to-send
- Context editor: age, schedule, constraints, preferences, corrections
- Direct Claude CLI via Electron IPC (no relay needed)

### Electron IPC Bridge (preload.ts)
```typescript
window.electronAPI = {
  coachChat(message, userContext?)     // → Claude CLI chat
  parseInput(input)                    // → Claude parse accomplishments
  applyParsedItems(items)              // → Apply parsed items to context
  getContext()                         // → Read local context.json
  updateContext(updates)               // → Write local context.json
  getDataPath()                        // → Get data directory path
  minimizeWindow()                     // Window controls
  maximizeWindow()
  closeWindow()
}
```

### Electron Main Process (background.ts)
- Creates BrowserWindow with Win95-appropriate settings
- Manages local context file at `{userData}/data/context.json`
- Claude CLI wrapper: `spawn('cmd.exe', ['/c', 'claude', '-p', prompt])`
- 60-second timeout on CLI calls
- In production: starts bundled Next.js standalone server
- In dev: connects to localhost:3000

---

## Coach Server — Detailed

**Location:** `coach-server/`
**Runtime:** Node.js (plain JS, not TypeScript)
**Dependencies:** @supabase/supabase-js, dotenv

### server.js Flow
```
1. Startup
   ├── Validate env vars (SUPABASE_URL, SUPABASE_ANON_KEY)
   ├── Connect to Supabase
   ├── Process pending message backlog
   ├── Start real-time subscription for new messages
   ├── Generate first daily digest
   └── Start 24-hour digest scheduler

2. On New Pending Message (real-time INSERT)
   ├── Update status → 'processing'
   ├── Fetch last 6 messages from session (conversation history)
   ├── Fetch user context from Supabase:
   │   ├── Active goals
   │   ├── Recent tasks (7 days)
   │   ├── Active habits
   │   ├── Habit completions (7 days)
   │   └── Daily logs (7 days)
   ├── Calculate metrics:
   │   ├── Goal progress (% + days remaining)
   │   ├── Task completion rate
   │   ├── Habit completion rate
   │   ├── Logging streak
   │   └── Alerts (behind pace, low completion, positive streaks)
   ├── Build system prompt with all data
   ├── Call: claude -p "<system prompt> User: <message>"
   ├── Insert assistant response (status: 'completed')
   └── On error: insert error message (status: 'error')

3. Daily Digest (every 24h)
   ├── Build full context from Supabase
   ├── Call Claude CLI for summary
   └── Insert into coach_digests table

4. Graceful Shutdown (Ctrl+C)
   ├── Remove Supabase real-time channel
   ├── Clear digest interval
   └── Exit
```

### System Prompt Template
The server builds a detailed system prompt including:
- Coach role (direct, data-driven, concise)
- User context (age 17, goals: SAT 1500+, $36K savings, FBA prep)
- Current date + logging streak
- Active goals with progress % and days remaining
- This week's task completion + habit rate
- Today's habits with completion status
- Alerts (warnings + positive reinforcements)
- Response guidelines (status → insight → win → fix → action)

### Auto-start with Windows
1. Double-click `coach-server\start.bat`, or
2. Create shortcut to `start.bat` in `shell:startup` folder (`Win+R → shell:startup`)

---

## Stores — Detailed

### goalStore.ts (200 lines)
| State | Type | Description |
|-------|------|-------------|
| goals | Goal[] | All goals |
| isLoading | boolean | Fetch in progress |
| error | string \| null | Last error |
| syncStatus | SyncStatus | synced/offline/syncing/error |

| Method | Description |
|--------|-------------|
| fetchGoals() | Load from Supabase (fallback localStorage) |
| saveGoal(goal) | Upsert goal (optimistic + sync) |
| addGoal(goal) | Create new goal |
| updateGoal(goal) | Update existing goal |
| deleteGoal(goalId) | Delete goal |
| getActiveGoals() | Filter status === 'active' |
| getGoalsByType(type) | Filter by monthly/weekly/bonus |
| subscribeToRealtime() | Listen for goal changes |
| unsubscribeFromRealtime() | Stop listening |

### logStore.ts (500 lines)
| State | Type | Description |
|-------|------|-------------|
| dailyLogs | DailyLog[] | All daily logs |
| tasks | Task[] | All tasks |
| habits | Habit[] | All habits |
| habitCompletions | HabitCompletion[] | All completions |
| syncStatus | SyncStatus | Sync indicator |
| goalUpdateMessage | string \| null | Toast message after auto-goal update |

| Method | Description |
|--------|-------------|
| fetchData() | Load all collections from Supabase |
| saveDailyLog(log, goals?, onUpdate?) | Save log + trigger auto-goal matching |
| saveTask(task) | Upsert task |
| deleteTask(taskId) | Delete task |
| toggleTask(taskId) | Toggle planned ↔ completed |
| addHabit(habit) | Create habit |
| updateHabit(habit) | Update habit |
| deleteHabit(habitId) | Delete habit |
| toggleHabit(habitId, date) | Toggle habit completion |
| getTodayHabits() | Get habits active today |
| getTasksByDate(date) | Get tasks for specific date |

### coachStore.ts (275 lines)
| State | Type | Description |
|-------|------|-------------|
| chatHistory | ChatMessage[] | Current session messages |
| sessionId | string | Unique session identifier |
| coachOnline | boolean | Server reachable? |
| latestDigest | CoachDigest \| null | Today's digest |
| digestHistory | CoachDigest[] | Past 7 digests |
| isLoadingChat | boolean | Waiting for response |
| subscription | RealtimeChannel \| null | Live message listener |

| Method | Description |
|--------|-------------|
| initSession() | Subscribe to Supabase for this session |
| sendMessage(content) | Send via IPC (desktop) or Supabase relay (mobile) |
| fetchDigest() | Get latest daily digest |
| fetchDigestHistory() | Get past 7 digests |
| clearChat() | Reset session + re-subscribe |
| cleanup() | Remove subscription |

**Dual mode:**
- **Electron**: `window.electronAPI.coachChat(message)` → direct Claude CLI
- **Web/Mobile**: Insert into `coach_messages` table → coach server processes → response via subscription

---

## Key Libraries — Detailed

### supabase.ts (782 lines)
- `getSupabaseClient()` — lazy-init with env vars
- `isSupabaseConfigured()` — check if URL + key present
- Type converters: `dbToGoal`, `goalToDb`, etc. (snake_case ↔ camelCase)
- CRUD for all 5 main tables (fetch, upsert, delete)
- Real-time subscriptions for goals, daily_logs, habits, habit_completions
- Coach message CRUD: `getCoachMessages`, `sendCoachMessage`, `subscribeToCoachMessages`
- Coach digest: `getLatestDigest`, `getDigestHistory`
- User settings: `fetchUserSettings`, `upsertUserSettings`, `updateCoachContext`

### browserStorage.ts (192 lines)
- localStorage with `progress95_` prefix
- Mirrors Supabase schema: goals, dailyLogs, habits, habitCompletions, tasks
- Upsert pattern: find existing by ID → update or push new
- SSR-safe (checks `typeof window`)

### goalUpdater.ts (282 lines)
- `matchAccomplishmentToGoal(text, goals)` — Claude CLI semantic match
- `processAccomplishment(text, goals)` — match + apply delta
- Keyword fallback: auto-extract from goal title, fuzzy match
- Delta extraction: words→numbers, dollar amounts, time durations
- Default delta = 1 if no number extracted

### claude.ts (584 lines)
- `callClaudeCLI(systemPrompt, userMessage)` — spawn `cmd.exe /c claude -p`
- `buildSystemPrompt(ctx)` — data-driven system prompt with tone calibration
- `getCoachSummary(ctx)` — 2-3 sentence status update
- `getChatResponse(ctx, history, message)` — chat with last 6 messages context
- `parseAccomplishments(ctx, rawInput)` — hybrid regex + Claude parsing
- Time extraction: "2h 30m", "9-11pm", "few hours"
- Difficulty detection: "struggled", "easy", "brutal"
- Fuzzy goal matching with keyword confidence scoring

### contextBuilder.ts (166 lines)
- `buildContextPackage()` — fetches all data, computes metrics
- Returns: currentDate, energy, activeGoals (with progress), tasks, habits, streak, alerts, patterns

### metrics.ts (794 lines)
- Goal: `calculateGoalProgress`, `determineGoalStatus` (ahead/on_track/behind)
- Weekly: `calculateWeeklyScore` (40% tasks + 35% goals + 15% bonus + 10% consistency)
- Streaks: `calculateHabitStreak`, `calculateLoggingStreak`
- Trends: `calculate7DayAverage`, `calculate30DayTrend`
- Correlations: `analyzeSleepCorrelation`, `analyzeEnergyCorrelation` (Pearson)
- Patterns: `detectPatterns` (worst weekday, post-work drops)
- Records: `calculatePersonalRecords` (best scores, longest streaks)
- Milestones: 7/14/21/30/60/90/100/150/200/365 day tracking

---

## TypeScript Types (types/index.ts — 403 lines)

### Core Types
```typescript
Goal          { goal_id, title, type, target_value, current_value, starting_value, deadline, status, keywords[], increment_type }
Task          { task_id, goal_id, description, planned_date, completed_date, status, time_estimated, notes }
DailyLog      { date, day_type, energy_level, hours_slept, work_hours, overall_rating, notes, accomplishments[] }
Habit         { habit_id, name, target_minutes, days_active[], active, sort_order }
HabitCompletion { completion_id, habit_id, date, completed }
```

### Status Types
```typescript
GoalType      = 'monthly' | 'weekly_chunk' | 'bonus'
GoalStatus    = 'active' | 'completed' | 'abandoned' | 'paused'
TaskStatus    = 'planned' | 'completed' | 'skipped' | 'rolled'
DayType       = 'school' | 'work' | 'both' | 'off'
AlertLevel    = 'critical' | 'warning' | 'info' | 'positive'
```

### Coach Types
```typescript
ChatMessage      { id, role, content, timestamp }
CoachMessage     { id, session_id, role, content, platform, status, created_at, processed_at }
CoachDigest      { id, digest_type, content, metrics, digest_date, created_at }
CoachMessageStatus = 'pending' | 'processing' | 'completed' | 'error'
ContextPackage   { currentDate, energy, activeGoals[], tasksPlanned/Completed, weeklyScore, habitsToday[], streak, alerts[], patterns[] }
```

### Other Types
```typescript
GoalWithProgress, HabitWithStatus, Session, ExternalFactor, WeeklySnapshot, MonthlyReview
CustomField, FieldProposal, DailyMetrics, WeeklyMetrics, UserSettings, Theme, Alert
ParsedAccomplishment { description, goalId, timeSpent, difficulty, category }
```

---

## Win95 Keyboard — Detailed

**File:** `src/components/mobile/Win95Keyboard.tsx` (230 lines)
**Rendered in:** `src/app/mobile/layout.tsx` (global for all mobile pages)

### How it works
1. Listens for `focusin` events on the document
2. When an `<input>` or `<textarea>` gains focus (except `type="date"`), shows keyboard
3. Uses the **native value setter trick** to update React controlled inputs:
   ```javascript
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, newValue)
   el.dispatchEvent(new Event('input', { bubbles: true }))
   ```
4. `onMouseDown`/`onTouchStart` use `preventDefault()` to stop keyboard from stealing focus
5. "Done" button hides keyboard and blurs input

### Layout
```
[ 1 ][ 2 ][ 3 ][ 4 ][ 5 ][ 6 ][ 7 ][ 8 ][ 9 ][ 0 ][ <- ]
  [ q ][ w ][ e ][ r ][ t ][ y ][ u ][ i ][ o ][ p ]
   [ a ][ s ][ d ][ f ][ g ][ h ][ j ][ k ][ l ]
[Shift][ z ][ x ][ c ][ v ][ b ][ n ][ m ][ . ][ ? ]
     [ , ][ ' ][      Space      ][ Enter ]
```

### Native keyboard suppression
`StyledInput` and `StyledTextArea` in `MobileShared.tsx` use `.attrs({ inputMode: 'none' })` which tells iOS/Android not to show the native keyboard. Date inputs are excluded.

---

## Shared Components (MobileShared.tsx)

30+ exported styled components:

| Category | Components |
|----------|-----------|
| Layout | MobileContainer, MainWindow, ContentArea, TitleBar, TitleBarButton, ScrollArea |
| Navigation | BottomTabs, BottomTab, TabIcon, TabLabel |
| Lists | ListContainer, ListItem, Checkbox, ListItemText, ListItemMeta |
| Forms | StyledInput, StyledTextArea, StyledSelect, FormRow, FormLabel |
| Toggles | ToggleGroup, ToggleButton |
| Popups | PopupOverlay, PopupWindow, PopupContent |
| Goals | GoalCard, GoalTitle, GoalProgressWrapper, GoalPercentage |
| Sync | SyncStatusBar, SyncStatusText, SyncStatusIcon, RefreshButton |
| Empty | EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateText |
| Other | SectionHeader, AddButton, AccomplishmentItem, AccomplishmentContent |

---

## Vercel Config

- **Region:** iad1 (US East)
- **API timeout:** 30s max
- **API cache:** no-store (all /api/* endpoints)
- **Middleware:** PIN auth, root → /mobile redirect, desktop routes blocked on Vercel
- **Build:** TypeScript/ESLint errors skipped for speed
- **Framework:** Next.js (auto-detected)

---

## Electron Build Config (electron-builder.yml)

- **App ID:** com.progress-tracker.app
- **Windows:** NSIS installer (x64), desktop + start menu shortcuts
- **Mac:** DMG (x64 + arm64), productivity category
- **Linux:** AppImage (x64)
- **Bundling:** Next.js standalone output, asar archive, native module unpacking
- **Output:** `dist/` directory

---

## Git & Deploy

- **Repo:** https://github.com/MarkSmith2151996/Progress.git
- **Branch:** main
- **Auto-deploy:** Push to main triggers Vercel build
- **Vercel project:** progress (prj_pD0DrAi06HXGnkACx0DTswBXGwZP)

### NPM Scripts
```bash
npm run dev              # Next.js dev server
npm run dev:basic        # Next.js dev (no Turbopack)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm run type-check       # TypeScript check (npx tsc --noEmit)
npm run electron:dev     # Electron dev mode
npm run electron:build   # Build Electron
npm run desktop:build    # Full desktop build (prepare + package)
npm run desktop:prepare  # Prepare standalone for Electron
npm run desktop:run      # Run built desktop app
```

---

## Smart Goal Tracking — Detailed

### Increment Types
| Type | Extracts | Example |
|------|----------|---------|
| `count` | Numbers | "one" → 1, "three" → 3, "5" → 5 |
| `value` | Money | "$50" → 50, "100 dollars" → 100 |
| `time` | Duration | "2 hours" → 2, "30 minutes" → 0.5 |

### Matching Flow
1. User logs: "Completed 2 SAT practice tests today"
2. `goalUpdater.ts` sends to Claude CLI with active goals list
3. Claude returns: `{ goalId: "goal_abc", delta: 2 }`
4. If Claude fails → keyword matching: "SAT" matches goal with keyword "sat"
5. Delta extraction: "2" found → delta = 2
6. Goal updates: current_value += 2
7. Toast: "SAT Tests: 2/5 → 4/5"

### Keyword Auto-Generation
When a goal title is "Take 5 SAT practice tests":
- Stopwords removed: "Take", "5"
- Keywords: `['sat', 'practice', 'tests']`
- Stored in `goals.keywords[]` column
