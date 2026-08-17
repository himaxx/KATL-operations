# KATL Operations Autopilot

A operations management system built with Fastify, Vite (React), TypeScript, and SQLite.

## Features

- **Dashboard**: Live work checklist and FMS step management.
- **Mandate Holder view**: Full CRUD operations for team member management, bulk designation-based task assignments, compliance task pinning, and live ticking countdown timers.
- **FMS (Flow Management System)**: Step-by-step progress tracking for standard operating procedures (SOPs).
- **Gamified Scoreboards**: Monthly, weekly, and daily scoreboard tracking with real-time scoring events.
- **Daily Lock Rule**: Repetitive daily checklist tasks lock automatically at 8:00 PM (20:00 IST) and cannot be submitted afterwards.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide icons.
- **Backend**: Fastify API server, SQLite3 database (better-sqlite3), bcrypt password/PIN hashing.
- **Build system**: Vite, TypeScript compile verification.

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application (development server and API server concurrently):
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```
