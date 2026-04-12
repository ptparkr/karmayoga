# Changelog

## v1.0.0 - 2025-04-13

### Added
- **Habits & Areas**: Create and manage habits organized by customizable color-coded areas
- **Daily Check-ins**: Toggle habit completion for each day
- **Contribution Heatmap**: GitHub-style visualization of check-in activity
- **Dashboard**: Overview with streak stats, consistency percentage, and weekly progress grid
- **Pie Chart Analytics**: View check-ins by area, overall consistency, or per-habit breakdown
- **Pomodoro Timer**: Focus sessions with 25/50/90 minute presets, break cycles, and session logging
- **Dark Theme UI**: Modern dark interface with glow effects for active streaks
- **SQLite Backend**: Local data persistence with Express API

### Infrastructure
- Express server with SQLite database (karma-yoga.db)
- React + TypeScript + Vite frontend
- Separate client (port 5173) and server (port 3001) dev scripts