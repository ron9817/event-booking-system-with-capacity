import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { cleanDatabase, seedTestEvent, testPrisma } from "../helpers/db.js";
import { TEST_USER_ID, TEST_USER_ID_2 } from "../helpers/fixtures.js";

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

describe("GET /api/users/:userId/bookings", () => {
  it("returns empty list for user with no bookings", async () => {
    const res = await request(app).get(
      `/api/users/${TEST_USER_ID}/bookings`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it("returns user's bookings with event details nested", async () => {
    const event = await seedTestEvent({ name: "Concert" });

    await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const res = await request(app).get(
      `/api/users/${TEST_USER_ID}/bookings`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("CONFIRMED");
    expect(res.body.data[0].event).toBeDefined();
    expect(res.body.data[0].event.name).toBe("Concert");
    expect(res.body.data[0].event.id).toBe(event.id);
  });

  it("filters by CONFIRMED status", async () => {
    const event1 = await seedTestEvent({ name: "Event A" });
    const event2 = await seedTestEvent({ name: "Event B" });

    await request(app)
      .post(`/api/events/${event1.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);
    await request(app)
      .post(`/api/events/${event2.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    await request(app)
      .delete(`/api/events/${event1.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const res = await request(app).get(
      `/api/users/${TEST_USER_ID}/bookings?status=CONFIRMED`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("CONFIRMED");
    expect(res.body.data[0].event.name).toBe("Event B");
  });

  it("filters by CANCELLED status", async () => {
    const event = await seedTestEvent();

    await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);
    await request(app)
      .delete(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const res = await request(app).get(
      `/api/users/${TEST_USER_ID}/bookings?status=CANCELLED`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("CANCELLED");
  });

  it("supports pagination", async () => {
    for (let i = 0; i < 3; i++) {
      const event = await seedTestEvent({ name: `Event ${i}` });
      await request(app)
        .post(`/api/events/${event.id}/bookings`)
        .set("x-user-id", TEST_USER_ID);
    }

    const res = await request(app).get(
      `/api/users/${TEST_USER_ID}/bookings?page=1&limit=2`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const page2 = await request(app).get(
      `/api/users/${TEST_USER_ID}/bookings?page=2&limit=2`,
    );

    expect(page2.status).toBe(200);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta.page).toBe(2);
  });

  it("returns 400 for invalid userId UUID", async () => {
    const res = await request(app).get(
      "/api/users/not-a-uuid/bookings",
    );

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
  });

  it("does not return other user's bookings", async () => {
    const event = await seedTestEvent();

    await request(app)
      .post(`/api/events/${event.id}/bookings`)
      .set("x-user-id", TEST_USER_ID);

    const res = await request(app).get(
      `/api/users/${TEST_USER_ID_2}/bookings`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
