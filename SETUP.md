# Progress Tracker - Complete Documentation

> **Last Updated:** February 16, 2026
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

# MCP Server (lets Claude Code / Claude Desktop read+write all data)
cd mcp-server && npm install && node src/index.js

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
│  Monthly, Goals,      │     │  Outlook Express UI   │
│  Report Card          │     │                       │
│                       │     │  Direct Claude CLI    │
│  Win95 keyboard       │     │  via Electron IPC     │
│  (no native keyboard) │     │                       │
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
            │   MCP Server        │
            │   (Your PC)         │
            │                     │
            │   Claude Code /     │
            │   Claude Desktop    │
            │   reads + writes    │
            │   all data via      │
            │   Supabase          │
            │                     │
            │   13 tools +        │
            │   1 prompt          │
            └─────────────────────┘
```

**Key insight:** NO Claude API key is used anywhere. All AI features use Claude CLI (Max subscription). The MCP server lets Claude Code and Claude Desktop read/write all Progress data directly via Supabase.

**Note:** The old `coach-server/` (Supabase relay → Claude CLI for mobile chat) is still in the repo but no longer actively used. The Coach tab was replaced with a Weekly Report Card. Desktop still has its own Coach panel via Electron IPC.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18 | App framework, SSR |
| UI | react95, styled-components | Windows 95 retro theme |
| State | Zustand | goalStore, logStore, settingsStore (+ coachStore for desktop) |
| Database | Supabase (Postgres) | Cloud storage + real-time sync |
| Desktop | Electron 40 | Windows app wrapper |
| AI | Claude CLI | Goal matching, digests, MCP tools |
| MCP | @modelcontextprotocol/sdk | Claude Code/Desktop data access |
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
| `daily_logs` | date (date) | Daily journal | day_type, difficulty_tier (low/med/high), energy_level, hours_slept, work_hours, overall_rating, notes, accomplishments[] |
| `habits` | habit_id (text) | Habit definitions | name, target_minutes, days_active[], active, sort_order |
| `habit_completions` | completion_id (text) | Daily check-offs | habit_id (FK), date, completed |
| `tasks` | task_id (text) | Day-specific to-dos | goal_id (FK), description, planned_date, status, time_estimated, notes |
| `coach_messages` | id (uuid) | Chat relay queue (legacy — desktop only) | session_id, role, content, platform, status |
| `coach_digests` | id (uuid) | AI summaries (legacy — desktop only) | digest_type, content, metrics (jsonb), digest_date |
| `user_settings` | id (text) | Preferences | coach_context, theme, preferences (jsonb: display_name, accent_color, font_size, keyboard_size, coach_tone, digest_enabled, etc.) |

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

### MCP Server (`mcp-server/.env` — gitignored)
```
SUPABASE_URL=https://nmagobufnzbxcvbbntvn.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

### Coach Server (`coach-server/.env` — gitignored, legacy)
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

### MCP Server (Claude Code / Claude Desktop)
```
User asks Claude Code: "How did I do this week?"
  → Claude calls get_weekly_report MCP tool
  → MCP server queries Supabase (tasks, habits, logs, goals)
  → Computes weekly score + breakdown
  → Returns structured data to Claude
  → Claude formats response for user

User asks Claude: "Update my goal progress"
  → Claude calls evaluate_goals MCP tool (gathers all evidence per goal)
  → Claude analyzes: tasks completed, accomplishments logged, habit data
  → Claude DERIVES real progress % from evidence (ignores stored numbers)
  → Presents proposed updates with reasoning
  → User confirms → Claude calls update_goal_progress for each goal
  → Changes appear in mobile app via real-time sync
```

### Coach Message Relay (legacy — desktop only)
```
Desktop coach still works via Electron IPC → direct Claude CLI
Mobile coach tab has been replaced with Weekly Report Card
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
├── COACH_PLAN.md                      # Coach integration architecture plan (legacy)
├── .mcp.json                          # Claude Code MCP server config
│
├── mcp-server/                        # MCP server for Claude Code / Desktop
│   ├── package.json                   # @modelcontextprotocol/sdk, @supabase/supabase-js, date-fns, dotenv, zod
│   ├── .env                           # Supabase credentials (gitignored)
│   └── src/
│       ├── index.js                   # Main MCP server — 13 tools + 1 prompt (546 lines)
│       └── supabase.js                # Supabase client + query helpers (117 lines)
│
├── src/
│   ├── app/
│   │   ├── page.tsx                   # Desktop entry → renders Dashboard
│   │   ├── layout.tsx                 # Root layout (React95Provider)
│   │   ├── login/page.tsx             # PIN login page
│   │   ├── mobile/
│   │   │   ├── page.tsx               # Main mobile UI (2,482 lines) — 5 tabs
│   │   │   ├── layout.tsx             # Mobile layout (PWA meta, Win95 keyboard)
│   │   │   ├── coach/page.tsx         # Redirects to main page (legacy route)
│   │   │   ├── calendar/page.tsx      # Monthly calendar + day log editor (575 lines)
│   │   │   └── settings/page.tsx      # Comprehensive settings (886 lines) — 7 collapsible sections
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
│   │   ├── mobile/Win95Keyboard.tsx   # Global on-screen keyboard (253 lines) — flex layout
│   │   ├── providers/React95Provider.tsx
│   │   └── shared/                    # Alert, Button, LoadingSlider, etc.
│   │
│   ├── stores/
│   │   ├── goalStore.ts               # Goals CRUD + real-time (200 lines)
│   │   ├── logStore.ts                # Logs, habits, tasks, completions (533 lines)
│   │   ├── coachStore.ts              # Coach chat + digest + relay (275 lines)
│   │   ├── settingsStore.ts           # All preferences + Supabase JSONB sync (254 lines)
│   │   └── analyticsStore.ts          # Analytics/patterns
│   │
│   ├── lib/
│   │   ├── supabase.ts                # All Supabase CRUD + subscriptions (803 lines)
│   │   ├── browserStorage.ts          # localStorage fallback (192 lines)
│   │   ├── goalUpdater.ts             # Smart goal matching: Claude + keywords (282 lines)
│   │   ├── claude.ts                  # Claude CLI wrapper + NLP parsing (584 lines)
│   │   ├── contextBuilder.ts          # Build context package for coach (166 lines)
│   │   ├── metrics.ts                 # Streaks, scores, patterns, milestones (799 lines)
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
│   ├── types/index.ts                 # All TypeScript types (448 lines)
│   └── middleware.ts                  # PIN auth + Vercel route redirects
│
├── main/
│   ├── background.ts                  # Electron main process + Claude CLI
│   ├── env-loader.ts                  # Load .env.local for Electron
│   └── preload.ts                     # Electron IPC bridge (9 methods)
│
├── coach-server/
│   ├── server.js                      # Supabase relay → Claude CLI (532 lines)
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
**"Assign Difficulty" button** — opens week selector popup to set daily difficulty tiers:
- Week navigation with arrows (Mon-Sun calendar view)
- Tap each day to cycle: Low (green) → Med (orange) → High (red)
- Affects expectations — Low days = lighter workload, High = push harder
- Tier shown as colored badge in task header ("Today LOW — 2/5 done")
- Saves to `daily_logs.difficulty_tier`, syncs via Supabase

**Sub-tab: Habits**
- Recurring daily habits with checkboxes
- **Date navigation** (previous / today / next) — backdate forgotten habits
- Only shows habits scheduled for the viewed day (`days_active` filter)
- Shows streak count per habit (always current overall streak)
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

### Tab 5: Weekly Report Card
Replaced the old Coach tab. Shows computed weekly stats — no AI needed.

**Score Card**
- Big number (0-100) with color coding: green ≥80, yellow ≥50, red <50
- Letter grade (A/B/C/D/F)
- Shows "(In Progress)" for current week

**Score Formula** (30/30/20/20 split):
- 30% task completion rate (completed / total tasks in week)
- 30% habit completion rate (completed slots / total scheduled slots)
- 20% logging consistency (days with logs / days in week)
- 20% goal progress (average % across active goals)

**Breakdown Section**
- Tasks completed (e.g., "5 / 8")
- Habit rate (e.g., "75%")
- Days logged (e.g., "5 / 7")
- Logging streak

**Goal Progress**
- Each active goal with title + progress bar + percentage

**Wins List**
- All accomplishments logged during the week

**Week Navigation**
- Previous ◄ / "This Week" or date range label / ► Next
- Navigate to any past week to see historical performance

### Global Features
- **Win95 on-screen keyboard**: Auto-appears on ALL text inputs. Native iOS keyboard is suppressed via `inputMode="none"`. QWERTY layout with numbers, shift, backspace, enter, punctuation. Date pickers and selects still use native controls.
- **Sync status bar**: Shows synced/offline/syncing/error with colored indicator
- **Refresh button**: Manual sync
- **Title bar**: Tab name + context-appropriate "+" button + calendar/settings shortcuts
- **Bottom tab bar**: 5 tabs (Wins, To Do, Monthly, Goals, Report) with Win95-styled icons

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

## MCP Server — Detailed

**Location:** `mcp-server/`
**Runtime:** Node.js (plain JS — TypeScript abandoned due to MCP SDK type depth issues)
**Dependencies:** @modelcontextprotocol/sdk, @supabase/supabase-js, date-fns, dotenv, zod
**Transport:** StdioServerTransport (stdio-based, used by Claude Code and Claude Desktop)

### Configuration

**Claude Code** (`.mcp.json` in project root):
```json
{
  "mcpServers": {
    "progress-tracker": {
      "command": "node",
      "args": ["mcp-server/src/index.js"],
      "cwd": "C:\\Users\\Big A\\Progress-temp"
    }
  }
}
```

**Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "progress-tracker": {
      "command": "node",
      "args": ["C:/Users/Big A/Progress-temp/mcp-server/src/index.js"]
    }
  }
}
```

### Tools (13 total)

**READ tools (7):**

| Tool | Parameters | Description |
|------|-----------|-------------|
| `get_goals` | `active_only?` (bool) | All goals with progress |
| `get_tasks` | `start_date?`, `end_date?` | Tasks for date range (default: last 7 days) |
| `get_habits` | `active_only?` (bool) | Habits with today's completion status |
| `get_habit_completions` | `start_date?`, `end_date?` | Completions for date range |
| `get_daily_logs` | `start_date?`, `end_date?` | Daily logs for date range |
| `get_weekly_report` | `week_offset?` (number) | Computed weekly stats (same formula as Report tab) |
| `evaluate_goals` | *(none)* | Gathers all evidence per goal for AI-driven evaluation |

**WRITE tools (6):**

| Tool | Parameters | Description |
|------|-----------|-------------|
| `add_task` | `description`, `planned_date`, `goal_id?` | Create a task |
| `log_accomplishment` | `text`, `date?` | Add accomplishment to daily log |
| `toggle_habit` | `habit_id`, `date?` | Mark habit done/undone for a date |
| `update_goal_progress` | `goal_id`, `current_value` | Set goal's current progress value |
| `set_difficulty_tier` | `date`, `tier` (low/med/high) | Set day difficulty |
| `generate_weekly_summary` | `content`, `week_start?` | Store AI-generated weekly summary |

### Prompts (1)

| Prompt | Description |
|--------|-------------|
| `update_goals` | Algorithm for Claude to evaluate + update all goal progress |

**`update_goals` flow:**
1. Claude calls `evaluate_goals` to pull all data (goals, tasks, accomplishments, habits)
2. Claude IGNORES existing `current_value` — derives progress from evidence
3. For each goal: analyzes linked tasks + keyword-matching accomplishments + time elapsed
4. Presents proposed changes with reasoning to user
5. Waits for user confirmation
6. Calls `update_goal_progress` for each approved change
7. Changes appear in mobile app via real-time sync

### supabase.js Helpers

| Function | Description |
|----------|-------------|
| `fetchGoals(activeOnly?)` | Query goals table |
| `fetchTasks(start?, end?)` | Query tasks with date range |
| `fetchHabits(activeOnly?)` | Query habits table |
| `fetchHabitCompletions(start?, end?)` | Query completions with date range |
| `fetchDailyLogs(start?, end?)` | Query daily_logs with date range |
| `upsertTask(task)` | Insert or update task |
| `upsertDailyLog(log)` | Insert or update daily log |
| `upsertHabitCompletion(completion)` | Insert or update habit completion |
| `upsertGoal(goal)` | Insert or update goal |

---

## Coach Server — Legacy

> **Note:** The coach server is no longer actively used. The Coach tab was replaced with a Weekly Report Card. Desktop coach still works via Electron IPC (no server needed). The code is preserved in the repo.

**Location:** `coach-server/`
**Runtime:** Node.js (plain JS)
**Dependencies:** @supabase/supabase-js, dotenv

<details>
<summary>Click to expand legacy coach server docs</summary>

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
The server builds a detailed system prompt using **dynamic preferences** from `user_settings.preferences` JSONB:
- Coach role with configurable tone (direct / encouraging / balanced — set in Settings)
- User's display name (from preferences, not hardcoded)
- Custom coach context (free-text background info, set in Settings > Coach)
- Current date + logging streak
- **Today's difficulty tier** (Low/Med/High — from `daily_logs.difficulty_tier`)
- Active goals with progress % and days remaining
- This week's task completion + habit rate
- Today's habits with completion status
- Alerts (warnings + positive reinforcements)
- Response guidelines (status → insight → win → fix → action)

### Auto-start with Windows
1. Double-click `coach-server\start.bat`, or
2. Create shortcut to `start.bat` in `shell:startup` folder (`Win+R → shell:startup`)

</details>

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

### logStore.ts (533 lines)
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
| getHabitsByDate(date) | Get habits active on a specific date (filters by `days_active`) |
| getTasksByDate(date) | Get tasks for specific date |
| getDifficultyTier(date) | Get tier for a date (defaults to 'med') |
| setDifficultyTier(date, tier) | Set Low/Med/High tier for a date |

### coachStore.ts (275 lines) — Desktop Only
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

**Desktop only** — mobile no longer uses the coach. Desktop uses:
- **Electron**: `window.electronAPI.coachChat(message)` → direct Claude CLI

### settingsStore.ts (254 lines)
| State | Type | Description |
|-------|------|-------------|
| display_name | string | User's name (default: 'Antonio') |
| default_tab | number | Tab to open on launch (0-4) |
| accent_color | string | Theme accent color (hex) |
| font_size | FontSize | small/medium/large |
| keyboard_size | KeyboardSize | compact/medium/large |
| coach_tone | CoachTone | direct/encouraging/balanced |
| coach_context | string | Custom coach background info |
| digest_enabled | boolean | Enable daily digests |
| digest_frequency | DigestFrequency | daily/weekly |
| show_streaks | boolean | Show streak counts |
| notifications_enabled | boolean | Push notifications |

| Method | Description |
|--------|-------------|
| setDisplayName(name) | Update name + sync |
| setDefaultTab(tab) | Update default tab + sync |
| setAccentColor(color) | Update color + CSS variable + sync |
| setFontSize(size) | Update font + CSS variable + sync |
| setKeyboardSize(size) | Update keyboard preset + sync |
| setCoachTone(tone) | Update coach personality + sync |
| setCoachContext(ctx) | Update custom context + sync |
| setDigestEnabled(on) | Toggle digest + sync |
| setDigestFrequency(freq) | Update frequency + sync |
| fetchSettings() | Load from Supabase JSONB + apply CSS vars |
| syncPreferences() | Debounced save to Supabase (1.5s) |

**Persistence:** Zustand `persist` middleware saves to localStorage instantly. Changes also sync to `user_settings.preferences` JSONB column in Supabase after a 1.5s debounce.

**CSS Variables:** `setAccentColor` and `setFontSize` update CSS custom properties on `document.documentElement`:
- `--accent-color` — used by MobileContainer background, layout background
- `--font-base`, `--font-list`, `--font-label`, `--font-meta` — used by MobileShared components

---

## Key Libraries — Detailed

### supabase.ts (803 lines)
- `getSupabaseClient()` — lazy-init with env vars
- `isSupabaseConfigured()` — check if URL + key present
- Type converters: `dbToGoal`, `goalToDb`, `dbToDailyLog`, `dailyLogToDb`, etc. (snake_case ↔ camelCase)
- CRUD for all 5 main tables (fetch, upsert, delete)
- Real-time subscriptions for goals, daily_logs, habits, habit_completions
- Coach message CRUD: `getCoachMessages`, `sendCoachMessage`, `subscribeToCoachMessages`
- Coach digest: `getLatestDigest`, `getDigestHistory`
- User settings: `fetchUserSettings`, `upsertUserSettings`, `updateCoachContext`, `saveUserPreferences`
- `saveUserPreferences(prefs)` — upserts JSONB blob to `user_settings.preferences` column
- `DbDailyLog` includes `difficulty_tier` field; converters handle it automatically

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

### metrics.ts (799 lines)
- Habit filtering: `isHabitActiveToday`, `isHabitActiveOnDate` (checks `days_active` for any date)
- Goal: `calculateGoalProgress`, `determineGoalStatus` (ahead/on_track/behind)
- Weekly: `calculateWeeklyScore` (40% tasks + 35% goals + 15% bonus + 10% consistency)
- Streaks: `calculateHabitStreak`, `calculateLoggingStreak`
- Trends: `calculate7DayAverage`, `calculate30DayTrend`
- Correlations: `analyzeSleepCorrelation`, `analyzeEnergyCorrelation` (Pearson)
- Patterns: `detectPatterns` (worst weekday, post-work drops)
- Records: `calculatePersonalRecords` (best scores, longest streaks)
- Milestones: 7/14/21/30/60/90/100/150/200/365 day tracking

---

## TypeScript Types (types/index.ts — 448 lines)

### Core Types
```typescript
Goal          { goal_id, title, type, target_value, current_value, starting_value, deadline, status, keywords[], increment_type }
Task          { task_id, goal_id, description, planned_date, completed_date, status, time_estimated, notes }
DailyLog      { date, day_type, difficulty_tier, energy_level, hours_slept, work_hours, overall_rating, notes, accomplishments[] }
Habit         { habit_id, name, target_minutes, days_active[], active, sort_order }
HabitCompletion { completion_id, habit_id, date, completed }
```

### Status & Settings Types
```typescript
GoalType        = 'monthly' | 'weekly_chunk' | 'bonus'
GoalStatus      = 'active' | 'completed' | 'abandoned' | 'paused'
TaskStatus      = 'planned' | 'completed' | 'skipped' | 'rolled'
DayType         = 'school' | 'work' | 'both' | 'off'
DifficultyTier  = 'low' | 'med' | 'high'
AlertLevel      = 'critical' | 'warning' | 'info' | 'positive'
FontSize        = 'small' | 'medium' | 'large'
KeyboardSize    = 'compact' | 'medium' | 'large'
CoachTone       = 'direct' | 'encouraging' | 'balanced'
DigestFrequency = 'daily' | 'weekly'
```

### Coach Types
```typescript
ChatMessage      { id, role, content, timestamp }
CoachMessage     { id, session_id, role, content, platform, status, created_at, processed_at }
CoachDigest      { id, digest_type, content, metrics, digest_date, created_at }
CoachMessageStatus = 'pending' | 'processing' | 'completed' | 'error'
ContextPackage   { currentDate, energy, activeGoals[], tasksPlanned/Completed, weeklyScore, habitsToday[], streak, alerts[], patterns[] }
```

### Settings Type
```typescript
UserSettings {
  theme, coach_minimized, week_colors, notifications_enabled,
  display_name, default_tab, accent_color, font_size, keyboard_size,
  coach_tone, coach_context, digest_enabled, digest_frequency, show_streaks
}
```

### Other Types
```typescript
GoalWithProgress, HabitWithStatus, Session, ExternalFactor, WeeklySnapshot, MonthlyReview
CustomField, FieldProposal, DailyMetrics, WeeklyMetrics, Theme, Alert
ParsedAccomplishment { description, goalId, timeSpent, difficulty, category }
```

---

## Win95 Keyboard — Detailed

**File:** `src/components/mobile/Win95Keyboard.tsx`
**Rendered in:** `src/app/mobile/layout.tsx` (global for all mobile pages)

### How it works
1. Listens for `focusin` events on the document
2. When an `<input>` or `<textarea>` gains focus (except `type="date"`), shows keyboard
3. Uses the **native value setter trick** to update React controlled inputs
4. `onMouseDown`/`onTouchStart` use `preventDefault()` to stop keyboard from stealing focus
5. "Done" button hides keyboard and blurs input

### Flex-based layout
Keys use `flex: 1` to fill the full screen width. Special keys use proportional flex values (Shift/Backspace: 1.5, Space: 5, Enter: 1.8). Three configurable sizes via Settings > Appearance > Keyboard Size:

| Size | Key Height | Font Size |
|------|-----------|-----------|
| Compact | 36px | 13px |
| Medium | 42px | 15px |
| Large | 50px | 17px |

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

## Settings Page — Detailed

**File:** `src/app/mobile/settings/page.tsx` (886 lines)

Comprehensive settings with 7 collapsible Win95-styled sections. All changes auto-save (no Save button). Settings persist to localStorage instantly and sync to Supabase `user_settings.preferences` JSONB after 1.5s debounce.

### Sections

| # | Section | Settings |
|---|---------|----------|
| 1 | Profile | Display name, notifications toggle |
| 2 | Appearance | Default tab (5 options), accent color (5 presets + custom), font size (S/M/L), keyboard size (compact/medium/large) |
| 3 | Coach | Tone (direct/encouraging/balanced), digest toggle + frequency, show streaks, custom context (free-text) |
| 4 | Habits | Manage habits (inline editing) |
| 5 | Goals | Manage goals (inline editing) |
| 6 | Data Management | Export JSON, import JSON, clear all data (Win95 confirmation dialog) |
| 7 | About | Version info + links |

### Custom Components
- `CollapsibleHeader` / `SectionContent` — expandable Win95 sections with +/- toggle
- `ColorSwatch` — circular accent color picker with checkmark on active
- `ToggleSwitch` — Win95-styled on/off toggle
- `DangerButton` — red button for destructive actions
- `SettingRow` / `SettingLabel` — form layout

---

## CSS Variables System

The app uses CSS custom properties for runtime theming, set by `settingsStore` on `document.documentElement`:

### Accent Color
```css
--accent-color: #008080;   /* Default teal — configurable in Settings > Appearance */
```
Used by: `MobileContainer` background, `mobile/layout.tsx` body background

### Font Sizes
Set via `data-font-size` attribute on `<html>`:

| Size | --font-base | --font-list | --font-label | --font-meta |
|------|------------|------------|-------------|------------|
| small | 13px | 12px | 11px | 10px |
| medium | 15px | 13px | 12px | 11px |
| large | 17px | 15px | 14px | 12px |

Used by: `ListItemText`, `ListItemMeta`, `FormLabel`, `EmptyStateText`, `TabLabel` in MobileShared.tsx

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
