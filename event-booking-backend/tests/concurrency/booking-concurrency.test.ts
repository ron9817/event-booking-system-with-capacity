import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { cleanDatabase, seedTestEvent, testPrisma } from "../helpers/db.js";
import { randomUserId } from "../helpers/fixtures.js";
import { getRedisClient, isRedisEnabled } from "../../src/infra/redisClient.js";

beforeAll(async () => {
  await testPrisma.$connect();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe("Booking Concurrency", () => {
  it("should never exceed capacity when N users book simultaneously", async () => {
    const CAPACITY = 5;
    const CONCURRENT_USERS = 20;

    const event = await seedTestEvent({ capacity: CAPACITY });
    const userIds = Array.from({ length: CONCURRENT_USERS }, () => randomUserId());

    const results = await Promise.allSettled(
      userIds.map((userId) =>
        request(app)
          .post(`/api/events/${event.id}/bookings`)
          .set("x-user-id", userId),
      ),
    );

    const successes = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === 201,
    );
    const conflicts = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === 409,
    );

    expect(successes).toHaveLength(CAPACITY);
    expect(conflicts).toHaveLength(CONCURRENT_USERS - CAPACITY);

    const updatedEvent = await testPrisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(updatedEvent.bookedCount).toBe(CAPACITY);

    const bookingCount = await testPrisma.booking.count({
      where: { eventId: event.id, status: "CONFIRMED" },
    });
    expect(bookingCount).toBe(CAPACITY);

    if (isRedisEnabled()) {
      const client = await getRedisClient();
      if (client) {
        const cached = await client.get(`event:${event.id}:remaining`);
        if (cached != null) {
          expect(Number(cached)).toBe(0);
        }
      }
    }
  });

  it("should never let booked_count go below 0 with concurrent cancellations", async () => {
    const CAPACITY = 5;
    const event = await seedTestEvent({ capacity: CAPACITY });

    const userIds = Array.from({ length: CAPACITY }, () => randomUserId());
    for (const userId of userIds) {
      await request(app)
        .post(`/api/events/${event.id}/bookings`)
        .set("x-user-id", userId);
    }

    const midEvent = await testPrisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(midEvent.bookedCount).toBe(CAPACITY);

    const cancelResults = await Promise.allSettled(
      userIds.map((userId) =>
        request(app)
          .delete(`/api/events/${event.id}/bookings`)
          .set("x-user-id", userId),
      ),
    );

    const cancelSuccesses = cancelResults.filter(
      (r) => r.status === "fulfilled" && r.value.status === 200,
    );
    expect(cancelSuccesses).toHaveLength(CAPACITY);

    const finalEvent = await testPrisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(finalEvent.bookedCount).toBe(0);
  });

  it("should handle concurrent book and cancel on the same event without deadlocks", async () => {
    const CAPACITY = 10;
    const event = await seedTestEvent({ capacity: CAPACITY });

    const bookingUserIds = Array.from({ length: 5 }, () => randomUserId());
    for (const userId of bookingUserIds) {
      await request(app)
        .post(`/api/events/${event.id}/bookings`)
        .set("x-user-id", userId);
    }

    const newUserIds = Array.from({ length: 5 }, () => randomUserId());

    const mixedResults = await Promise.allSettled([
      ...bookingUserIds.map((userId) =>
        request(app)
          .delete(`/api/events/${event.id}/bookings`)
          .set("x-user-id", userId),
      ),
      ...newUserIds.map((userId) =>
        request(app)
          .post(`/api/events/${event.id}/bookings`)
          .set("x-user-id", userId),
      ),
    ]);

    const errors = mixedResults.filter((r) => r.status === "rejected");
    expect(errors).toHaveLength(0);

    const finalEvent = await testPrisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });
    const confirmedCount = await testPrisma.booking.count({
      where: { eventId: event.id, status: "CONFIRMED" },
    });

    expect(finalEvent.bookedCount).toBe(confirmedCount);
    expect(finalEvent.bookedCount).toBeGreaterThanOrEqual(0);
    expect(finalEvent.bookedCount).toBeLessThanOrEqual(CAPACITY);
  });

  it("should prevent the same user from double-booking under concurrency", async () => {
    const event = await seedTestEvent({ capacity: 100 });
    const userId = randomUserId();

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/events/${event.id}/bookings`)
          .set("x-user-id", userId),
      ),
    );

    const successes = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === 201,
    );
    expect(successes).toHaveLength(1);

    const bookingCount = await testPrisma.booking.count({
      where: { eventId: event.id, userId, status: "CONFIRMED" },
    });
    expect(bookingCount).toBe(1);
  });

  it("should produce accurate audit logs under concurrent load", async () => {
    const CAPACITY = 3;
    const CONCURRENT_USERS = 10;
    const event = await seedTestEvent({ capacity: CAPACITY });
    const userIds = Array.from({ length: CONCURRENT_USERS }, () => randomUserId());

    await Promise.allSettled(
      userIds.map((userId) =>
        request(app)
          .post(`/api/events/${event.id}/bookings`)
          .set("x-user-id", userId),
      ),
    );

    const successLogs = await testPrisma.auditLog.count({
      where: { eventId: event.id, opType: "BOOK", outcome: "SUCCESS" },
    });
    const failureLogs = await testPrisma.auditLog.count({
      where: { eventId: event.id, opType: "BOOK", outcome: "FAILURE" },
    });

    expect(successLogs).toBe(CAPACITY);
    expect(failureLogs).toBe(CONCURRENT_USERS - CAPACITY);
  });
});
