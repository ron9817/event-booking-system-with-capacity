import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { cleanDatabase, seedTestEvent, testPrisma } from "../helpers/db.js";
import {
  TEST_USER_ID,
  TEST_USER_ID_2,
  NON_EXISTENT_ID,
} from "../helpers/fixtures.js";
import { getRedisClient, isRedisEnabled } from "../../src/infra/redisClient.js";

beforeAll(async () => {
  await testPrisma.$connect();
});

afterAll(async () => {
  await cleanDatabase();
  await testPrisma.$disconnect();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe("POST /api/events/:eventId/bookings", () => {
  it("creates a booking successfully", async () => {
    const event = await seedTestEvent();

    const res = await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      eventId: event.id,
      userId: TEST_USER_ID,
      status: "CONFIRMED",
    });
    expect(res.body.data.id).toBeDefined();

    if (isRedisEnabled()) {
      const client = await getRedisClient();
      if (client) {
        const key = `event:${event.id}:remaining`;
        const cached = await client.get(key);
        if (cached != null) {
          expect(Number(cached)).toBe(event.capacity - 1);
        }
      }
    }
  });

  it("returns 400 when x-user-id header is missing", async () => {
    const event = await seedTestEvent();

    const res = await request(app).post(`/api/events/${event.id}/bookings`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/x-user-id/i);
  });

  it("returns 400 when x-user-id is not a valid UUID", async () => {
    const event = await seedTestEvent();

    const res = await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", "not-a-uuid");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 when event does not exist", async () => {
    const res = await request(app)
      .post(`/api/events/${NON_EXISTENT_ID}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when event is inactive", async () => {
    const event = await seedTestEvent({ isActive: false });

    const res = await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/active/i);
  });

  it("returns 400 when event is in the past", async () => {
    const event = await seedTestEvent({
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/passed/i);
  });

  it("returns 409 when event is fully booked", async () => {
    const event = await seedTestEvent({ capacity: 1, bookedCount: 1 });

    const res = await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/fully booked/i);
  });

  it("still allows booking when Redis says 0 remaining but DB has capacity", async () => {
    const event = await seedTestEvent({ capacity: 2, bookedCount: 0 });

    if (isRedisEnabled()) {
      const client = await getRedisClient();
      if (client) {
        await client.set(`event:${event.id}:remaining`, "0");
      }
    }

    const res = await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID_2);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("returns 409 when user already has an active booking", async () => {
    const event = await seedTestEvent();

    await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const res = await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already/i);
  });

  it("increments bookedCount on the event after successful booking", async () => {
    const event = await seedTestEvent({ bookedCount: 0 });

    await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const updated = await testPrisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(updated.bookedCount).toBe(1);
  });
});

describe("DELETE /api/events/:eventId/bookings", () => {
  it("cancels a booking successfully", async () => {
    const event = await seedTestEvent();
    await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const res = await request(app)
      .delete(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("CANCELLED");
  });

  it("returns 404 when event does not exist", async () => {
    const res = await request(app)
      .delete(`/api/events/${NON_EXISTENT_ID}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 when no active booking exists", async () => {
    const event = await seedTestEvent();

    const res = await request(app)
      .delete(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("decrements bookedCount after cancellation", async () => {
    const event = await seedTestEvent({ bookedCount: 0 });

    await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const afterBook = await testPrisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(afterBook.bookedCount).toBe(1);

    await request(app)
      .delete(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const afterCancel = await testPrisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(afterCancel.bookedCount).toBe(0);
  });
});

describe("Book → Cancel → Re-book", () => {
  it("allows re-booking after cancellation", async () => {
    const event = await seedTestEvent();

    const bookRes = await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);
    expect(bookRes.status).toBe(201);

    const cancelRes = await request(app)
      .delete(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);
    expect(cancelRes.status).toBe(200);

    const rebookRes = await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);
    expect(rebookRes.status).toBe(201);
    expect(rebookRes.body.data.status).toBe("CONFIRMED");
  });
});

describe("Audit logs", () => {
  it("creates a SUCCESS audit log on successful booking", async () => {
    const event = await seedTestEvent();

    await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const logs = await testPrisma.auditLog.findMany({
      where: { eventId: event.id, userId: TEST_USER_ID, opType: "BOOK" },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].outcome).toBe("SUCCESS");
    expect(logs[0].bookingId).toBeDefined();
  });

  it("creates a SUCCESS audit log on successful cancellation", async () => {
    const event = await seedTestEvent();

    await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    await request(app)
      .delete(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const logs = await testPrisma.auditLog.findMany({
      where: { eventId: event.id, userId: TEST_USER_ID, opType: "CANCEL" },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].outcome).toBe("SUCCESS");
  });

  it("creates a FAILURE audit log when booking fails due to business rule", async () => {
    const event = await seedTestEvent({ capacity: 1, bookedCount: 1 });

    await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const logs = await testPrisma.auditLog.findMany({
      where: {
        eventId: event.id,
        userId: TEST_USER_ID,
        opType: "BOOK",
        outcome: "FAILURE",
      },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].reason).toMatch(/fully booked/i);
  });
});
