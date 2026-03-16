import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../prisma.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import type { UserBookingsQuery } from "../schemas/booking.schema.js";
import {
  getRemainingCapacityHint,
  setRemainingCapacity,
} from "./capacityCache.service.js";

interface LockedEventRow {
  id: string;
  capacity: number;
  booked_count: number;
  is_active: boolean;
  date: Date;
}

const BOOKING_SELECT = {
  id: true,
  eventId: true,
  userId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function logAuditFailure(
  opType: string,
  eventId: string,
  userId: string,
  reason: string,
) {
  try {
    await prisma.auditLog.create({
      data: { opType, eventId, userId, outcome: "FAILURE", reason },
    });
  } catch (err) {
    logger.warn({ err, opType, eventId, userId, reason }, "Audit log write failed");
  }
}

const USER_BOOKING_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  event: {
    select: {
      id: true,
      name: true,
      date: true,
      venue: true,
      type: true,
      category: true,
      duration: true,
    },
  },
} satisfies Prisma.BookingSelect;

export const bookingService = {
  async listByUser(userId: string, query: UserBookingsQuery) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: USER_BOOKING_SELECT,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Books a spot for a user on an event.
   *
   * Lock ordering: events row → bookings check → insert booking.
   * Both bookEvent and cancelBooking lock the events row FIRST
   * to guarantee a consistent ordering and prevent deadlocks.
   */
  async bookEvent(eventId: string, userId: string) {
    try {
      // Best-effort Redis fast-path: if we know remaining <= 0, we still verify in DB.
      const remainingHint = await getRemainingCapacityHint(eventId);
      if (remainingHint !== null && remainingHint <= 0) {
        logger.debug(
          { eventId, remainingHint },
          "Redis hint says no remaining capacity; verifying in DB",
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Acquire row-level lock on the event (pessimistic)
        const rows = await tx.$queryRaw<LockedEventRow[]>`
          SELECT id, capacity, booked_count, is_active, date
          FROM events
          WHERE id = ${eventId}::uuid
          FOR UPDATE
        `;
        const event = rows[0];

        if (!event) {
          throw ApiError.notFound("Event not found");
        }
        if (!event.is_active) {
          throw ApiError.badRequest("Event is no longer active");
        }
        if (event.date <= new Date()) {
          throw ApiError.badRequest("Event has already passed");
        }
        if (event.booked_count >= event.capacity) {
          throw ApiError.conflict("Event is fully booked");
        }

        // 2. Prevent duplicate active booking (DB unique index backs this up)
        const existing = await tx.booking.findFirst({
          where: { eventId, userId, status: "CONFIRMED" },
        });
        if (existing) {
          throw ApiError.conflict(
            "You already have an active booking for this event",
          );
        }

        // 3. Create booking
        const booking = await tx.booking.create({
          data: { eventId, userId },
          select: BOOKING_SELECT,
        });

        // 4. Atomically increment booked_count (CHECK constraint is the final safety net)
        await tx.$executeRaw`
          UPDATE events
          SET booked_count = booked_count + 1, updated_at = NOW()
          WHERE id = ${eventId}::uuid
        `;
        const remainingAfter =
          event.capacity - (event.booked_count + 1);

        // 5. Audit success (committed together with the booking)
        await tx.auditLog.create({
          data: {
            opType: "BOOK",
            eventId,
            userId,
            bookingId: booking.id,
            outcome: "SUCCESS",
          },
        });

        return { booking, remainingAfter };
      });

      // Outside transaction: update cache best-effort
      try {
        await setRemainingCapacity(eventId, result.remainingAfter);
      } catch {
        // handled inside service
      }

      return result.booking;
    } catch (err) {
      if (err instanceof ApiError) {
        await logAuditFailure("BOOK", eventId, userId, err.message);
      }
      throw err;
    }
  },

  /**
   * Cancels an existing confirmed booking.
   *
   * Lock ordering: events row → bookings update (same as bookEvent).
   */
  async cancelBooking(eventId: string, userId: string) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Lock event row FIRST (same order as bookEvent → no deadlocks)
        const rows = await tx.$queryRaw<LockedEventRow[]>`
          SELECT id, booked_count
          FROM events
          WHERE id = ${eventId}::uuid
          FOR UPDATE
        `;
        const event = rows[0];

        if (!event) {
          throw ApiError.notFound("Event not found");
        }

        // 2. Find the user's active booking
        const booking = await tx.booking.findFirst({
          where: { eventId, userId, status: "CONFIRMED" },
        });
        if (!booking) {
          throw ApiError.notFound(
            "No active booking found for this event",
          );
        }

        // 3. Mark cancelled
        const cancelled = await tx.booking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED" },
          select: BOOKING_SELECT,
        });

        // 4. Atomically decrement booked_count
        await tx.$executeRaw`
          UPDATE events
          SET booked_count = booked_count - 1, updated_at = NOW()
          WHERE id = ${eventId}::uuid
        `;
        const remainingAfter = event.booked_count - 1;

        // 5. Audit success
        await tx.auditLog.create({
          data: {
            opType: "CANCEL",
            eventId,
            userId,
            bookingId: booking.id,
            outcome: "SUCCESS",
          },
        });

        return { cancelled, remainingAfter };
      });

      // Outside transaction: update cache best-effort
      try {
        await setRemainingCapacity(eventId, result.remainingAfter);
      } catch {
        // handled inside service
      }

      return result.cancelled;
    } catch (err) {
      if (err instanceof ApiError) {
        await logAuditFailure("CANCEL", eventId, userId, err.message);
      }
      throw err;
    }
  },
};
