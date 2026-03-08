import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../prisma.js";
import { ApiError } from "../utils/ApiError.js";
import type { EventListQuery } from "../schemas/event.schema.js";

const eventSelect = {
  id: true,
  name: true,
  description: true,
  date: true,
  venue: true,
  type: true,
  category: true,
  duration: true,
  capacity: true,
  bookedCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EventSelect;

function withAvailableSpots<T extends { capacity: number; bookedCount: number }>(
  event: T,
) {
  return { ...event, availableSpots: event.capacity - event.bookedCount };
}

export const eventService = {
  async list(query: EventListQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {
      isActive: true,
      date: { gte: new Date() },
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        select: eventSelect,
        orderBy: { date: "asc" },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return {
      data: events.map(withAvailableSpots),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      select: eventSelect,
    });

    if (!event) {
      throw ApiError.notFound(`Event with id '${id}' not found`);
    }

    return withAvailableSpots(event);
  },
};
