import { PrismaClient } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const testPrisma = new PrismaClient({ adapter });

export async function cleanDatabase() {
  await testPrisma.$executeRaw`DELETE FROM audit_logs`;
  await testPrisma.$executeRaw`DELETE FROM bookings`;
  await testPrisma.$executeRaw`DELETE FROM events`;
}

export async function seedTestEvent(overrides: Record<string, unknown> = {}) {
  const defaults = {
    name: "Test Event",
    description: "A test event",
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    venue: "Test Venue",
    type: "rsvp",
    category: "technology",
    duration: "2 hours",
    capacity: 10,
    bookedCount: 0,
    isActive: true,
    createdBy: "test",
  };
  return testPrisma.event.create({ data: { ...defaults, ...overrides } });
}

export { testPrisma };
