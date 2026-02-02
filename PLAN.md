# Plan: Standalone Electron Desktop App

## Current Situation
- **Mobile**: Deployed on Vercel at `https://your-app.vercel.app/mobile` - works great
- **Desktop**: Has Electron configured but requires running dev server first - clunky

## Goal
Create a **one-click `.exe` installer** that:
1. Installs "Progress Tracker" as a native Windows app
2. Shows desktop dashboard (not mobile view)
3. Syncs with same Google Sheets as mobile (data shared!)
4. No terminal, no browser, just double-click and go

---

## Implementation Plan

### Phase 1: Fix & Clean Project
**Tasks:**
1. Delete corrupted `node_modules` folder
2. Run fresh `npm install`
3. Verify basic `npm run dev` works

### Phase 2: Update Electron for Production
**File: `main/background.ts`**
- Remove dev server dependency for production build
- Use `electron-serve` to load bundled Next.js app
- Remove dev tools in production
- Set proper window title and icon

**File: `next.config.js`**
- Add `output: 'export'` for static build
- Configure for Electron compatibility

### Phase 3: Add .env Support for Desktop
**Tasks:**
- Electron app needs Google Sheets credentials
- Create `main/env-loader.ts` to load `.env.local` in packaged app
- Or: embed credentials at build time

### Phase 4: Build Scripts
**File: `package.json`** - Add/update scripts:
```json
{
  "scripts": {
    "desktop:build": "npm run build:next && npm run build:electron && electron-builder",
    "desktop:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\""
  }
}
```

### Phase 5: Create Installer
**Run:** `npm run desktop:build`
**Output:** `dist/Progress Tracker-Setup-0.1.0.exe`

### Phase 6: Desktop Shortcut
After install, user gets:
- Start Menu shortcut
- Desktop shortcut
- Just double-click to launch!

---

## File Changes Summary

| File | Change |
|------|--------|
| `node_modules/` | Delete and reinstall |
| `next.config.js` | Add static export config |
| `main/background.ts` | Clean up for production |
| `package.json` | Add desktop build scripts |
| `.env.local` | Add Google Sheets credentials |

---

## Architecture After Changes

```
┌─────────────────────────────────────────┐
│           MOBILE (Phone)                │
│  Vercel: https://your-app.vercel.app    │
│         └── /mobile route               │
└───────────────┬─────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ Google Sheets │  ◄── Single source of truth
        │   Database    │
        └───────────────┘
                ▲
                │
┌───────────────┴─────────────────────────┐
│          DESKTOP (PC)                   │
│  Electron App: Progress Tracker.exe     │
│         └── Main dashboard view         │
└─────────────────────────────────────────┘
```

Both apps read/write to same Google Sheets = **automatic sync!**

---

## User Experience After Implementation

1. **Install once**: Run `Progress Tracker-Setup.exe`
2. **Daily use**: Double-click desktop icon
3. **App opens**: Native window with full dashboard
4. **Data syncs**: Changes appear on phone instantly

---

## Questions Before Proceeding

1. **Credentials**: Do you have the Google Sheets credentials JSON file? We'll need to embed it.
2. **Icon**: Want a custom app icon, or use default?
3. **Auto-update**: Want the app to auto-update, or manual reinstall for updates?
