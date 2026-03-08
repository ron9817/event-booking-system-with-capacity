import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding events...");

  await prisma.event.createMany({
    data: [
      {
        name: "Tech Conference 2026",
        description: "Annual technology conference featuring AI, cloud, and web development talks.",
        date: new Date("2026-04-15T09:00:00Z"),
        venue: "Convention Center, San Francisco",
        type: "rsvp",
        category: "technology",
        duration: "8 hours",
        capacity: 500,
        bookedCount: 0,
        isActive: true,
        createdBy: "system",
      },
      {
        name: "Startup Pitch Night",
        description: "Watch 10 startups pitch their ideas to a panel of investors.",
        date: new Date("2026-04-20T18:00:00Z"),
        venue: "Innovation Hub, Austin",
        type: "rsvp",
        category: "business",
        duration: "3 hours",
        capacity: 150,
        bookedCount: 0,
        isActive: true,
        createdBy: "system",
      },
      {
        name: "React Workshop",
        description: "Hands-on workshop covering React 19, Server Components, and modern patterns.",
        date: new Date("2026-05-05T10:00:00Z"),
        venue: "TechSpace, New York",
        type: "rsvp",
        category: "technology",
        duration: "4 hours",
        capacity: 40,
        bookedCount: 0,
        isActive: true,
        createdBy: "system",
      },
      {
        name: "Jazz in the Park",
        description: "Open-air jazz concert featuring local and international artists.",
        date: new Date("2026-05-10T17:00:00Z"),
        venue: "Central Park, New York",
        type: "rsvp",
        category: "music",
        duration: "5 hours",
        capacity: 2000,
        bookedCount: 0,
        isActive: true,
        createdBy: "system",
      },
      {
        name: "DevOps Meetup",
        description: "Monthly meetup discussing CI/CD pipelines, Kubernetes, and infrastructure as code.",
        date: new Date("2026-05-15T18:30:00Z"),
        venue: "WeWork, Seattle",
        type: "rsvp",
        category: "technology",
        duration: "2 hours",
        capacity: 80,
        bookedCount: 0,
        isActive: true,
        createdBy: "system",
      },
      {
        name: "Photography Masterclass",
        description: "Learn portrait and landscape photography from award-winning photographers.",
        date: new Date("2026-06-01T09:00:00Z"),
        venue: "Art Gallery, Chicago",
        type: "rsvp",
        category: "arts",
        duration: "6 hours",
        capacity: 25,
        bookedCount: 0,
        isActive: true,
        createdBy: "system",
      },
      {
        name: "Food & Wine Festival",
        description: "Taste dishes from top chefs paired with wines from local vineyards.",
        date: new Date("2026-06-20T12:00:00Z"),
        venue: "Waterfront Park, Portland",
        type: "rsvp",
        category: "food",
        duration: "7 hours",
        capacity: 1000,
        bookedCount: 0,
        isActive: true,
        createdBy: "system",
      },
      {
        name: "Yoga & Wellness Retreat",
        description: "A full-day retreat with yoga sessions, meditation, and wellness workshops.",
        date: new Date("2026-07-04T07:00:00Z"),
        venue: "Lakeside Resort, Denver",
        type: "rsvp",
        category: "health",
        duration: "10 hours",
        capacity: 60,
        bookedCount: 0,
        isActive: true,
        createdBy: "system",
      },
    ],
  });

  const count = await prisma.event.count();
  console.log(`Seeded ${count} events.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
