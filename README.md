# Peerless Connect — System Overview

This document describes how the **Peerless Connect** IoT fire pump monitoring platform works as implemented in this workspace. It covers the full path from the edge device through cloud storage to the React frontend, including all five AWS Lambda functions and how they are wired together.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Edge Hardware & Data Ingestion](#edge-hardware--data-ingestion)
3. [Cloud Database (TimescaleDB on AWS)](#cloud-database-timescaledb-on-aws)
4. [AWS Lambda Functions](#aws-lambda-functions)
5. [API Gateway & Frontend Configuration](#api-gateway--frontend-configuration)
6. [Frontend Application](#frontend-application)
7. [Theming (Light / Dark Mode)](#theming-light--dark-mode)
8. [Authentication & User Lifecycle](#authentication--user-lifecycle)
9. [Device Navigation (Folder Tree)](#device-navigation-folder-tree)
10. [Live Device Data Pipeline](#live-device-data-pipeline)
11. [Controller Profiles & Register Decoding](#controller-profiles--register-decoding)
12. [Dashboard UI](#dashboard-ui)
13. [Offline Detection](#offline-detection)
14. [Project Structure](#project-structure)
15. [Running Locally](#running-locally)
16. [Known Dependencies Outside This Repo](#known-dependencies-outside-this-repo)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FIELD                                                                       │
│  Fire Pump Controller (MK3 Diesel or MK3 Electric)                            │
│  Jockey Pump Controller (FCJC or FTJP)                                      │
│         │ Modbus TCP (Ethernet)          │ Modbus RTU (RS-485 terminals)    │
│         └──────────────┬─────────────────┘                                  │
│                        ▼                                                     │
│              STM32 Edge PCB + Quectel Cellular (UART)                        │
│                        │ MQTT publish                                        │
└────────────────────────┼────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  AWS CLOUD                                                                   │
│  MQTT Broker → Ingestion → TimescaleDB (PostgreSQL)                        │
│                                                                              │
│  API Gateway (Production stage)                                              │
│    ├── POST /newlogin              → StandardUserLogin                       │
│    ├── POST /getStructV2           → GetUserStruct                           │
│    ├── POST /createstandard        → CreateStandardUser                      │
│    ├── POST /completeonboarding    → CompleteUserOnboarding                  │
│    └── GET  /latest?deviceid=N     → GetLatestFrame                          │
└────────────────────────┼────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  connect-standard-frontend (React + Vite)                                    │
│  Login → Onboarding → Folder sidebar → Device dashboard (7s polling)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

The platform monitors **two pumps per site**: a **main fire pump** (diesel MK3D or electric MK3E) and a **jockey pump** (FCJC or FTJP). Each physical edge device has a `deviceid` in the database. The edge reads Modbus registers from both controllers and publishes them to the cloud. The frontend polls the latest register snapshot every **7 seconds** and decodes it into a human-readable dashboard.

---

## Edge Hardware & Data Ingestion

Although the edge firmware is not in this repository, the system is designed around this hardware stack:

| Component | Role |
|-----------|------|
| **STM32 microcontroller** | Runs on the edge PCB; orchestrates Modbus reads and MQTT publishing |
| **Ethernet** | Modbus **TCP** connection to the main fire pump controller |
| **Two RS-485 terminals** | Modbus **RTU** — typically used for the jockey pump controller |
| **Quectel cellular module (UART)** | Sends collected register data to the cloud over **MQTT** |

The edge device periodically reads configured Modbus registers from each controller and publishes frames to MQTT. Downstream ingestion (not in this repo) parses those messages and writes rows into TimescaleDB hypertables. Register numbers are stored as **column names** (e.g. `"2006"`, `"1800"`) with numeric values and a `timestamp` per row.

---

## Cloud Database (TimescaleDB on AWS)

The Lambdas connect to a PostgreSQL/TimescaleDB instance on AWS. The schema is organized into logical areas:

### `devicestorage` — devices and navigation

| Table | Purpose |
|-------|---------|
| `devicestorage.devices` | Maps `deviceid` → `mainid` and `jockeyid` (controller type IDs for main and jockey) |
| `devicestorage.folders` | Nested-set model (`lft`/`rgt`) for folder hierarchy; `deviceid` NULL = folder, non-NULL = device leaf |

### `datastorage` — time-series register data

Each controller type has one or two physical tables. Rows contain `deviceid`, `timestamp`, and dynamic register columns.

| Controller ID | Name | Trending table | Historical table |
|---------------|------|----------------|------------------|
| 1 | `mk3diesel` | `mk3dieseltrends` | `mk3dieselhistorical` |
| 2 | `fcjc` | `fcjc` | `fcjc` (same table) |
| 3 | `mk3electric` | `mk3electrictrends` | `mk3electrichistorical` |
| 4 | `ftjp` | `ftjp` | `ftjp` (same table) |

**Trending** registers update frequently (near real-time). **Historical** registers update on a slower cadence (roughly ~10 minutes in practice). The frontend uses trending data for offline detection and live analogs; historical data powers slower-changing metrics and event timestamps.

### `referencedata` — register configuration

| Table | Purpose |
|-------|---------|
| `referencedata.controllerregisters` | Per `controllerid`, comma-separated lists of register numbers for `trending` and `historical` columns |

This table drives what `GetLatestFrame` queries — the Lambda does not hard-code register lists.

### `users` — authentication and access control

| Table | Purpose |
|-------|---------|
| `users.userlogin` | `username` (email) + bcrypt password hash |
| `users.userinfo` | Profile: first name, last name, phone, dates (created after onboarding) |
| `users.userviewpage` | Maps `username` → `viewid` (folder root IDs the user can see) |

---

## AWS Lambda Functions

All Lambda source files live in `Lambdas/`.

### 1. `GetLatestFrame.py` — Latest device register snapshot

**API:** `GET /latest?deviceid={id}`  
**Purpose:** Returns the most recent trending and historical register values for both the main and jockey controllers on a device.

**Flow:**

1. Parse `deviceid` from query string, body, or direct invoke payload.
2. Look up `mainid` and `jockeyid` from `devicestorage.devices`.
3. For each controller:
   - Load trending/historical register lists from `referencedata.controllerregisters`.
   - Resolve physical table names from `CONTROLLER_STORAGE_TABLES`.
   - Query the latest row (`ORDER BY timestamp DESC LIMIT 1`) for that `deviceid`.
   - When trending and historical share one table (FCJC, FTJP), query once and split registers.
   - When they use separate tables (MK3 diesel/electric), query each table; also handles registers that exist on the "wrong" table per config.
4. Return a **v2 JSON envelope**:

```json
{
  "status": "success",
  "fetchedAt": "2026-06-23T12:00:00+00:00",
  "deviceId": 123,
  "configuration": {
    "mainControllerId": 1,
    "jockeyControllerId": 2
  },
  "controllers": {
    "main": {
      "role": "main",
      "controllerId": 1,
      "controllerType": "mk3diesel",
      "configured": true,
      "trending": { "timestamp": "...", "registers": { "2006": 85.2 }, "rowFound": true },
      "historical": { "timestamp": "...", "registers": { "2000": 12.4 }, "rowFound": true }
    },
    "jockey": { "...": "..." }
  }
}
```

**Environment variables:** `DBHOST`, `DBNAME`, `DBUSER`, `DBPASS`

**Notable behavior:**
- Per-invocation cache for register config and table column metadata (cleared each call).
- Gracefully handles missing register columns.
- CORS enabled for browser `GET` requests.
- 5-second statement timeout on DB queries.

---

### 2. `StandardUserLogin.py` — User authentication

**API:** `POST /newlogin`  
**Body:** `{ "username": "user@example.com", "password": "..." }`

**Flow:**

1. Look up `users.userlogin` by username.
2. In the same query, check whether a row exists in `users.userinfo` (`has_profile`).
3. Verify password with **bcrypt**.
4. Return:
   - `authenticated: true`
   - `email` (username)
   - `needsOnboarding: true` if no `userinfo` row exists yet

**Environment variables:** `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, optional `DB_SSLMODE`, `USERLOGIN_TABLE`, `USERINFO_TABLE`, `CORS_ALLOW_ORIGIN`

**Performance:** Reuses a warm DB connection across Lambda invocations; optional init-time connection warming via `WARM_DB_ON_INIT=true`.

---

### 3. `GetUserStruct.py` — Folder tree for sidebar navigation

**API:** `POST /getStructV2`  
**Body:** `{ "username": "user@example.com" }`

**Flow:**

1. Read `viewid` values from `users.userviewpage` for the user.
2. Parse view IDs (supports comma-separated values like `"8,13"`).
3. Run a nested-set SQL query against `devicestorage.folders` to fetch all nodes under those roots.
4. Build a nested JSON tree for the frontend sidebar.

**Tree node shape:**

```json
{
  "name": "Building A",
  "type": "folder",
  "depth": 0,
  "children": [
    {
      "name": "Pump Room 1",
      "type": "device",
      "depth": 1,
      "deviceId": 123
    }
  ]
}
```

- `type: "folder"` when `deviceid` is NULL in the database.
- `type: "device"` when `deviceid` is set — clicking opens the pump dashboard.

---

### 4. `CreateStandardUser.py` — Admin user provisioning

**API:** `POST /createstandard`  
**Body:** `{ "email": "new@example.com", "folderNames": ["Region East", "Site 42"] }`

**Flow:**

1. Resolve folder names to folder IDs in `devicestorage.folders` (folders only — `deviceid IS NULL`).
2. Generate a random 14-character temporary password.
3. Hash with bcrypt and insert into `users.userlogin`.
4. Insert one `users.userviewpage` row per selected folder.
5. Send welcome email via `ses_mailer.send_welcome_email()` (AWS SES).
6. If email fails, the DB transaction rolls back.

**Used by:** The frontend **Admin** panel (creator must sign in first, then selects folders from their own tree to grant access).

---

### 5. `CompleteUserOnboarding.py` — First-time profile setup

**API:** `POST /completeonboarding`  
**Body:** `{ "email", "firstName", "lastName", "phone", "password" }`

**Flow:**

1. Verify login record exists in `users.userlogin`.
2. Reject if `users.userinfo` already exists.
3. Replace temporary password with the user's chosen password (bcrypt hash).
4. Insert profile into `users.userinfo`.

After success, the frontend sets `needsOnboarding = false` and loads the folder tree.

---

## API Gateway & Frontend Configuration

The React app reads API endpoints from `connect-standard-frontend/.env`:

| Variable | Lambda / Route |
|----------|----------------|
| `VITE_LOGIN_API_URL` | `StandardUserLogin` → `/newlogin` |
| `VITE_VIEW_API_URL` | `GetUserStruct` → `/getStructV2` |
| `VITE_CREATE_USER_API_URL` | `CreateStandardUser` → `/createstandard` |
| `VITE_ONBOARDING_API_URL` | `CompleteUserOnboarding` → `/completeonboarding` |
| `VITE_PACKET_API_URL` | `GetLatestFrame` → `/latest?deviceid=...` |

All auth/admin calls use `POST` with JSON bodies via `src/api/client.ts`. The packet API uses `GET` with `deviceid` as a query parameter. The frontend replaces or appends `deviceid` dynamically when a user selects a device (`buildPacketApiUrl` in `src/config/devices.ts`).

**Refresh interval:** `PACKET_REFRESH_MS = 7000` (7 seconds) in `src/config.ts`.

---

## Frontend Application

**Stack:** React 18, TypeScript, Vite  
**Package name:** `peerless-connect-standard`  
**Entry:** `src/main.tsx` → `ThemeProvider` + `GlobalTopBar` + `src/App.tsx`

### Application states

`App.tsx` drives a simple state machine:

```
Not logged in        → LoginForm
Logged in, needs onboarding → OnboardingPage
Logged in, onboarded → Main shell (sidebar + device panel + admin overlay)
```

### Main shell layout

| Area | Component | Function |
|------|-----------|----------|
| Global top bar | `AppTopBar` | Shown only after login — logo, signed-in user, theme toggle, Admin, Sign out |
| Left sidebar | `SidebarTree` | Nested folder/device tree from `GetUserStruct` |
| Main content | `DeviceView` | Fire pump dashboard for selected device |
| Admin overlay | `CreatorLoginPage` → `CreateUserPage` | Provision new users |

### API client (`src/api/client.ts`)

Thin wrapper around `fetch`:
- `login()` — authenticate
- `fetchUserView()` — load folder tree
- `createStandardUser()` — admin provisioning
- `completeOnboarding()` — first-time profile

Handles API Gateway responses that may wrap JSON in a `body` string field.

---

## Theming (Light / Dark Mode)

The UI uses approved Peerless brand colors with a user-selectable **light** or **dark** theme. Before sign-in, the app follows the **OS system theme** only (no top bar, no toggle). After login, a single **AppTopBar** provides the theme toggle plus Admin and Sign out; the user’s theme choice is saved to `localStorage`.

**Brand logos** (`src/logos/RedLogoNB.png` for light mode, `src/logos/WhiteLogoNB.png` for dark mode) appear large on the login/onboarding cards and in the top bar on the left (logo and “Signed in as …” side by side). `BrandLogo` switches automatically with the active theme.

### Brand palette

| Name | Hex | Typical use |
|------|-----|-------------|
| Storm | `#00313C` | Dark surfaces, sidebar depth |
| Peerless Blue | `#0166C0` | Primary actions, links, main pump accents |
| Fire | `#981116` | Errors, low-pressure alarm emphasis |
| Steam | `#EEEEEE` | Light mode background, dark mode text |
| Sun | `#CF7F00` | Manual switch state, offline warning |
| Spark | `#EF9300` | Accent gradient, focus highlights |
| Ink | `#0D2635` | Light mode text, dark mode background |

Status lamps on the device dashboard intentionally use standard **green** (`#2EA84A`) and **red** (`#D63B32`) for ok/alarm states so they remain instantly recognizable in either theme.

### Implementation

| File | Role |
|------|------|
| `src/theme/theme.css` | CSS custom properties for `[data-theme="light"]` and `[data-theme="dark"]` |
| `src/theme/ThemeContext.tsx` | React context; persists choice to `localStorage` key `peerless-connect-theme` |
| `src/components/AppTopBar.tsx` | Unified fixed top bar (theme toggle + auth actions) |
| `src/components/BrandLogo.tsx` | Theme-aware logo (`RedLogoNB` / `WhiteLogoNB`) |
| `src/components/ThemeToggle.tsx` | Segmented Light / Dark control |
| `src/logos/` | Brand logo assets (red = light, white = dark) |
| `src/index.css` | App shell, auth, sidebar — uses theme variables |
| `src/device-dashboard.css` | Pump dashboard panels — uses theme variables |
| `index.html` | Inline script applies saved theme before React loads (prevents flash) |

On first visit before login, the theme follows `prefers-color-scheme`. After login, the saved choice in `localStorage` (`peerless-connect-theme`) is used and the toggle is available.

---

## Authentication & User Lifecycle

```
┌──────────────┐     temp password      ┌─────────────────┐
│ Admin creates│ ────────────────────►  │ New user email  │
│ user (Admin  │     via SES            │ (CreateStandard │
│ panel)       │                        │ User Lambda)    │
└──────────────┘                        └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │ Login with temp │
                                        │ password        │
                                        └────────┬────────┘
                                                 │
                          needsOnboarding=true   ▼
                                        ┌─────────────────┐
                                        │ Onboarding form │
                                        │ (name, phone,   │
                                        │  new password)  │
                                        └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │ Main app: view  │
                                        │ folders, select │
                                        │ devices         │
                                        └─────────────────┘
```

**Admin flow:** Any signed-in user can open **Admin**. They re-authenticate (creator login), which loads *their* folder tree. They pick folders to grant the new user and submit an email. The new user only sees devices under those folder roots.

**Security note:** The current frontend does not persist sessions in localStorage or use JWT cookies — login state lives in React memory only. Refreshing the page returns to the login screen. API endpoints are called without Authorization headers; access control is enforced by knowing the username for view structure and by device visibility in the folder tree.

---

## Device Navigation (Folder Tree)

The folder hierarchy uses a **nested set model** (`lft`/`rgt` columns) in PostgreSQL — efficient for subtree queries.

`GetUserStruct` returns pre-order flattened rows with relative `depth`, and `build_tree()` in the Lambda reconstructs parent/child relationships for the frontend.

`SidebarTree` → `TreeNodeItem` renders expandable folders and clickable device leaves. Selecting a device sets `selectedDeviceId` and `selectedDeviceName` in `App.tsx`, which mounts `DeviceView`.

---

## Live Device Data Pipeline

```
GetLatestFrame (GET)
       │
       ▼
useDevicePacket hook  ── polls every 7s, aborts in-flight on device change
       │
       ▼
normalizePacket()     ── v2 API envelope → NormalizedDeviceData
       │
       ▼
decodeDevicePacket()  ── picks profile, decodes registers
       │
       ▼
FirePumpDashboard     ── renders Main Pump + Jockey Pump sections
```

### `useDevicePacket` (`src/hooks/useDevicePacket.ts`)

- If `VITE_PACKET_API_URL` is unset, uses **sample packets** from `src/data/samples.ts` (demo/offline mode).
- If set, builds per-device URL and polls with `cache: 'no-store'`.
- Shows live indicator and refresh state on the dashboard.

### `normalizePacket` (`src/lib/normalizePacket.ts`)

Supports two input formats:

| Format | Source | Structure |
|--------|--------|-----------|
| **v2** | `GetLatestFrame` Lambda | `controllers.main/jockey` with `trending` and `historical` blocks |
| **legacy** | Older/direct MQTT shape | Flat `rtu` / `tcp` register maps; jockey counters under symbolic keys |

The normalizer produces `NormalizedDeviceData` with separate `main` and `jockey` blocks, each containing `trending` and `historical` register snapshots plus timestamps.

### Profile resolution (`src/lib/decodeDevicePacket.ts`)

| Profile ID | Main controller | Jockey controller | Badge |
|------------|-----------------|-------------------|-------|
| `mk3-diesel-fcjc` | MK3 Diesel (`mk3diesel`) | FCJC (`fcjc`) | MK3D |
| `mk3-electric-ftjp` | MK3 Electric (`mk3electric`) | FTJP (`ftjp`) | MK3E |

Resolution order:
1. If API reports `mk3electric` or `ftjp` controller types → electric profile.
2. Else fall back to `getProfileIdForDevice(deviceId)` from `src/config/devices.ts`.
3. Default: diesel/FCJC.

Known test devices in config: **123** (diesel/FCJC), **124** (electric/FTJP).

---

## Controller Profiles & Register Decoding

Register mappings live in profile-specific files:

- `src/lib/profiles/dieselFcjc/registers.ts` + `decode.ts`
- `src/lib/profiles/electricFtjp/registers.ts` + `decode.ts`

Shared decoding utilities: `src/lib/decodeShared.ts`, `src/lib/registerUtils.ts`

### What gets decoded

| Category | Main pump examples | Jockey pump examples |
|----------|-------------------|----------------------|
| **Hero metric** | System discharge pressure (reg `2006`) | Jockey discharge pressure |
| **Switch position** | AUTO / MANUAL / OFF from status bits | FCJC: reg `12` bits; FTJP: reg `25` bits |
| **Alarms / status lamps** | Bit-mapped alarms (diesel: 29 bits; electric: 21 bits) | Jockey running, trouble, power |
| **Analog readings** | Batteries (diesel) or 3-phase V/I + Hz (electric) | — |
| **Operating stats** | — | Start/stop pressure settings, run hours, starts |
| **Historical metrics** | Start/stop pressure, starts, timers, run durations | — |
| **Historical events** | Last engine start, overspeed, low oil, etc. | — |

Registers are looked up from **trending first, then historical** (`getMergedRegister`). Bit fields use `isBitSet(value, bitIndex)`. Analog values often use `scaleAnalog(raw, scale)` (default scale 10 for PSI).

### Diesel + FCJC specifics

- Main switch decoded from regs `2012` and `1800` bits.
- Jockey run hours: Modbus LONG regs `6`/`7` with ÷100 scaling, or legacy RTU `rhrs` counter.
- Jockey starts: regs `8`/`9` as 32-bit, or legacy RTU `start` counter.
- Jockey discharge: FCJC reg `18`.

### Electric + FTJP specifics

- No main pump switch panel (`mainSwitchAvailable: false`).
- Electrical section shows phase voltages, currents, and frequency.
- FTJP jockey discharge reg `27` with scale ÷10.
- FTJP switch on reg `25`; status bits on reg `176`.

---

## Dashboard UI

`FirePumpDashboard` (`src/components/FirePumpDashboard.tsx`) renders two `PumpSection` blocks:

### Main Pump section
- Large **System Discharge Pressure** hero (red highlight on low pressure alarm).
- Switch position panel (diesel only).
- Analog panel ("Batteries" or "Electrical").
- Alarm/status lamp grid with trouble count.
- Historical metrics and event timestamps.

### Jockey Pump section
- Jockey discharge hero (or placeholder if register missing).
- Switch position + operating stats (pressure settings, run hours, starts).
- Status lamp panel.

Each section shows **Trend** and **Hist** timestamp pills from the latest packet. Styling is in `src/device-dashboard.css`, `src/index.css`, and `src/theme/theme.css` (brand light/dark themes).

---

## Offline Detection

`src/lib/controllerOffline.ts` marks a controller offline when **all trending register values are zero** (or trending block is empty).

```
"Controller Unpowered or Communication error"
```

This overlay appears per pump section (main and jockey independently). Only **trending** data is used — historical data may lag ~10 minutes and is intentionally excluded from offline logic.

---

## Project Structure

```
6-23Progress/
├── Lambdas/
│   ├── GetLatestFrame.py          # Latest register snapshot from TimescaleDB
│   ├── StandardUserLogin.py       # bcrypt login
│   ├── GetUserStruct.py           # Folder tree for sidebar
│   ├── CreateStandardUser.py      # Admin user + SES email
│   └── CompleteUserOnboarding.py  # Profile + password setup
│
└── connect-standard-frontend/
    ├── README.md                  # This document — keep updated with code changes
    ├── .env                       # API Gateway URLs (VITE_*)
    ├── src/
    │   ├── App.tsx                # Root app shell and routing logic
    │   ├── api/client.ts          # Lambda API wrappers
    │   ├── config.ts              # Poll interval, packet API base
    │   ├── config/devices.ts      # Device profiles and URL builder
    │   ├── theme/
    │   │   ├── theme.css          # Brand color CSS variables (light/dark)
    │   │   └── ThemeContext.tsx   # Theme state + localStorage
    │   ├── hooks/useDevicePacket.ts
    │   ├── components/
    │   │   ├── AppTopBar.tsx        # Unified top bar
    │   │   ├── BrandLogo.tsx
    │   │   ├── ThemeToggle.tsx
    │   │   ├── FirePumpDashboard.tsx
    │   │   ├── DeviceView.tsx
    │   │   ├── SidebarTree.tsx
    │   │   ├── LoginForm.tsx
    │   │   ├── OnboardingPage.tsx
    │   │   └── admin/             # Creator login + create user
    │   ├── lib/
    │   │   ├── normalizePacket.ts
    │   │   ├── decodeDevicePacket.ts
    │   │   ├── controllerOffline.ts
    │   │   └── profiles/          # dieselFcjc, electricFtjp
    │   ├── types/                 # devicePacket, m3d types
    │   └── data/                  # Sample packets for offline dev
    └── package.json
```

---

## Running Locally

```bash
cd connect-standard-frontend
npm install
npm run dev
```

1. Copy or edit `.env` with your API Gateway URLs.
2. Open the Vite dev server URL (typically `http://localhost:5173`).
3. Sign in with a provisioned user account.
4. Select a device from the sidebar to view live data.

**Build for production:**

```bash
npm run build    # outputs to dist/
npm run preview  # serve production build locally
```

Without `VITE_PACKET_API_URL`, the dashboard runs in **sample data mode** using bundled example packets.

---

## Known Dependencies Outside This Repo

| Component | Notes |
|-----------|-------|
| **STM32 edge firmware** | Modbus polling and MQTT publish logic |
| **MQTT broker & ingestion** | Receives device frames and writes to TimescaleDB |
| **TimescaleDB schema** | Tables, hypertables, and seed data for devices/folders/controllers |
| **`ses_mailer` module** | Imported by `CreateStandardUser.py`; sends welcome emails via AWS SES (deployed with the Lambda layer/package) |
| **API Gateway + Lambda deployment** | Infrastructure wiring (IAM, VPC if applicable, env vars) |

---

## Summary

Peerless Connect is an end-to-end IoT monitoring solution for fire pump installations. Edge hardware reads Modbus registers from main and jockey pump controllers and publishes them over cellular MQTT. AWS stores time-series data in TimescaleDB. Five Lambda functions expose login, user management, folder navigation, and latest register snapshots through API Gateway. The React frontend authenticates users, shows a permission-scoped device tree, and renders a live-updating fire pump dashboard with profile-specific register decoding for MK3 Diesel/FCJC and MK3 Electric/FTJP configurations.
