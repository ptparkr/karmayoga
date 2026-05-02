# Karma Yoga

Personal habit tracker, dashboard, and pomodoro timer.

## Features

- **Habit Tracking** - Track daily habits across customizable areas of life with visual heatmaps and streak tracking
- **Wheel of Life** - Interactive 10-wedge radial chart for holistic life balance tracking with 10-segment precision
- **Dashboard Analytics** - Multi-column overview with streak stats, consistency metrics, and dedicated focus intensity cards
- **Pomodoro Timer** - Focus timer with configurable presets (25/50/90 min) and session logging
- **Dark Theme** - Premium glassmorphism UI with modern glow effects and responsive layouts

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

- **Frontend**: React + TypeScript + Vite (UI unchanged)
- **Backend API**: Express + SQLite
- **Core Analytics Engine**: Rust CLI (`rust-core`) executed by `/api/utils/rust-analytics`
- **Styling**: CSS with custom properties

## Rust Core Analytics

The client dashboard/analytics hook now prefers Rust-computed outputs and falls back to existing TypeScript analytics if Rust is unavailable.

Build commands:

```bash
# Build Rust + server + client
npm run build:all
```

## Vercel Hosting

`vercel.json` is configured to:

- build client + server + rust core
- serve the static client from `client/dist`
- route `/api/*` requests to the Node function in `api/[...all].ts`
    