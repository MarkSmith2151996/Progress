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

## Smart Goal Tracking

When you add a goal like "Take 2 SAT tests":
1. **Keywords are auto-generated** from the title: `['take', 'sat', 'tests']`
2. **When you log an accomplishment** like "took one SAT test"
3. **System matches keywords** and extracts the count
4. **Goal auto-updates**: 0/2 → 1/2

### Increment Types
- `count` - Extracts numbers: "one", "two", "3" → 1, 2, 3
- `value` - Extracts money: "$50", "100 dollars" → 50, 100
- `time` - Extracts duration: "2 hours", "30 minutes" → 2, 0.5

---

## Database (Supabase)

**Project:** progress-tracker
**URL:** https://nmagobufnzbxcvbbntvn.supabase.co
**Dashboard:** https://supabase.com/dashboard/project/nmagobufnzbxcvbbntvn

### Tables
- `goals` - Goal tracking with keywords for smart matching
- `daily_logs` - Daily accomplishments and notes
- `habits` - Habit definitions
- `habit_completions` - Daily habit check-offs
- `tasks` - Task planning

---

## Environment Variables

Located in `.env.local` (gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://nmagobufnzbxcvbbntvn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...  (for CLI only)
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

# Deploy to Vercel
npx vercel --prod
```

---

## File Structure

```
src/
├── app/mobile/page.tsx    # Mobile UI
├── stores/
│   ├── goalStore.ts       # Goal state + Supabase sync
│   └── logStore.ts        # Logs/habits + goal auto-update
├── lib/
│   ├── supabase.ts        # Supabase client + CRUD
│   ├── goalUpdater.ts     # Smart goal matching logic
│   └── browserStorage.ts  # Offline fallback
└── types/index.ts         # TypeScript types

main/
├── background.ts          # Electron main process
└── env-loader.ts          # Load .env.local for Electron
```

---

## Tabs in Mobile App

1. **Wins** - Log accomplishments (auto-updates matching goals)
2. **Habits** - Daily habit tracking
3. **Monthly** - Monthly goal management
4. **Goals** - All active goals overview
