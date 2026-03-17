import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../prisma.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import type { WaitlistListQuery } from "../schemas/waitlist.schema.js";

interface LockedEventRow {
  id: string;
  capacity: number;
  booked_count: number;
  is_active: boolean;
  date: Date;
}

const WAITLIST_SELECT = {
  id: true,
  eventId: true,
  userId: true,
  status: true,
  positionToken: true,
  createdAt: true,
  allocatedAt: true,
  removedAt: true,
} as const;

function serializeEntry(entry: { positionToken: bigint; [key: string]: unknown }) {
  return { ...entry, positionToken: Number(entry.positionToken) };
}

export const waitlistService = {
  /**
   * Adds a user to the waitlist for a full event.
   * Called within the booking flow when the event is at capacity.
   *
   * Lock ordering: events row (already locked by caller) → waitlist check → insert.
   */
  async joinWaitlist(
    tx: Prisma.TransactionClient,
    eventId: string,
    userId: string,
  ) {
    const existingBooking = await tx.booking.findFirst({
      where: { eventId, userId, status: "CONFIRMED" },
    });
    if (existingBooking) {
      throw ApiError.conflict("You already have an active booking for this event");
    }

    const existingWaitlist = await tx.waitlistEntry.findFirst({
      where: { eventId, userId, status: "WAITING" },
    });
    if (existingWaitlist) {
      throw ApiError.conflict("You are already on the waitlist for this event");
    }

    const entry = await tx.waitlistEntry.create({
      data: { eventId, userId },
      select: WAITLIST_SELECT,
    });

    const position = await tx.waitlistEntry.count({
      where: {
        eventId,
        status: "WAITING",
        positionToken: { lte: entry.positionToken },
      },
    });

    await tx.auditLog.create({
      data: {
        opType: "WAITLIST_JOIN",
        eventId,
        userId,
        outcome: "SUCCESS",
      },
    });

    logger.info(
      { eventId, userId, waitlistEntryId: entry.id, position },
      "User joined waitlist",
    );

    return { ...serializeEntry(entry), queuePosition: position };
  },

  async getMyPosition(eventId: string, userId: string) {
    const entry = await prisma.waitlistEntry.findFirst({
      where: { eventId, userId, status: "WAITING" },
      select: WAITLIST_SELECT,
    });

    if (!entry) {
      throw ApiError.notFound("You are not on the waitlist for this event");
    }

    const position = await prisma.waitlistEntry.count({
      where: {
        eventId,
        status: "WAITING",
        positionToken: { lte: entry.positionToken },
      },
    });

    return { ...serializeEntry(entry), queuePosition: position };
  },

  async leaveWaitlist(eventId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<LockedEventRow[]>`
        SELECT id FROM events WHERE id = ${eventId}::uuid FOR UPDATE
      `;
      if (!rows[0]) {
        throw ApiError.notFound("Event not found");
      }

      const entry = await tx.waitlistEntry.findFirst({
        where: { eventId, userId, status: "WAITING" },
      });
      if (!entry) {
        throw ApiError.notFound("You are not on the waitlist for this event");
      }

      const removed = await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: "REMOVED", removedAt: new Date(), version: { increment: 1 } },
        select: WAITLIST_SELECT,
      });

      await tx.auditLog.create({
        data: {
          opType: "WAITLIST_LEAVE",
          eventId,
          userId,
          outcome: "SUCCESS",
        },
      });

      logger.info({ eventId, userId, waitlistEntryId: entry.id }, "User left waitlist");

      return serializeEntry(removed);
    });
  },

  async listForEvent(eventId: string, query: WaitlistListQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.WaitlistEntryWhereInput = {
      eventId,
      status: "WAITING",
    };

    const [entries, total] = await Promise.all([
      prisma.waitlistEntry.findMany({
        where,
        select: WAITLIST_SELECT,
        orderBy: { positionToken: "asc" },
        skip,
        take: limit,
      }),
      prisma.waitlistEntry.count({ where }),
    ]);

    return {
      data: entries.map((e, i) => ({
        ...serializeEntry(e),
        queuePosition: skip + i + 1,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
};
