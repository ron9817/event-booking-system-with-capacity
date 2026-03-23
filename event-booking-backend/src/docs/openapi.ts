import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { config } from "../config.js";
import { MAX_BOOKING_QUANTITY } from "../schemas/booking.schema.js";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ──────────────────────────── Reusable Schemas ────────────────────────────

const ErrorResponse = z
  .object({
    success: z.literal(false),
    message: z.string(),
    errors: z
      .array(z.object({ field: z.string(), message: z.string() }))
      .optional(),
  })
  .openapi("ErrorResponse");

const PaginationMeta = z
  .object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
  .openapi("PaginationMeta");

const EventSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    date: z.string().datetime(),
    venue: z.string().nullable(),
    type: z.string().nullable(),
    category: z.string().nullable(),
    duration: z.string().nullable(),
    capacity: z.number().int(),
    bookedCount: z.number().int(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    availableSpots: z.number().int(),
  })
  .openapi("Event");

const BookingSchema = z
  .object({
    id: z.string().uuid(),
    eventId: z.string().uuid(),
    userId: z.string().uuid(),
    quantity: z.number().int(),
    status: z.enum(["CONFIRMED", "CANCELLED"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Booking");

const UserBookingSchema = z
  .object({
    id: z.string().uuid(),
    quantity: z.number().int(),
    status: z.enum(["CONFIRMED", "CANCELLED"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    event: z.object({
      id: z.string().uuid(),
      name: z.string(),
      date: z.string().datetime(),
      venue: z.string().nullable(),
      type: z.string().nullable(),
      category: z.string().nullable(),
      duration: z.string().nullable(),
    }),
  })
  .openapi("UserBooking");

registry.register("ErrorResponse", ErrorResponse);
registry.register("PaginationMeta", PaginationMeta);
registry.register("Event", EventSchema);
registry.register("Booking", BookingSchema);
registry.register("UserBooking", UserBookingSchema);

// ──────────────────────────── Health ────────────────────────────

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Health check",
  description: "Check server and database connectivity.",
  responses: {
    200: {
      description: "Server and database are healthy",
      content: {
        "application/json": {
          schema: z.object({
            status: z.literal("UP"),
            database: z.literal("CONNECTED"),
          }),
        },
      },
    },
    503: {
      description: "Database is disconnected",
      content: {
        "application/json": {
          schema: z.object({
            status: z.literal("UP"),
            database: z.literal("DISCONNECTED"),
          }),
        },
      },
    },
  },
});

// ──────────────────────────── Events ────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/events",
  tags: ["Events"],
  summary: "List active upcoming events",
  description:
    "Returns paginated list of active events with future dates, sorted by date ascending. Each event includes a computed `availableSpots` field.",
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1).openapi({
        description: "Page number",
        example: 1,
      }),
      limit: z.coerce.number().int().min(1).max(100).default(10).openapi({
        description: "Items per page",
        example: 10,
      }),
    }),
  },
  responses: {
    200: {
      description: "Paginated list of events",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(EventSchema),
            meta: PaginationMeta,
          }),
        },
      },
    },
    400: {
      description: "Invalid query parameters",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/events/{id}",
  tags: ["Events"],
  summary: "Get event details",
  description:
    "Returns full details of a single event including computed `availableSpots`.",
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Event UUID" }),
    }),
  },
  responses: {
    200: {
      description: "Event details",
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(true), data: EventSchema }),
        },
      },
    },
    400: {
      description: "Invalid UUID format",
      content: { "application/json": { schema: ErrorResponse } },
    },
    404: {
      description: "Event not found",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

// ──────────────────────────── Bookings ────────────────────────────

registry.registerComponent("parameters", "x-user-id", {
  name: "x-user-id",
  in: "header",
  required: true,
  schema: { type: "string", format: "uuid" },
  description: "Authenticated user's UUID (set by upstream auth layer)",
});

registry.registerPath({
  method: "post",
  path: "/api/events/{eventId}/bookings",
  tags: ["Bookings"],
  summary: "Book an event (multi-seat RSVP)",
  description: `Creates a booking for the authenticated user with a specified seat quantity.

**Business rules enforced (inside a serialized transaction with pessimistic row locking):**
1. Event must exist
2. Event must be active
3. Event must be in the future
4. Event must have enough remaining capacity for the requested quantity
5. User must not already have a confirmed booking

**Concurrency:** Uses \`SELECT ... FOR UPDATE\` to prevent overselling under high load.
Returns a \`409\` with remaining seat count when capacity is insufficient.`,
  request: {
    params: z.object({
      eventId: z.string().uuid().openapi({ description: "Event UUID" }),
    }),
    headers: z.object({
      "x-user-id": z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            quantity: z
              .number()
              .int()
              .min(1)
              .max(MAX_BOOKING_QUANTITY)
              .openapi({ description: "Number of seats to reserve", example: 2 }),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Booking created successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(true), data: BookingSchema }),
        },
      },
    },
    400: {
      description:
        "Validation failed, event inactive, event in the past, or missing x-user-id",
      content: { "application/json": { schema: ErrorResponse } },
    },
    404: {
      description: "Event not found",
      content: { "application/json": { schema: ErrorResponse } },
    },
    409: {
      description:
        "Insufficient capacity (message includes remaining seats) or user already has an active booking",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/events/{eventId}/bookings",
  tags: ["Bookings"],
  summary: "Cancel a booking",
  description: `Cancels the authenticated user's confirmed booking for an event.

**Transaction:** Uses the same lock ordering as booking (events row first) to prevent deadlocks.
Booking status changes to \`CANCELLED\`, event's \`booked_count\` is decremented.`,
  request: {
    params: z.object({
      eventId: z.string().uuid().openapi({ description: "Event UUID" }),
    }),
    headers: z.object({
      "x-user-id": z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Booking cancelled successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(true), data: BookingSchema }),
        },
      },
    },
    400: {
      description: "Validation failed or missing x-user-id",
      content: { "application/json": { schema: ErrorResponse } },
    },
    404: {
      description: "Event not found or no active booking exists",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

// ──────────────────────────── User Bookings ────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/users/{userId}/bookings",
  tags: ["User Bookings"],
  summary: "List user's bookings",
  description:
    "Returns paginated list of a user's bookings with nested event details. Sorted by most recent first. Returns an empty array (not 404) if the user has no bookings.",
  request: {
    params: z.object({
      userId: z.string().uuid().openapi({ description: "User UUID" }),
    }),
    query: z.object({
      page: z.coerce.number().int().min(1).default(1).openapi({
        description: "Page number",
        example: 1,
      }),
      limit: z.coerce.number().int().min(1).max(100).default(10).openapi({
        description: "Items per page",
        example: 10,
      }),
      status: z.enum(["CONFIRMED", "CANCELLED"]).optional().openapi({
        description: "Filter by booking status",
      }),
    }),
  },
  responses: {
    200: {
      description: "Paginated list of user bookings",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(UserBookingSchema),
            meta: PaginationMeta,
          }),
        },
      },
    },
    400: {
      description: "Invalid userId UUID or query parameters",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

// ──────────────────────────── Generate Document ────────────────────────────

const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "Event Booking API",
    version: "1.0.0",
    description: `REST API for an event booking system with capacity management.

## Key Features
- **Event listing** with pagination and availability tracking
- **RSVP bookings** with pessimistic locking for concurrency safety
- **Cancellation** with ACID guarantees
- **Audit trail** for all booking operations

## Authentication
Booking endpoints require an \`x-user-id\` header (UUID) representing the authenticated user.
This assumes a centralized auth layer upstream.

## Concurrency Model
All booking/cancellation operations use PostgreSQL \`SELECT ... FOR UPDATE\` inside serialized transactions.
Both operations lock the event row first to prevent deadlocks.
A database \`CHECK\` constraint (\`booked_count <= capacity\`) serves as a final safety net.`,
  },
  servers: [
    {
      url: `http://localhost:${config.PORT}`,
      description: config.NODE_ENV === "production" ? "Production" : "Local development",
    },
  ],
});
