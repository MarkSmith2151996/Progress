# Progress Tracker - Setup & Architecture

## Quick Start

### Mobile (Phone)
Open: https://progress-umber-six.vercel.app/mobile

### Desktop (Windows)
Run: `C:\Users\Big A\Progress-temp\dist\win-unpacked\Progress Tracker.exe`
Or install: `C:\Users\Big A\Progress-temp\dist\Progress Tracker-Setup-0.1.0.exe`

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │   Desktop App   │
│   (Vercel)      │     │   (Electron)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │  Supabase   │
              │  (Postgres) │
              │  Real-time  │
              └─────────────┘
```

Both apps connect to the same Supabase database for real-time sync.

---

## Tech Stack

- **Frontend**: Next.js 14, React 18, styled-components, react95 (Win95 theme)
- **State**: Zustand (goalStore, logStore, coachStore, settingsStore, analyticsStore)
- **Database**: Supabase (Postgres + real-time subscriptions)
- **Desktop**: Electron 40 + electron-builder
- **AI**: Claude API (@anthropic-ai/sdk) for coach + smart goal matching
- **Offline**: localStorage fallback (browserStorage.ts)
- **Deploy**: Vercel (mobile), Electron .exe (desktop)

---

## Smart Goal Tracking

When you add a goal like "Take 2 SAT tests":
1. **Keywords are auto-generated** from the title: `['take', 'sat', 'tests']`
2. **When you log an accomplishment** like "took one SAT test"
3. **Claude matches semantically** (or falls back to keyword matching)
4. **Goal auto-updates**: 0/2 -> 1/2

### Increment Types
- `count` - Extracts numbers: "one", "two", "3" -> 1, 2, 3
- `value` - Extracts money: "$50", "100 dollars" -> 50, 100
- `time` - Extracts duration: "2 hours", "30 minutes" -> 2, 0.5

---

## Database (Supabase)

**Project:** progress-tracker
**URL:** https://nmagobufnzbxcvbbntvn.supabase.co
**Dashboard:** https://supabase.com/dashboard/project/nmagobufnzbxcvbbntvn

### Tables
- `goals` - Goal tracking with keywords, increment_type, status, progress
- `daily_logs` - Daily accomplishments, energy, sleep, work hours, rating, notes
- `habits` - Habit definitions with days_active, target_minutes
- `habit_completions` - Daily habit check-offs (habit_id + date)
- `tasks` - Day-specific to-do items with planned_date, status, goal_id link
- `user_settings` - Coach context, theme preferences

### Real-time
All tables have real-time subscriptions enabled. Changes on mobile appear on desktop instantly and vice versa.

---

## Environment Variables

Located in `.env.local` (gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://nmagobufnzbxcvbbntvn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...  (for CLI only)
ACCESS_PIN=...  (PIN protection for Vercel)
ANTHROPIC_API_KEY=...  (for Claude coach)
GOOGLE_SPREADSHEET_ID=...
GOOGLE_CREDENTIALS=...
```

---

## Development

```bash
# Run Next.js dev server
npm run dev

# Run Electron in dev mode
npm run electron:dev

# Build desktop app
npm run desktop:build

# Deploy to Vercel (auto on git push to main)
git push origin main
```

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Desktop entry (renders Dashboard)
│   ├── layout.tsx                  # Root layout (React95Provider)
│   ├── login/page.tsx              # PIN login page
│   ├── mobile/
│   │   ├── page.tsx                # Mobile main (Wins, To Do, Monthly, Goals tabs)
│   │   ├── layout.tsx              # Mobile layout (PWA meta, teal bg)
│   │   ├── coach/page.tsx          # Coach redirect (desktop only)
│   │   ├── calendar/page.tsx       # Calendar view with day popups
│   │   └── settings/page.tsx       # Habits/goals mgmt, export/import, about
│   └── api/
│       ├── auth/verify-pin/route.ts
│       ├── goals/route.ts
│       ├── habits/route.ts
│       ├── daily-logs/route.ts
│       ├── tasks/route.ts
│       ├── habit-completions/route.ts
│       ├── settings/route.ts
│       ├── coach/chat/route.ts     # Claude chat endpoint
│       ├── coach/parse/route.ts    # Claude goal-matching parse
│       ├── coach/summary/route.ts  # Claude daily summary
│       ├── analytics/route.ts
│       ├── field-proposals/route.ts
│       ├── import/route.ts
│       └── summaries/weekly|monthly/route.ts
├── components/
│   ├── Dashboard.tsx               # Desktop: calendar + coach + taskbar
│   ├── AccomplishmentsPanel95.tsx   # Accomplishments panel
│   ├── QuickLog95.tsx              # Quick daily log entry
│   ├── coach/CoachPanel95.tsx      # Outlook Express-style AI coach chat
│   ├── calendar/MonthCalendar95.tsx # Desktop calendar grid
│   ├── popups/DayPopup95.tsx       # Day detail popup
│   ├── popups/WeeklyGoalsPopup95.tsx
│   ├── popups/MonthlyGoalsPopup95.tsx
│   ├── settings/SettingsPanel95.tsx
│   ├── settings/RemindersPanel95.tsx
│   ├── debug/DebugPanel95.tsx
│   ├── mobile/MobileShared.tsx     # All shared mobile styled components
│   ├── mobile/Win95Icons.tsx       # CSS pixel art icons
│   ├── providers/React95Provider.tsx
│   └── shared/                     # Alert, Button, LoadingSlider, etc.
├── stores/
│   ├── goalStore.ts                # Goals CRUD + real-time + Supabase sync
│   ├── logStore.ts                 # Logs, habits, tasks, completions + sync
│   ├── coachStore.ts               # Coach chat + summary (Electron IPC or API)
│   ├── settingsStore.ts            # Theme, coach_context, persisted
│   └── analyticsStore.ts           # Analytics/patterns
├── lib/
│   ├── supabase.ts                 # Supabase client + all CRUD + real-time subs
│   ├── browserStorage.ts           # localStorage fallback CRUD
│   ├── goalUpdater.ts              # Smart goal matching (Claude + keyword fallback)
│   ├── claude.ts                   # Claude API client
│   ├── contextBuilder.ts           # Build context for coach
│   ├── metrics.ts                  # Streaks, scores, patterns, milestones
│   ├── analytics.ts                # Analytics calculations
│   ├── coachSync.ts                # Coach data sync
│   ├── summaryGenerator.ts         # Weekly/monthly AI summaries
│   ├── fieldProposals.ts           # AI field proposal system
│   ├── storage.ts                  # Generic storage utils
│   ├── localStorage.ts             # Low-level localStorage
│   ├── sheets.ts                   # Google Sheets integration
│   ├── debug.ts                    # Debug logging
│   ├── safeAsync.ts                # Safe async helpers
│   └── registry.tsx                # styled-components SSR registry
├── hooks/
│   ├── useElectron.ts              # Electron detection
│   ├── useMediaQuery.ts            # Responsive breakpoints
│   └── useTheme.ts                 # Theme hook
├── types/index.ts                  # All TypeScript types
└── middleware.ts                   # PIN auth + Vercel route redirects

main/
├── background.ts                   # Electron main process
├── env-loader.ts                   # Load .env.local for Electron
└── preload.ts                      # Electron preload (IPC bridge)
```

---

## Mobile App Tabs (current state)

1. **Wins** - Log accomplishments (auto-updates matching goals via Claude)
2. **To Do** - Sub-tabs:
   - **Habits**: Recurring daily habits with checkboxes, streaks
   - **Tasks**: Day-specific to-do items with date navigation, goal linking
3. **Monthly** - Monthly goal management with progress bars
4. **Goals** - All active goals overview with progress

### To Do Tab Details
- Sub-tab toggle (Habits | Tasks) using ToggleGroup
- Tasks view has date navigation (prev/today/next)
- "+" button opens popup with Habit/Task type selector
- Tasks can be linked to goals, have time estimates
- Task statuses: planned, completed, skipped, rolled

---

## Desktop App Features

- **Calendar** (left): Month view with day/week click popups
- **Coach** (right): Outlook Express-style AI chat panel
  - Stats bar: weekly score, streak, habits completed, alerts
  - Message list with preview pane
  - Compose area (Enter to send)
  - Context editor: age, schedule, constraints, preferences, corrections
- **Taskbar** (bottom): Start, Quick Log, Wins, Reminders, Debug, clock

---

## Data Flow Pattern

Every write: **Optimistic local update -> browserStorage cache -> Supabase sync**
Every read: **Try Supabase -> Fall back to browserStorage**
Real-time: **Supabase subscriptions keep mobile + desktop in sync**

---

## Vercel Config

- **Region**: iad1 (US East)
- **API timeout**: 30s max
- **API cache**: no-store
- **Middleware**: PIN auth, root -> /mobile redirect, desktop routes blocked
- **TypeScript/ESLint errors**: skipped on Vercel builds for speed

---

## Git & Deploy

- **Repo**: https://github.com/MarkSmith2151996/Progress.git
- **Branch**: main
- **Auto-deploy**: Push to main triggers Vercel build
- **Vercel project**: progress (prj_pD0DrAi06HXGnkACx0DTswBXGwZP)
