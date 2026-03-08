# Event Booking System

A full-stack event booking system with real-time capacity tracking, concurrency-safe bookings, and an audit trail.

**Tech Stack:** React 19 + Vite 7 | Express 5 + TypeScript | PostgreSQL + Prisma 7

- [Quick Start (Docker)](#quick-start-docker)
- [Manual Setup](#manual-setup)

---

## Booking System Types

Booking system can be of multiple types:

1. **RSVP:** A quick booking system to get user registered for meetups, small gathering with fixed limit.
2. **Seat Booking:** A full fledge booking system for a show, sports game, concerete where there is multiple types of seats, user can select multiple seats, payment system etc.
3. **System Seat Allocation:** A complex booking system where a event is across multiple dates, multiple nested hierarcy, multiple venues, multiple seats with different capacity and on booking a seat gets allocated based on availability like IRCTC.
4. **Hotel Room Booking:** Having multiple tier rooms, dynamic pricing, over booking etc.
5. **A Hybrid**

Scope is endless.

In my current scope I will build a small event booking system to reserve a spot for event with limited capacity.

---

## Functional Requirements

1. User can see all events / meetups taking place in future.
2. User can view meeting detail.
3. User can book a event.
4. User can view his bookings.
5. User can cancel his bookings. System maintains consistency of capacity.
6. System maintains capacity constraints, allow for concurrent bookings, one booking per person.

## Non-Functional Requirements

1. Support low latency view of events, bookings. P99 < 200ms
2. Highly consistent booking and cancellations.
3. Allow Concurrent bookings.
4. 99.95% Availability
5. Read write 10:1 to 100:1
6. Scalability
7. Security
8. Extensibility

## Out of Scope

1. Backend admin systems for event creation, viewing bookings etc. (Scope: User side actions: booking, cancellations etc)
2. Payments
3. Low latency search, filters etc
4. No realtime capacity updates. (Scope: Option to refresh and view updated capacity)
5. Observability, error monitoring, apm. (Scope: Proper logging to debug errors)

## Assumptions

1. We have authentication, authourization systems in place. Our service recieves `x-user-id` header with logged in user details.
2. Robust ratelimiting systems in place. Currently we have basic rate limiting on ip to prevent users continuously booking under load when booking might take some time.
3. Only one booking per user.

---

## High-Level System Design

```
                        ┌──────────────────────────────────┐
                        │         Users / Clients           │
                        │   (Web Browsers, Mobile Apps)     │
                        └───────────────┬──────────────────┘
                                        │
                                   HTTPS│
                                        ▼
           ┌────────────────────────────────────────────────────────┐
           │                     API Gateway                        │
           │                                                        │
           │   • Authentication & Authorization (JWT / API Keys)    │
           │   • Rate Limiting & Throttling                         │
           │   • TLS Termination & Security (WAF, CORS, Helmet)     │
           │   • Load Balancing (Round-Robin / Least-Connections)    │
           │   • Request Validation & Routing                       │
           └─────────┬─────────────────┬─────────────────┬─────────┘
                     │                 │                 │
            ┌────────▼───────┐ ┌───────▼───────┐ ┌──────▼────────┐
            │ App Instance 1 │ │ App Instance 2│ │ App Instance N│
            │                │ │               │ │               │
            │  Express 5 +   │ │  Express 5 +  │ │  Express 5 +  │
            │  TypeScript    │ │  TypeScript   │ │  TypeScript   │
            │  (Stateless)   │ │  (Stateless)  │ │  (Stateless)  │
            │                │ │               │ │               │
            │ ┌────────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐ │
            │ │Controllers │ │ │ │Controllers│ │ │ │Controllers│ │
            │ │Services    │ │ │ │Services   │ │ │ │Services   │ │
            │ │Zod Schemas │ │ │ │Zod Schemas│ │ │ │Zod Schemas│ │
            │ │Prisma ORM  │ │ │ │Prisma ORM │ │ │ │Prisma ORM │ │
            │ └────────────┘ │ │ └───────────┘ │ │ └───────────┘ │
            └──┬──────────┬──┘ └──┬─────────┬──┘ └──┬─────────┬──┘
               │          │       │         │       │         │
               │          └───────┤  Cache  ├───────┘         │
               │                  │  Reads  │                 │
               │                  └────┬────┘                 │
               │  DB Read/Write        │                      │  DB Read/Write
               │                       ▼                      │
               │  ┌─────────────────────────────────────────┐ │
               │  │            Redis Cache (Global)         │ │
               │  │                                         │ │
               │  │  • Event Listing & Detail Cache (TTL)   │ │
               │  │  • Capacity Pre-check (fast rejection)  │ │
               │  │  • Cache Invalidation on Write          │ │
               │  │                                         │ │
               │  │  Future Scope:                          │ │
               │  │  • Distributed Rate Limit Counters      │ │
               │  │  • Session / Auth Token Store           │ │
               │  │  • Pub/Sub for Cache Invalidation       │ │
               │  └─────────────────┬───────────────────────┘ │
               │                    │                         │
               │           Cache Miss / Write-through         │
               │                    │                         │
               ▼                    ▼                         ▼
     ┌──────────────────────────────────────────────────────────────┐
     │                  PostgreSQL Primary (Writer)                 │
     │                                                              │
     │  • All Writes (INSERT, UPDATE, DELETE)                       │
     │  • Transactional Bookings with SELECT ... FOR UPDATE         │
     │  • CHECK Constraints (booked_count <= capacity)              │
     │  • Unique Indexes (no duplicate confirmed bookings)          │
     │  • Audit Log Writes                                          │
     │                                                              │
     │  Tables: events │ bookings │ audit_logs                      │
     └────────┬────────────────┬────────────────┬──────────────────┘
              │                │                │
       Streaming        Streaming        Streaming
      Replication       Replication      Replication
              │                │                │
     ┌────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
     │ Read Replica 1│ │ Read Replica 2│ │ Read Replica N│
     │               │ │              │ │              │
     │ Event Listing │ │ Booking      │ │ Analytics &  │
     │ & Search      │ │ History      │ │ Reporting    │
     └───────────────┘ └──────────────┘ └──────────────┘
```

---

## Table of Contents

- [Booking System Types](#booking-system-types)
- [Functional Requirements](#functional-requirements)
- [Non-Functional Requirements](#non-functional-requirements)
- [Out of Scope](#out-of-scope)
- [Assumptions](#assumptions)
- [High-Level System Design](#high-level-system-design)
- [Current Scope Architecture](#current-scope-architecture)
- [Design Choices / Implementation](#design-choices--implementation)
- [Salient Features](#salient-features)
- [Future Scope](#future-scope)
- [Code Design Patterns](#code-design-patterns)
- [DB Schema](#db-schema)
- [Flows](#flows)
- [Testing](#testing)
- [Core User UX](#core-user-ux)
- [Design Language](#design-language)
- [Frontend Components](#frontend-components)
- [Quick Start (Docker)](#quick-start-docker)
- [Manual Setup](#manual-setup)
  - [Prerequisites](#prerequisites)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Set Up PostgreSQL](#2-set-up-postgresql)
  - [3. Set Up the Backend](#3-set-up-the-backend)
  - [4. Set Up the Frontend](#4-set-up-the-frontend)
  - [5. Verify Everything Works](#5-verify-everything-works)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [Troubleshooting](#troubleshooting)

---

## Current Scope Architecture

```
┌──────────────────────────────────────────────────┐
│  Frontend (React + Vite)                         │
│  Port: 5173 (dev) / 8080 (Docker via nginx)      │
│  React Router, TanStack Query, Tailwind CSS      │
└──────────────────┬───────────────────────────────┘
                   │ /api/* (Vite proxy / nginx proxy)
                   ▼
┌──────────────────────────────────────────────────┐
│  Backend (Express 5)                             │
│  Port: 3000                                      │
│  Zod validation, rate limiting, Swagger docs     │
└──────────────────┬───────────────────────────────┘
                   │ Prisma ORM + @prisma/adapter-pg
                   ▼
┌──────────────────────────────────────────────────┐
│  PostgreSQL 16                                   │
│  Port: 5432                                      │
│  Pessimistic locking, CHECK constraints          │
│  Tables: events, bookings, audit_logs            │
└──────────────────────────────────────────────────┘
```

---

## Design Choices / Implementation

- Events are pre-seeded (no admin create/edit UI)
- User identity is simulated via `x-user-id` header (no real auth)
- User ID is generated and stored in localStorage on the frontend

### SQL vs NoSQL

- Major design decission was for selecting SQL vs NoSQL
- NoSQL was considered for higher write throughput, easier scalability, supporting multiple types of event data would be schemaless and less relational so NoSQL could have been better
- But eventually strong conistency gurantees (capacity constraint under high concurrency), more reads compared to writes, needed pesimistic locking approach decided to go with sql
- Dynamo support transactions but more of optimistic approach which could have been fatal for our kind concurrent system. So postgre RDMS was decided

### Concurrency Handling (Pessimistic vs Optimistic)

- Uses pesimistic approach with defense in depth using database level constraints
- Pesimistic choosen as booking could be have high contention and all elligible requests should pass
- Optimistic have allowed only one to succeed while all other requests failing leading to retries and system getting thrashed
- **Features:**
  - Pessimistic locking with `SELECT ... FOR UPDATE`
  - Consistent lock ordering (event row first) to prevent deadlocks
  - Database-level CHECK constraint as a safety net (`booked_count <= capacity`)
  - Atomic increment/decrement with raw SQL
  - Audit log committed inside the transaction (failures logged outside)

---

## Salient Features

- Stateless app tier
- No deadlocks -- same lock ordering in both bookEvent and cancelBooking
- No overselling -- concurrent requests serialize on the event row
- ACID -- everything runs inside a single Prisma interactive transaction
- Clean layered architecture (routes → controllers → services)
- Type-safe config with startup validation
- Structured logging (pino)
- Request validation (zod)
- Graceful shutdown
- Consistent error responses
- DB constraints as safety nets (CHECK, unique index)
- Edge cases handling: sold out, multiple bookings, already booked, cancel only booked, capacity constraint
- Refresh button to get updated capacity
- Robust logging for debugging
- Idempotent bookings => unique `user_id` + `event_id` on booking
- Proper indexes to support high throughput reads
- Proper audit logging. Handled failure scenarios
- Swagger API documentation
- Booking and cancellation confirmation before user proceeds
- Robust test suite, API integration test suite using Postman
- Dockerized application => One click setup
- React Query for server state with proper cache invalidation
- Specific error handling per error type (409, 404, 429)
- Confirmation modals before destructive actions
- Loading skeletons, empty states, error boundaries
- Accessible modals (focus trap, ARIA, Escape key)
- Responsive design with Tailwind
- Integration tests covering full request lifecycle
- Concurrency tests proving correctness under load
- Unit tests for middleware and utilities
- API integration regression test suite with Postman

---

## Future Scope

- Cache event data in Redis with proper invalidation strategy to support higher read throughput
- Redis (or any cache / distributed KV) should be a best-effort accelerator for sold out events. In case of sold out, request wont hit postgres db reducing load on database with maximum of capacity requests hitting database for booking.
- Partitioning audit logs as data grows
- Extend to multiple booking strategies like theatre seat booking
- Elastic Search for faster and enhanced search support
- Payments, admin panel for event creation, view event bookings etc
- Hybrid databases SQL and NoSQL. SQL for consistency vs NoSQL for schema less metadata rich events data.
- Dynamic pricing, over booking support in case of cancellations
- GoHighlevel specific support for multi tenancy so solution can be scaled across multiple tenants
- Event images -- add CDN for faster cached images

---

## Code Design Patterns

| Pattern                              | Usage                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| **Layered Architecture**             | Routes → Controllers → Services → DB                                         |
| **Factory Method**                   | `ApiError.badRequest()`, `.notFound()`, `.conflict()`                         |
| **Chain of Responsibility**          | Express middleware pipeline (helmet → cors → validate → handler → errorHandler) |
| **Singleton**                        | Prisma client in `prisma.ts`                                                  |
| **Standardized Response Envelope**   | `ApiResponse.success()`, `.paginated()`, `.error()`                           |
| **Pessimistic Locking**              | `SELECT ... FOR UPDATE` in transactions                                       |
| **Defense in Depth**                 | App-level validation + DB CHECK constraint + unique index                     |
| **Query Factory (frontend)**         | `eventQueries.list()`, `.detail()`                                            |

---

## DB Schema

```sql
CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'CANCELLED');

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    venue TEXT,
    type VARCHAR(50),
    category VARCHAR(50),
    duration INTERVAL,
    capacity INTEGER NOT NULL DEFAULT 0,
    booked_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT capacity_safety CHECK (booked_count <= capacity)
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status booking_status NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    op_type VARCHAR(20) NOT NULL,
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    booking_id UUID,
    outcome VARCHAR(20) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- Index for upcoming events (most used access pattern)
CREATE INDEX idx_events_upcoming ON events (date) WHERE is_active = TRUE;

-- Index for "My Bookings" (second most used access pattern)
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- Index for audit log lookups by event
CREATE INDEX idx_audit_event_id ON audit_logs(event_id);

-- Defense in depth: prevent double booking
CREATE UNIQUE INDEX "unique_active_booking"
ON "bookings" ("event_id", "user_id")
WHERE "status" = 'CONFIRMED';
```

### DB Constraints and Indexes

Application level + DB level => Defense in depth:

- **`capacity_safety`** — to prevent over booking
- **`unique_active_booking`** — to prevent double booking

Indexes:

- **Events partial date** — Most used access pattern would be to view active events
- **Bookings `user_id`** — Second most used will be to view bookings

---

## Flows

### Book Flow (`bookEvent`)

1. `SELECT ... FOR UPDATE` on the event row (acquires row lock)
2. Validate: event exists, is active, is in the future, has capacity
3. Check no existing active booking for this user (backed by the `unique_active_booking` DB index)
4. `INSERT` booking
5. `UPDATE events SET booked_count = booked_count + 1` (DB CHECK constraint is the final safety net)
6. `INSERT` success audit log
7. Commit (all 3 writes atomically)

### Cancel Flow (`cancelBooking`)

1. `SELECT ... FOR UPDATE` on the event row (same lock order)
2. Find the user's confirmed booking
3. `UPDATE` booking status to `CANCELLED`
4. `UPDATE events SET booked_count = booked_count - 1`
5. `INSERT` success audit log
6. Commit

---

## Testing

### Concurrency Tests (5 tests) — proves locking under load

- 20 users book 5 spots simultaneously — exactly 5 succeed, 15 get 409, `booked_count` stays at 5
- Concurrent cancellations — `booked_count` reaches exactly 0
- Mixed book + cancel simultaneously — no deadlocks, `booked_count` matches confirmed count
- Same user double-books concurrently — exactly 1 succeeds
- Audit log accuracy under load — success + failure counts match

---

## Core User UX

```mermaid
flowchart LR
    subgraph discover [Event Discovery]
        A[Land on Events page] --> B[Scan event cards]
        B --> C[Click event card]
        C --> D[View full details]
    end
    subgraph book [Booking Flow]
        D --> E[Click Book Now]
        E --> F[Confirmation modal]
        F -->|Confirm| G[Success feedback]
        F -->|Cancel| D
    end
    subgraph manage [Booking Management]
        H[Go to My Bookings] --> I[View bookings list]
        I --> J[Click Cancel]
        J --> K[Cancel confirmation]
        K -->|Confirm| L[Booking cancelled]
    end
```

## Design Language

The frontend follows a **Clean Minimal** hybrid design inspired by Luma and Eventbrite.

- White cards with subtle shadows sit on a light gray background, each accented with a **type-colored left border** for quick visual scanning.
- Interactive elements use a **blue-to-indigo gradient** for primary CTAs and glassmorphic confirmation modals with backdrop blur.
- Capacity is visualized through color-shifting progress bars (green → amber → red → "Sold Out") and event cards lift gently on hover.
- Typography is driven by Inter with a strong size hierarchy, generous whitespace, and pastel-toned badges for event types and booking status.
- The layout is fully responsive — 3-column card grid on desktop, collapsing to single-column on mobile with icon-only navigation.

## Frontend Components

| Component              | Description                                        |
| ---------------------- | -------------------------------------------------- |
| **EventCard**          | Card for the events grid                           |
| **EventDetail**        | Full event detail view                             |
| **CapacityBar**        | Reusable progress bar with color logic             |
| **TypeBadge**          | Colored pill for event type                        |
| **StatusBadge**        | Booking status indicator                           |
| **BookingCard**        | Card for the my bookings list                      |
| **ConfirmModal**       | Reusable confirmation dialog                       |
| **EmptyState**         | Reusable empty state with icon + message + action  |
| **Skeleton variants**  | Loading placeholders for cards and detail           |

---

## Quick Start (Docker)

Run the entire application with a single command using Docker Compose. This starts PostgreSQL, the backend API, and the frontend — with automatic database migrations and seed data.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20+ recommended)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+ — bundled with Docker Desktop)

### Start the application

```bash
docker compose up -d --build
```

This will:

1. Start a PostgreSQL 16 database
2. Build and start the backend (Express API on port `3000`)
3. Run Prisma migrations automatically
4. Seed the database with 8 sample events (first run only)
5. Build and start the frontend (React app served via nginx on port `8080`)

### Access the application

| Service           | URL                          |
| ----------------- | ---------------------------- |
| Frontend          | http://localhost:8080         |
| Backend API       | http://localhost:3000/api     |
| Swagger Docs      | http://localhost:8080/docs    |
| Health Check      | http://localhost:8080/health  |

### Stop the application

```bash
# Stop all containers (data is preserved)
docker compose down

# Stop and remove all data (fresh start on next run)
docker compose down -v
```

### Re-seed the database

If you cleared the data with `docker compose down -v` and restarted, the seed runs automatically.

To manually re-seed while containers are running:

```bash
docker compose exec backend npx tsx prisma/seed.ts
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

---

## Manual Setup

Follow these steps to set up and run the project without Docker.

### Prerequisites

| Tool       | Version  | How to check       | Install                                  |
| ---------- | -------- | ------------------- | ---------------------------------------- |
| Node.js    | >= 20.19 | `node -v`           | https://nodejs.org                       |
| npm        | >= 10.0  | `npm -v`            | Comes with Node.js                       |
| PostgreSQL | >= 14    | `psql --version`    | https://www.postgresql.org/download/     |

### 1. Clone the Repository

```bash
git clone <repository-url>
cd event-booking-system-with-capacity
```

### 2. Set Up PostgreSQL

#### Option A: Using a locally installed PostgreSQL

Make sure the PostgreSQL server is running, then create the database:

```bash
# Connect to PostgreSQL (default superuser)
psql -U postgres

# Inside psql, run:
CREATE DATABASE event_booking;

# Verify it was created
\l

# Exit psql
\q
```

#### Option B: Using Docker (PostgreSQL only)

If you don't have PostgreSQL installed locally, you can run just the database in Docker:

```bash
docker run -d \
  --name event-booking-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=event_booking \
  -p 5432:5432 \
  postgres:16-alpine
```

#### Verify the database connection

```bash
psql -h localhost -U postgres -d event_booking -c "SELECT 1;"
```

You should see a result with `1` confirming the connection works.

### 3. Set Up the Backend

```bash
cd event-booking-backend
```

#### 3.1 Create the environment file

```bash
cp .env.example .env
```

Open `.env` and verify/adjust the `DATABASE_URL`. If you're using the default PostgreSQL setup, the default value should work:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/event_booking?schema=public"
```

If your PostgreSQL uses a different user, password, host, or port, update accordingly:

```
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/event_booking?schema=public"
```

#### 3.2 Install dependencies

```bash
npm install
```

This will:
- Install all npm packages
- Automatically generate the Prisma client (via the `postinstall` script)

#### 3.3 Run database migrations

This creates all the tables, indexes, and constraints:

```bash
npx prisma migrate deploy
```

You should see output like:

```
3 migrations found in prisma/migrations
...
All migrations have been applied.
```

#### 3.4 Seed the database

Populate the database with 8 sample events:

```bash
npx tsx prisma/seed.ts
```

Expected output:

```
Seeding events...
Seeded 8 events.
```

#### 3.5 Start the backend server

```bash
# Development mode (with hot reload)
npm run dev

# OR production mode
npm run build && npm start
```

The API server starts on `http://localhost:3000`.

#### 3.6 Verify the backend is running

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{ "status": "UP", "database": "CONNECTED" }
```

### 4. Set Up the Frontend

Open a **new terminal** (keep the backend running):

```bash
cd event-booking-frontend
```

#### 4.1 Create the environment file

```bash
cp .env.example .env
```

The defaults work out of the box for local development. The Vite dev server proxies `/api` requests to the backend at `http://localhost:3000`.

#### 4.2 Install dependencies

```bash
npm install
```

#### 4.3 Start the frontend dev server

```bash
npm run dev
```

The frontend starts on `http://localhost:5173`.

#### 4.4 Production build (optional)

To build optimized static assets:

```bash
npm run build
```

The output is in the `dist/` directory and can be served with any static file server. Note that in production you'll need a reverse proxy (like nginx) to forward `/api` requests to the backend.

### 5. Verify Everything Works

1. Open `http://localhost:5173` in your browser
2. You should see the event listing page with 8 sample events
3. Click on an event to see its details
4. Book an event by clicking the "Book Now" button
5. Visit "My Bookings" in the navigation to see your booking
6. Cancel a booking from the "My Bookings" page

API documentation is available at `http://localhost:3000/docs` (Swagger UI).

---

## Project Structure

```
event-booking-system-with-capacity/
├── docker-compose.yml              # Docker Compose orchestration
├── README.md
│
├── event-booking-backend/
│   ├── Dockerfile                  # Backend container
│   ├── docker-entrypoint.sh        # Startup script (migrate + seed + start)
│   ├── package.json
│   ├── prisma.config.ts            # Prisma config (migrations, seed, datasource)
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   ├── seed.ts                 # Seed data (8 sample events)
│   │   └── migrations/             # SQL migration files
│   ├── src/
│   │   ├── server.ts               # Server entry point
│   │   ├── app.ts                  # Express app setup
│   │   ├── config.ts               # Environment validation (Zod)
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── controllers/            # Request handlers
│   │   ├── services/               # Business logic
│   │   ├── routes/                 # Route definitions
│   │   ├── schemas/                # Zod validation schemas
│   │   ├── middlewares/            # Express middleware
│   │   ├── docs/                   # OpenAPI spec generation
│   │   ├── utils/                  # Utilities (logger, ApiError, ApiResponse)
│   │   ├── types/                  # TypeScript declarations
│   │   └── generated/prisma/      # Generated Prisma client (gitignored)
│   └── tests/
│       ├── unit/                   # Unit tests
│       ├── integration/            # Integration tests (needs DB)
│       └── concurrency/            # Concurrency safety tests
│
└── event-booking-frontend/
    ├── Dockerfile                  # Frontend container (build + nginx)
    ├── nginx.conf                  # Nginx config (SPA + API proxy)
    ├── package.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx                # React entry point
        ├── App.tsx                 # Router setup
        ├── index.css               # Global styles (Tailwind)
        ├── api/                    # Axios API client
        ├── components/             # Reusable UI components
        ├── hooks/                  # React Query hooks
        ├── layouts/                # Page layouts
        ├── lib/                    # Utilities
        ├── pages/                  # Page components
        ├── types/                  # TypeScript types
        └── tests/                  # Frontend tests
```

---

## Available Scripts

### Backend (`event-booking-backend/`)

| Script                 | Command                    | Description                                |
| ---------------------- | -------------------------- | ------------------------------------------ |
| `npm run dev`          | `tsx watch src/server.ts`  | Start dev server with hot reload           |
| `npm run build`        | `rimraf dist && tsc`       | Compile TypeScript to `dist/`              |
| `npm start`            | `node dist/server.js`      | Start production server                    |
| `npm test`             | `vitest run`               | Run all tests                              |
| `npm run test:unit`    | `vitest run tests/unit`    | Run unit tests only                        |
| `npm run test:integration` | `vitest run tests/integration` | Run integration tests (needs DB)  |
| `npm run test:concurrency` | `vitest run tests/concurrency` | Run concurrency tests (needs DB) |

### Frontend (`event-booking-frontend/`)

| Script               | Command              | Description                       |
| -------------------- | -------------------- | --------------------------------- |
| `npm run dev`        | `vite`               | Start dev server (port 5173)      |
| `npm run build`      | `tsc -b && vite build` | Build for production            |
| `npm run preview`    | `vite preview`       | Preview production build          |
| `npm test`           | `vitest run`         | Run all tests                     |

### Prisma Commands (from `event-booking-backend/`)

| Command                        | Description                              |
| ------------------------------ | ---------------------------------------- |
| `npx prisma migrate deploy`   | Apply pending migrations                 |
| `npx prisma migrate dev`      | Create a new migration (development)     |
| `npx prisma generate`         | Regenerate the Prisma client             |
| `npx prisma studio`           | Open Prisma Studio (database GUI)        |
| `npx tsx prisma/seed.ts`      | Seed the database with sample events     |

---

## API Documentation

Interactive Swagger documentation is available at:

- **Local dev:** http://localhost:3000/docs
- **Docker:** http://localhost:8080/docs
- **OpenAPI JSON:** http://localhost:3000/docs.json
- **Postman:** event-booking-backend/postman/Event_Booking_API.postman_collection.json

### Key Endpoints

| Method   | Path                              | Description                    |
| -------- | --------------------------------- | ------------------------------ |
| `GET`    | `/health`                         | Health check                   |
| `GET`    | `/api/events`                     | List upcoming events           |
| `GET`    | `/api/events/:id`                 | Get event details              |
| `POST`   | `/api/events/:eventId/bookings`  | Book an event                  |
| `DELETE` | `/api/events/:eventId/bookings`  | Cancel a booking               |
| `GET`    | `/api/users/:userId/bookings`    | List user's bookings           |

---

### Concurrency Safety

Bookings use pessimistic row locking (`SELECT ... FOR UPDATE`) inside serialized database transactions to prevent overselling. Database-level constraints provide defense-in-depth:

- `CHECK (booked_count <= capacity)` prevents overselling even if application logic has a bug
- `UNIQUE INDEX ON (event_id, user_id) WHERE status = 'CONFIRMED'` prevents duplicate bookings

---

## Environment Variables

### Backend (`event-booking-backend/.env`)

| Variable                       | Default                                    | Description                       |
| ------------------------------ | ------------------------------------------ | --------------------------------- |
| `DATABASE_URL`                 | `postgresql://postgres:postgres@localhost:5432/event_booking?schema=public` | PostgreSQL connection string |
| `PORT`                         | `3000`                                     | Server port                       |
| `NODE_ENV`                     | `development`                              | Environment mode                  |
| `CORS_ORIGIN`                  | `http://localhost:5173`                    | Allowed CORS origin               |
| `BODY_SIZE_LIMIT`             | `10kb`                                     | Max request body size             |
| `RATE_LIMIT_WINDOW_MS`        | `900000`                                   | Global rate limit window (15 min) |
| `RATE_LIMIT_MAX`              | `100`                                      | Max requests per window           |
| `RATE_LIMIT_BOOKING_WINDOW_MS`| `60000`                                    | Booking rate limit window (1 min) |
| `RATE_LIMIT_BOOKING_MAX`      | `10`                                       | Max bookings per window           |

### Frontend (`event-booking-frontend/.env`)

| Variable                  | Default                     | Description                                |
| ------------------------- | --------------------------- | ------------------------------------------ |
| `VITE_API_URL`            | _(empty)_                   | API base URL (leave empty for dev proxy)   |
| `VITE_API_PROXY_TARGET`   | `http://localhost:3000`     | Backend URL for Vite dev proxy             |
| `VITE_APP_NAME`           | `EventBook`                 | App name (shown in navbar / browser tab)   |
| `VITE_QUERY_STALE_TIME_MS`| `30000`                    | TanStack Query stale time                  |
| `VITE_QUERY_RETRY_COUNT`  | `1`                         | TanStack Query retry count                 |

---

## Running Tests

### Backend Tests

```bash
cd event-booking-backend

# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests (no DB needed)
npm run test:integration   # Integration tests (needs running DB)
npm run test:concurrency   # Concurrency tests (needs running DB)

npx newman run /postman/Event_Booking_API.postman_collection.json # API intergration regression test suite

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

> Integration and concurrency tests require a running PostgreSQL database. The test setup uses the `DATABASE_URL` from your `.env` file.

### Frontend Tests

```bash
cd event-booking-frontend

# Run all tests
npm test

# Watch mode
npm run test:watch
```

---

## Troubleshooting

### Docker Issues

**Port already in use:**

```bash
# Check what's using the port
lsof -i :3000   # backend
lsof -i :5432   # postgres
lsof -i :8080   # frontend

# Kill the process or change the port in docker-compose.yml
```

**Container won't start:**

```bash
# Check container logs
docker compose logs backend
docker compose logs db

# Rebuild from scratch
docker compose down -v
docker compose up -d --build
```

**Database connection refused:**

```bash
# Verify the database container is healthy
docker compose ps

# Check if postgres is ready
docker compose exec db pg_isready -U postgres
```

### Manual Setup Issues

**`prisma migrate deploy` fails:**

- Ensure PostgreSQL is running: `pg_isready -h localhost -U postgres`
- Verify `DATABASE_URL` in `.env` is correct
- Check that the `event_booking` database exists: `psql -U postgres -l`

**`npm install` fails on Prisma generate:**

- Make sure the `prisma/schema.prisma` file exists
- Try running `npx prisma generate` manually

**Frontend can't reach the backend:**

- Ensure the backend is running on port 3000
- Check that `VITE_API_PROXY_TARGET` in frontend `.env` points to the correct backend URL
- Look for CORS errors in the browser console

**Seed creates duplicate events:**

The seed script uses `createMany` with auto-generated UUIDs, so running it multiple times creates duplicates. To start fresh:

```bash
# Drop and recreate all tables, then re-seed
npx prisma migrate reset
```
