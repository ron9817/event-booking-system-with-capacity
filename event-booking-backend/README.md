# Event Booking System - API Documentation

**Base URL:** `http://localhost:3000`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Response Format](#response-format)
3. [Error Handling](#error-handling)
4. [Authentication](#authentication)
5. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Events](#events)
   - [Bookings](#bookings)
   - [User Bookings](#user-bookings)
6. [Concurrency & Data Integrity](#concurrency--data-integrity)
7. [Database Schema](#database-schema)

---

## Architecture Overview

```
Client Request
  │
  ▼
Express Middleware (helmet, cors, compression, json parser, request logger)
  │
  ▼
Route ──▶ Validation Middleware (Zod) ──▶ Auth Middleware (extractUserId) ──▶ Controller ──▶ Service ──▶ Prisma/DB
  │
  ▼ (on error)
Global Error Handler ──▶ Consistent Error Response
```

- **Routes** define HTTP method + path + middleware chain
- **Validation middleware** parses and validates query/params/body via Zod schemas; parsed values are stored on `req.validated`
- **Controllers** are thin: extract validated input, call service, send response
- **Services** contain business logic, DB queries, and transaction management
- **Global error handler** catches all errors and formats them into a consistent JSON shape

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "page", "message": "Number must be greater than or equal to 1" },
    { "field": "id", "message": "Invalid event ID format" }
  ]
}
```

**Key points for frontend:**
- Always check `success` boolean first
- On `success: false`, display `message` to the user
- If `errors` array exists, it contains per-field validation errors (useful for form highlighting)
- Paginated endpoints always include `meta` alongside `data`

---

## Error Handling

All errors follow the same JSON shape. The frontend should handle these HTTP status codes:

| Status | Meaning | When It Happens |
|--------|---------|-----------------|
| `200` | OK | Successful read or update |
| `201` | Created | Booking successfully created |
| `400` | Bad Request | Validation failed, event inactive, event in the past, missing/invalid headers |
| `404` | Not Found | Event or booking does not exist |
| `409` | Conflict | Event fully booked, user already has an active booking |
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | Database is disconnected (health check only) |

### Error Messages Reference

These are the exact error messages the API returns. The frontend can match on these for specific UI handling:

**Validation errors (400):**
- `"Validation failed"` — with `errors` array containing field-level details
- `"Missing or invalid x-user-id header"` — booking endpoints require `x-user-id` header

**Booking errors (400):**
- `"Event is no longer active"` — event has been deactivated
- `"Event has already passed"` — event date is in the past

**Not found errors (404):**
- `"Event not found"` — event ID does not exist
- `"Event with id '<uuid>' not found"` — event details endpoint
- `"No active booking found for this event"` — cancel attempted with no confirmed booking

**Conflict errors (409):**
- `"Event is fully booked"` — `booked_count >= capacity`
- `"You already have an active booking for this event"` — duplicate booking attempt

---

## Authentication

The system assumes a centralized authorization layer upstream. Authenticated user identity is passed via request headers.

### Header: `x-user-id`

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `x-user-id` | UUID v4 string | **Required for booking endpoints** | The authenticated user's ID |

**Required on:**
- `POST /api/events/:eventId/bookings`
- `DELETE /api/events/:eventId/bookings`

**NOT required on:**
- `GET /api/events`
- `GET /api/events/:id`
- `GET /api/users/:userId/bookings`
- `GET /health`

If missing or not a valid UUID, returns:
```json
{ "success": false, "message": "Missing or invalid x-user-id header" }
```

---

## Endpoints

---

### Health Check

#### `GET /health`

Check server and database connectivity.

**Response `200`:**
```json
{ "status": "UP", "database": "CONNECTED" }
```

**Response `503`:**
```json
{ "status": "UP", "database": "DISCONNECTED" }
```

---

### Events

#### `GET /api/events`

List all active upcoming events, sorted by date ascending (soonest first).

Only returns events where `is_active = true` AND `date >= now()`.

**Query Parameters:**

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `page` | integer | No | `1` | min: 1 | Page number |
| `limit` | integer | No | `10` | min: 1, max: 100 | Items per page |

**Success Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Tech Conference 2026",
      "description": "Annual technology conference...",
      "date": "2026-04-15T09:00:00.000Z",
      "venue": "Convention Center, San Francisco",
      "type": "rsvp",
      "category": "technology",
      "duration": "8 hours",
      "capacity": 500,
      "bookedCount": 42,
      "isActive": true,
      "createdAt": "2026-03-07T10:00:00.000Z",
      "updatedAt": "2026-03-07T10:00:00.000Z",
      "availableSpots": 458
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "totalPages": 1
  }
}
```

**Computed field:** `availableSpots = capacity - bookedCount`

**Error Responses:**
- `400` — Invalid query parameters (e.g., `page=-1`)

**cURL:**
```bash
curl "http://localhost:3000/api/events?page=1&limit=5"
```

---

#### `GET /api/events/:id`

Get full details of a single event.

**Path Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Event ID |

**Success Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Tech Conference 2026",
    "description": "Annual technology conference...",
    "date": "2026-04-15T09:00:00.000Z",
    "venue": "Convention Center, San Francisco",
    "type": "rsvp",
    "category": "technology",
    "duration": "8 hours",
    "capacity": 500,
    "bookedCount": 42,
    "isActive": true,
    "createdAt": "2026-03-07T10:00:00.000Z",
    "updatedAt": "2026-03-07T10:00:00.000Z",
    "availableSpots": 458
  }
}
```

**Error Responses:**
- `400` — `id` is not a valid UUID
- `404` — Event does not exist

**cURL:**
```bash
curl http://localhost:3000/api/events/550e8400-e29b-41d4-a716-446655440000
```

---

### Bookings

#### `POST /api/events/:eventId/bookings`

Book (RSVP) a spot at an event for the authenticated user.

**Headers:**

| Header | Value | Required |
|--------|-------|----------|
| `x-user-id` | UUID v4 | Yes |

**Path Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `eventId` | UUID | Yes | Event to book |

**No request body required.**

**Success Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "CONFIRMED",
    "createdAt": "2026-03-08T12:00:00.000Z",
    "updatedAt": "2026-03-08T12:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Message | Frontend Handling |
|--------|---------|-------------------|
| `400` | `"Missing or invalid x-user-id header"` | Redirect to login or show auth error |
| `400` | `"Validation failed"` | Show field-level errors |
| `400` | `"Event is no longer active"` | Disable booking button, show message |
| `400` | `"Event has already passed"` | Disable booking button, show message |
| `404` | `"Event not found"` | Show "event not found" page |
| `409` | `"Event is fully booked"` | Show "sold out" state, disable button |
| `409` | `"You already have an active booking for this event"` | Show "already booked" state, offer cancel option |

**Business Rules:**
1. Event must exist
2. Event must be active (`is_active = true`)
3. Event must be in the future (`date > now()`)
4. Event must have available capacity (`booked_count < capacity`)
5. User must NOT already have a confirmed booking for this event

All 5 checks run inside a serialized database transaction with pessimistic row locking. See [Concurrency & Data Integrity](#concurrency--data-integrity).

**cURL:**
```bash
curl -X POST http://localhost:3000/api/events/550e8400-e29b-41d4-a716-446655440000/bookings \
  -H "x-user-id: 660e8400-e29b-41d4-a716-446655440000"
```

---

#### `DELETE /api/events/:eventId/bookings`

Cancel the authenticated user's booking for an event.

**Headers:**

| Header | Value | Required |
|--------|-------|----------|
| `x-user-id` | UUID v4 | Yes |

**Path Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `eventId` | UUID | Yes | Event to cancel booking for |

**No request body required.**

**Success Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "CANCELLED",
    "createdAt": "2026-03-08T12:00:00.000Z",
    "updatedAt": "2026-03-08T12:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Message | Frontend Handling |
|--------|---------|-------------------|
| `400` | `"Missing or invalid x-user-id header"` | Redirect to login or show auth error |
| `400` | `"Validation failed"` | Show field-level errors |
| `404` | `"Event not found"` | Show "event not found" page |
| `404` | `"No active booking found for this event"` | Show "no booking to cancel" message |

**Business Rules:**
1. Event must exist
2. User must have an existing booking with status `CONFIRMED`
3. Booking status is updated to `CANCELLED` (not deleted)
4. `booked_count` on the event is decremented (freeing a spot)

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/events/550e8400-e29b-41d4-a716-446655440000/bookings \
  -H "x-user-id: 660e8400-e29b-41d4-a716-446655440000"
```

---

### User Bookings

#### `GET /api/users/:userId/bookings`

List all bookings for a user, with event details included. Sorted by most recent first.

**Path Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | UUID | Yes | User whose bookings to list |

**Query Parameters:**

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `page` | integer | No | `1` | min: 1 | Page number |
| `limit` | integer | No | `10` | min: 1, max: 100 | Items per page |
| `status` | string | No | — | `"CONFIRMED"` or `"CANCELLED"` | Filter by booking status |

**Success Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "CONFIRMED",
      "createdAt": "2026-03-08T12:00:00.000Z",
      "updatedAt": "2026-03-08T12:00:00.000Z",
      "event": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Tech Conference 2026",
        "date": "2026-04-15T09:00:00.000Z",
        "venue": "Convention Center, San Francisco",
        "type": "rsvp",
        "category": "technology",
        "duration": "8 hours"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

**Error Responses:**
- `400` — `userId` is not a valid UUID, or invalid query params

**Note:** This endpoint returns an empty `data: []` array (not a 404) if the user has no bookings. This is intentional — an empty list is a valid state, not an error.

**cURL:**
```bash
# All bookings
curl http://localhost:3000/api/users/660e8400-e29b-41d4-a716-446655440000/bookings

# Only confirmed, paginated
curl "http://localhost:3000/api/users/660e8400-e29b-41d4-a716-446655440000/bookings?status=CONFIRMED&page=1&limit=5"
```

---

## Concurrency & Data Integrity

### Problem

Multiple users may attempt to book the last remaining spot at the same time. Without proper handling, this leads to overselling (more bookings than capacity).

### Solution: Pessimistic Locking + ACID Transactions

Every booking and cancellation runs inside a PostgreSQL transaction with `SELECT ... FOR UPDATE`:

```
BEGIN TRANSACTION
  │
  ├─ SELECT ... FROM events WHERE id = ? FOR UPDATE   ← Row is LOCKED
  │  (other transactions trying to book/cancel the same event WAIT here)
  │
  ├─ Validate: active? future? capacity? duplicate?
  │
  ├─ INSERT booking / UPDATE booking status
  │
  ├─ UPDATE events SET booked_count = booked_count ± 1
  │
  ├─ INSERT audit_log (SUCCESS)
  │
COMMIT                                                 ← Lock is RELEASED
```

### Deadlock Prevention

Both `bookEvent` and `cancelBooking` acquire locks in the **same order**:
1. Lock the `events` row first
2. Then operate on `bookings`

This consistent ordering guarantees no circular wait — deadlocks are impossible between these two operations.

### Safety Nets (Defense in Depth)

| Layer | Mechanism | What It Prevents |
|-------|-----------|------------------|
| Application | `booked_count >= capacity` check | Overselling |
| Database | `CHECK (booked_count <= capacity)` constraint | Overselling (even if app logic has a bug) |
| Database | `UNIQUE INDEX ON (event_id, user_id) WHERE status = 'CONFIRMED'` | Duplicate bookings |
| Transaction | `FOR UPDATE` row lock | Race conditions |
| Transaction | ACID properties | Partial writes |

### Audit Trail

Every booking attempt is logged to the `audit_logs` table:

- **Success:** Audit log is written INSIDE the transaction (committed atomically with the booking)
- **Failure:** Audit log is written OUTSIDE the transaction (persists even after rollback)

Audit log fields:
- `op_type`: `"BOOK"` or `"CANCEL"`
- `event_id`: Which event
- `user_id`: Who attempted
- `booking_id`: The booking ID (null on failure)
- `outcome`: `"SUCCESS"` or `"FAILURE"`
- `reason`: Null on success, error message on failure

---

## Database Schema

### Event

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `name` | VARCHAR(255) | No | — | Event name |
| `description` | TEXT | Yes | — | Full description |
| `date` | TIMESTAMPTZ | No | — | Event date and time |
| `venue` | TEXT | Yes | — | Location |
| `type` | VARCHAR(50) | Yes | — | Booking type (`"rsvp"`) |
| `category` | VARCHAR(50) | Yes | — | Event category |
| `duration` | TEXT | Yes | — | Duration as text (e.g., `"8 hours"`) |
| `capacity` | INTEGER | No | `0` | Maximum attendees |
| `booked_count` | INTEGER | No | `0` | Current confirmed bookings |
| `is_active` | BOOLEAN | No | `true` | Whether event accepts bookings |
| `created_by` | VARCHAR(255) | Yes | — | Creator identifier |
| `updated_by` | VARCHAR(255) | Yes | — | Last updater identifier |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | Last update timestamp |

### Booking

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `event_id` | UUID (FK → events) | No | — | Which event |
| `user_id` | UUID | No | — | Who booked |
| `status` | ENUM (`CONFIRMED`, `CANCELLED`) | No | `CONFIRMED` | Booking status |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | When booked |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | When last modified |

### AuditLog

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | BIGSERIAL | No | auto | Primary key |
| `op_type` | VARCHAR(20) | No | — | `"BOOK"` or `"CANCEL"` |
| `event_id` | UUID (FK → events) | No | — | Related event |
| `user_id` | UUID | No | — | Who performed the action |
| `booking_id` | UUID | Yes | — | Related booking (null on failure) |
| `outcome` | VARCHAR(20) | No | — | `"SUCCESS"` or `"FAILURE"` |
| `reason` | TEXT | Yes | — | Failure reason (null on success) |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | When logged |

### Database Constraints

```sql
-- Prevents booked_count from exceeding capacity
ALTER TABLE events ADD CONSTRAINT capacity_safety CHECK (booked_count <= capacity);

-- Prevents duplicate active bookings (one confirmed booking per user per event)
CREATE UNIQUE INDEX "unique_active_booking" ON "bookings" ("event_id", "user_id") WHERE "status" = 'CONFIRMED';

-- Partial index for listing active future events efficiently
CREATE INDEX idx_events_upcoming_partial ON events (date) WHERE is_active = TRUE;
```

---

## Frontend Integration Guide

### Recommended User Flows

#### Event Listing Page
1. Call `GET /api/events?page=1&limit=10`
2. Render event cards with `name`, `date`, `venue`, `category`, `availableSpots`
3. Show "Sold Out" badge when `availableSpots === 0`
4. Implement pagination using `meta.totalPages`

#### Event Details Page
1. Call `GET /api/events/:id`
2. Show full event details
3. Show booking button:
   - **Enabled** if `availableSpots > 0`
   - **"Sold Out"** if `availableSpots === 0`
4. After booking, re-fetch event details to update `availableSpots`

#### Booking an Event
1. Call `POST /api/events/:eventId/bookings` with `x-user-id` header
2. On `201`: Show success toast, refresh event details and user bookings
3. On `409` with `"Event is fully booked"`: Show "sold out" state
4. On `409` with `"You already have an active booking"`: Show "already booked" state with cancel option
5. On `400` with `"Event is no longer active"`: Show inactive message
6. On `400` with `"Event has already passed"`: Show past event message
7. On `404`: Redirect to events list

#### Cancelling a Booking
1. Call `DELETE /api/events/:eventId/bookings` with `x-user-id` header
2. On `200`: Show success toast, refresh event details and user bookings
3. On `404` with `"No active booking found"`: Booking was already cancelled (refresh UI)

#### My Bookings Page
1. Call `GET /api/users/:userId/bookings?status=CONFIRMED`
2. Render booking cards with nested `event` data (name, date, venue)
3. Each card should have a "Cancel" button
4. Optionally add a tab/toggle to show `CANCELLED` bookings
5. Empty state: show "No bookings yet" message (empty array is not an error)

### State Management Tips

- After any booking/cancel action, invalidate both the event details cache AND the user bookings cache
- `availableSpots` can change at any time due to other users — consider polling or re-fetching on focus
- The `status` field on bookings is either `"CONFIRMED"` or `"CANCELLED"` — no other values exist
- All timestamps are in ISO 8601 UTC format
- All IDs are UUID v4 strings
