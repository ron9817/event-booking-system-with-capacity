import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { cleanDatabase, seedTestEvent, testPrisma } from "../helpers/db.js";
import { NON_EXISTENT_ID } from "../helpers/fixtures.js";

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

describe("GET /api/events", () => {
  it("returns a paginated list of active future events", async () => {
    await seedTestEvent({ name: "Future Event 1" });
    await seedTestEvent({ name: "Future Event 2" });

    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
  });

  it("respects page and limit query params", async () => {
    for (let i = 0; i < 5; i++) {
      await seedTestEvent({ name: `Event ${i}` });
    }

    const res = await request(app).get("/api/events?page=2&limit=2");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
  });

  it("returns empty array when no events exist", async () => {
    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it("excludes inactive events", async () => {
    await seedTestEvent({ name: "Active", isActive: true });
    await seedTestEvent({ name: "Inactive", isActive: false });

    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Active");
  });

  it("excludes past events", async () => {
    await seedTestEvent({ name: "Future" });
    await seedTestEvent({
      name: "Past",
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Future");
  });

  it("includes availableSpots in each event", async () => {
    await seedTestEvent({ capacity: 10, bookedCount: 3 });

    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(res.body.data[0].availableSpots).toBe(7);
  });

  it("returns 400 for invalid page param (page=0)", async () => {
    const res = await request(app).get("/api/events?page=0");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
  });

  it("returns 400 for invalid page param (page=-1)", async () => {
    const res = await request(app).get("/api/events?page=-1");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
  });
});

describe("GET /api/events/:id", () => {
  it("returns event details with availableSpots", async () => {
    const event = await seedTestEvent({ capacity: 20, bookedCount: 5 });

    const res = await request(app).get(`/api/events/${event.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(event.id);
    expect(res.body.data.name).toBe("Test Event");
    expect(res.body.data.availableSpots).toBe(15);
  });

  it("returns 404 for non-existent event", async () => {
    const res = await request(app).get(`/api/events/${NON_EXISTENT_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await request(app).get("/api/events/not-a-uuid");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
  });
});
