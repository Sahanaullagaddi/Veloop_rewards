# VELoop — Tap & Earn Fintech Module

VELoop is a production-grade, server-authoritative "Tap & Earn" module built on the MERN full-stack. It integrates real-time Socket.io synchronization, dynamic timestamp-based rate limiters, atomic currency updates using version locks, and a comprehensive admin management panel.

---

## System Architecture Flow

The flowchart below demonstrates the server-authoritative loop when a user submits a tap event:

```
[React TapCircle] (Client-side 200ms interval lock)
        │
        ▼ (Optimistic UI: deducts 1 energy + increments streak/combo locally)
[POST /api/tap] (Payload: requestId, clientTimestamp)
        │
        ▼
[Auth Middleware] (Validates JWT, attaches req.user)
        │
        ▼
[Idempotency Filter] (Checks RewardLedger for matching requestId)
        │ ├──► [YES] Returns cached tap event result (Idempotent replay)
        │
        ▼ [NO]
[Rate Limit check] (Checks now - lastTapTime >= 200ms)
        │ ├──► [FAIL] Returns 429 "Too Fast" (Rolls back client state)
        │
        ▼ [PASS]
[Dynamic Energy Regen] (Computes +20 energy per 20min step since lastRegenTime)
        │
        ▼
[Energy Check] (Verify currentEnergy + energyBankBalance >= energyNeeded)
        │ ├──► [FAIL] Returns 400 "Energy Empty" (Rolls back client state)
        │
        ▼ [PASS]
[Version Lock update] (Atomic update on TapState matching lastTapTime)
        │
        ▼
[Authoritative Roll] (Central Config probability roll for reward type & amount)
        │
        ▼
[Atomic Balance credit] (Adjusts User balance + level XP atomically)
        │
        ▼
[Log & Sync] (Writes TapEvent + RewardLedger, Emits stateUpdate via Socket.io)
        │
        ▼
[API Response] (200 OK with reward details and reconciled state)
```

---

## Directory Structure

```
veloop/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, Socket, and Env configs
│   │   ├── middleware/      # Auth & Rate Limiter validation
│   │   ├── models/          # Mongoose Schemas (User, TapState, TapSeason, Config, Audit, etc.)
│   │   ├── routes/          # Express API Routes (auth, tap, admin)
│   │   ├── services/        # Authoritative Tap Loop & Seasons Services
│   │   ├── app.js           # Express app definition
│   │   └── server.js        # Server bootstrapper + Seeding fallbacks
│   ├── tests/               # Jest & Supertest integration suite
│   ├── scripts/             # Database seed script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (TapCircle, TapHeader, etc.)
│   │   ├── pages/           # Views (Dashboard, Wallet, Season, Admin, etc.)
│   │   ├── context/         # Auth, Socket, Theme, Onboarding, and Ad Contexts
│   │   ├── styles/          # Styling Modules
│   │   ├── App.jsx          # Route mapping and overlays (Tutorial & Ads)
│   │   └── main.jsx         # Client bootstrapper
│   └── package.json
└── README.md                # Master Documentation
```

---

## API Documentation

### Authentication (`/api/auth/*`)
* `POST /api/auth/register` - Create user. Body: `{ username, password }`
* `POST /api/auth/login` - Authenticate user. Body: `{ username, password }`
* `GET /api/auth/me` - Get current session profile. Header: `Authorization: Bearer <TOKEN>`

### Core Tap Mechanics (`/api/tap/*`)
* `POST /api/tap` - Process physical tap event. Body: `{ requestId, timestamp }`
* `GET /api/tap/history` - Fetch paginated Reward Ledger transaction history.
* `POST /api/tap/boost/activate` - Trigger active 30s Boost (2x effective tap multiplier).
* `POST /api/tap/upgrade` - Purchase capacity/speed upgrades. Body: `{ upgradeType }`
* `POST /api/tap/energy-bank/purchase` - Upgrade Energy Bank capacity (VE-priced).
* `POST /api/tap/shield/purchase` - Purchase/activate 30s Energy Shield (100 VE).
* `GET /api/tap/missions` - List achievements and user progress.
* `POST /api/tap/missions/:id/claim` - Claim reward for a completed mission.
* `GET /api/tap/daily-challenge` - Fetch daily 1k taps target status.
* `POST /api/tap/daily-challenge/claim` - Claim daily challenge 50t reward.
* `GET /api/tap/lucky` - Fetch Lucky Spin eligibility parameters.
* `POST /api/tap/lucky/spin` - Spin the Lucky wheel. Body: `{ requestId }`
* `GET /api/tap/league` - Get top 100 rankings and My Rank sticky statistics.
* `GET /api/tap/season` - Fetch active season timer and past season archives.
* `GET /api/tap/notifications` - Fetch in-app notifications feeds.
* `POST /api/tap/notifications/read` - Mark all notifications as read.
* `GET /api/tap/streak` - Get current and best tap streaks.
* `POST /api/tap/ads/log` - Log and reward completed ad views. Body: `{ requestId, adType }`
* `POST /api/tap/fragments/convert` - Convert VE Fragments to VE. Body: `{ amount }`

### Admin Control Center (`/api/admin/tap-economy/*`)
* `GET /api/admin/tap-economy/config` - Get economy parameters.
* `POST /api/admin/tap-economy/config` - Adjust parameters. Body: `{ key, value, reason }`
* `GET /api/admin/tap-economy/config/audit` - Get audit log of key changes.
* `GET /api/admin/tap-economy/analytics` - View general telemetry (Total taps, reward distributions).
* `POST /api/admin/tap-economy/season/rollover` - Manual season rollover. Body: `{ reason }`
* `GET /api/admin/tap-economy/users/:id/preview` - Impersonation preview of player stats.

---

## Setup & Running Guide

### 1. Prerequisites
- **Node.js**: v18+
- **MongoDB**: A running local MongoDB instance on port `27017` is expected for seeding, though the server and test suite will dynamically fallback to `MongoMemoryServer` if no local instance is found!

### 2. Backend Initialization
```bash
# Navigate to backend folder
cd backend

# Install dependencies (automatically installs mongodb-memory-server)
npm install

# Seed the database with mock seasons, achievements, and player profiles
npm run seed

# Run local development server
npm run dev
```
*The backend server will run at `http://localhost:5000`.*

### 3. Frontend Initialization
```bash
# Navigate to frontend folder
cd ../frontend

# Install dependencies
npm install

# Start Vite developer server
npm run dev
```
*The React client will run at `http://localhost:5173` (or the next available port).*

### 4. Running the Test Suite
We have constructed integration tests mapping rate-limiting, request idempotency, currency conversions, upgrades, and energy shields.
```bash
# Run tests inside the backend directory
cd ../backend
npm run test
```
