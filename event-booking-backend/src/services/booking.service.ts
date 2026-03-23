import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../prisma.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import type { UserBookingsQuery } from "../schemas/booking.schema.js";

// 100K requests per 10 min
// 100K capacity

// event:{event_id}:capacity => 1000k

// 100*60*10 = 600000
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
  quantity: true,
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
  quantity: true,
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
   * Books seats for a user on an event.
   *
   * Lock ordering: events row → bookings check → insert booking.
   * Both bookEvent and cancelBooking lock the events row FIRST
   * to guarantee a consistent ordering and prevent deadlocks.
   */
  async bookEvent(eventId: string, userId: string, quantity: number) {
    try {
      return await prisma.$transaction(async (tx) => {
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

        const remainingSeats = event.capacity - event.booked_count;
        if (quantity > remainingSeats) {
          const msg =
            remainingSeats === 0
              ? "Event is fully booked"
              : `Only ${remainingSeats} seat${remainingSeats === 1 ? "" : "s"} available`;
          throw ApiError.conflict(msg);
        }

        const existing = await tx.booking.findFirst({
          where: { eventId, userId, status: "CONFIRMED" },
        });
        if (existing) {
          throw ApiError.conflict(
            "You already have an active booking for this event",
          );
        }

        const booking = await tx.booking.create({
          data: { eventId, userId, quantity },
          select: BOOKING_SELECT,
        });

        await tx.$executeRaw`
          UPDATE events
          SET booked_count = booked_count + ${quantity}, updated_at = NOW()
          WHERE id = ${eventId}::uuid
        `;

        await tx.auditLog.create({
          data: {
            opType: "BOOK",
            eventId,
            userId,
            bookingId: booking.id,
            outcome: "SUCCESS",
            reason: `quantity=${quantity}`,
          },
        });

        logger.info({ eventId, userId, quantity, bookingId: booking.id }, "Booking created");
        return booking;
      });
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
   * Decrements booked_count by the booking's stored quantity.
   */
  async cancelBooking(eventId: string, userId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
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

        const booking = await tx.booking.findFirst({
          where: { eventId, userId, status: "CONFIRMED" },
        });
        if (!booking) {
          throw ApiError.notFound(
            "No active booking found for this event",
          );
        }

        const cancelled = await tx.booking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED" },
          select: BOOKING_SELECT,
        });

        await tx.$executeRaw`
          UPDATE events
          SET booked_count = booked_count - ${booking.quantity}, updated_at = NOW()
          WHERE id = ${eventId}::uuid
        `;

        await tx.auditLog.create({
          data: {
            opType: "CANCEL",
            eventId,
            userId,
            bookingId: booking.id,
            outcome: "SUCCESS",
            reason: `quantity=${booking.quantity}`,
          },
        });

        logger.info({ eventId, userId, quantity: booking.quantity, bookingId: booking.id }, "Booking cancelled");
        return cancelled;
      });
    } catch (err) {
      if (err instanceof ApiError) {
        await logAuditFailure("CANCEL", eventId, userId, err.message);
      }
      throw err;
    }
  },
};
