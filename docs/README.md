# Karma Yoga

Premium local-first personal operating system for habits, focus, health, and life balance.

## Features

- **Habit Tracking** - Track daily habits across customizable areas of life with visual heatmaps and streak tracking
- **Wheel of Life** - Interactive 10-wedge radial chart for holistic life balance tracking with 10-segment precision
- **Dashboard Analytics** - Multi-column overview with streak stats, consistency metrics, and dedicated focus intensity cards
- **Pomodoro Timer** - Focus timer with configurable presets (25/50/90 min) and session logging
- **Guest-First Auth** - Users enter with only a username; a durable guest identity is stored in IndexedDB and restored automatically.
- **Local-First Foundation** - Device-local identity and app records live in IndexedDB, with a sync-ready API boundary for future cloud upgrades.
- **Isolated Data Namespaces** - API reads and writes are scoped by `X-Karma-Guest-ID`, keeping guest data separated inside the backend store.
- **Dark Product Shell** - Premium responsive UI with polished entry, navigation, loading, and hover states.

## Quick Start

```bash
# Install dependencies
npm run install:all

# Run both server and client
npm run dev
```

- Client: http://localhost:5173
- Server API: http://localhost:3001

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Local-first storage**: IndexedDB identity/record layer with typed repository helpers
- **Backend API**: Express + SQLite-compatible `sql.js`
- **Core Analytics Engine**: Rust CLI (`rust-core`) executed by `/api/utils/rust-analytics`
- **Styling**: CSS with custom properties

## Architecture Notes

- Guest identity is created in `client/src/lib/localDb.ts` and exposed through `client/src/lib/auth.tsx`.
- API requests automatically include the active guest namespace via `X-Karma-Guest-ID`.
- Server tables include `owner_id` scoping so habits, check-ins, focus sessions, area colors, health data, and wheel snapshots are isolated per guest.
- The IndexedDB layer is intentionally small and sync-ready: remote sync can later subscribe to typed local records without rewriting the app shell.
- Rust remains a modular analytics core under `rust-core/`, preserving a clean boundary between product UI, API transport, and compute-heavy analysis.

## Rust Core Analytics

The client dashboard/analytics hook now prefers Rust-computed outputs and falls back to existing TypeScript analytics if Rust is unavailable.

Build commands:

```bash
# Build Rust + server + client
npm run build:all
```

## Vercel Hosting

`vercel.json` is configured to:

- install client/server dependencies
- build the static Vite client
- serve the static client from `client/dist`
- route `/api/*` requests to the Node function in `api/[...all].ts`

Recommended Vercel settings:

```bash
Build Command: npm run build:client
Output Directory: client/dist
Install Command: npm run install:all
```

Copy `.env.example` to  `.env` for local development. On Vercel, only set variables that differ from the defaults.
