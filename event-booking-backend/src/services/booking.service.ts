import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../prisma.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import { waitlistService } from "./waitlist.service.js";
import type { UserBookingsQuery } from "../schemas/booking.schema.js";

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

export type BookEventResult =
  | { type: "confirmed"; data: Awaited<ReturnType<typeof prisma.booking.create>> }
  | { type: "waitlisted"; data: Awaited<ReturnType<typeof waitlistService.joinWaitlist>> };

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
   * Books a spot or falls back to the waitlist when the event is full.
   *
   * Lock ordering: events row → bookings/waitlist check → insert.
   * Both bookEvent and cancelBooking lock the events row FIRST
   * to guarantee a consistent ordering and prevent deadlocks.
   */
  async bookEvent(eventId: string, userId: string): Promise<BookEventResult> {
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

        if (event.booked_count >= event.capacity) {
          const waitlistEntry = await waitlistService.joinWaitlist(tx, eventId, userId);
          return { type: "waitlisted" as const, data: waitlistEntry };
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
          data: { eventId, userId },
          select: BOOKING_SELECT,
        });

        await tx.$executeRaw`
          UPDATE events
          SET booked_count = booked_count + 1, updated_at = NOW()
          WHERE id = ${eventId}::uuid
        `;

        await tx.auditLog.create({
          data: {
            opType: "BOOK",
            eventId,
            userId,
            bookingId: booking.id,
            outcome: "SUCCESS",
          },
        });

        return { type: "confirmed" as const, data: booking };
      });
    } catch (err) {
      if (err instanceof ApiError) {
        await logAuditFailure("BOOK", eventId, userId, err.message);
      }
      throw err;
    }
  },

  /**
   * Cancels an existing confirmed booking and enqueues an allocation
   * outbox event so the worker can auto-promote from the waitlist.
   *
   * Lock ordering: events row → bookings update (same as bookEvent).
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
          SET booked_count = booked_count - 1, updated_at = NOW()
          WHERE id = ${eventId}::uuid
        `;

        await tx.auditLog.create({
          data: {
            opType: "CANCEL",
            eventId,
            userId,
            bookingId: booking.id,
            outcome: "SUCCESS",
          },
        });

        // Transactional outbox: enqueue allocation task in the same tx
        await tx.allocationOutbox.create({
          data: { eventId, reason: "CANCELLED" },
        });

        logger.info(
          { eventId, userId, bookingId: booking.id },
          "Booking cancelled, allocation outbox event created",
        );

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
