import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const EVENT_IDS = {
  techConf: "10000000-0000-4000-8000-000000000001",
  pitchNight: "10000000-0000-4000-8000-000000000002",
  reactWorkshop: "10000000-0000-4000-8000-000000000003",
  jazzPark: "10000000-0000-4000-8000-000000000004",
  devopsMeetup: "10000000-0000-4000-8000-000000000005",
  photoMaster: "10000000-0000-4000-8000-000000000006",
  foodWine: "10000000-0000-4000-8000-000000000007",
  yogaRetreat: "10000000-0000-4000-8000-000000000008",
  aiSummit: "10000000-0000-4000-8000-000000000009",
  blockchain: "10000000-0000-4000-8000-00000000000a",
} as const;

function userUuid(n: number): string {
  return `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

async function main() {
  console.log("Cleaning existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.event.deleteMany();

  console.log("Seeding events...");

  await prisma.event.createMany({
    data: [
      {
        id: EVENT_IDS.techConf,
        name: "Tech Conference 2026",
        description:
          "Annual technology conference featuring AI, cloud, and web development talks.",
        date: new Date("2026-04-15T09:00:00Z"),
        venue: "Convention Center, San Francisco",
        type: "rsvp",
        category: "technology",
        duration: "8 hours",
        capacity: 500,
        bookedCount: 498,
        isActive: true,
        createdBy: "system",
      },
      {
        id: EVENT_IDS.pitchNight,
        name: "Startup Pitch Night",
        description:
          "Watch 10 startups pitch their ideas to a panel of investors.",
        date: new Date("2026-04-20T18:00:00Z"),
        venue: "Innovation Hub, Austin",
        type: "rsvp",
        category: "business",
        duration: "3 hours",
        capacity: 150,
        bookedCount: 150,
        isActive: true,
        createdBy: "system",
      },
      {
        id: EVENT_IDS.reactWorkshop,
        name: "React Workshop",
        description:
          "Hands-on workshop covering React 19, Server Components, and modern patterns.",
        date: new Date("2026-05-05T10:00:00Z"),
        venue: "TechSpace, New York",
        type: "rsvp",
        category: "technology",
        duration: "4 hours",
        capacity: 40,
        bookedCount: 12,
        isActive: true,
        createdBy: "system",
      },
      {
        id: EVENT_IDS.jazzPark,
        name: "Jazz in the Park",
        description:
          "Open-air jazz concert featuring local and international artists.",
        date: new Date("2026-05-10T17:00:00Z"),
        venue: "Central Park, New York",
        type: "rsvp",
        category: "music",
        duration: "5 hours",
        capacity: 2000,
        bookedCount: 867,
        isActive: true,
        createdBy: "system",
      },
      {
        id: EVENT_IDS.devopsMeetup,
        name: "DevOps Meetup",
        description:
          "Monthly meetup discussing CI/CD pipelines, Kubernetes, and infrastructure as code.",
        date: new Date("2026-05-15T18:30:00Z"),
        venue: "WeWork, Seattle",
        type: "rsvp",
        category: "technology",
        duration: "2 hours",
        capacity: 80,
        bookedCount: 79,
        isActive: true,
        createdBy: "system",
      },
      {
        id: EVENT_IDS.photoMaster,
        name: "Photography Masterclass",
        description:
          "Learn portrait and landscape photography from award-winning photographers.",
        date: new Date("2026-06-01T09:00:00Z"),
        venue: "Art Gallery, Chicago",
        type: "rsvp",
        category: "arts",
        duration: "6 hours",
        capacity: 25,
        bookedCount: 25,
        isActive: true,
        createdBy: "system",
      },
      {
        id: EVENT_IDS.foodWine,
        name: "Food & Wine Festival",
        description:
          "Taste dishes from top chefs paired with wines from local vineyards.",
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
        id: EVENT_IDS.yogaRetreat,
        name: "Yoga & Wellness Retreat",
        description:
          "A full-day retreat with yoga sessions, meditation, and wellness workshops.",
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
      {
        id: EVENT_IDS.aiSummit,
        name: "AI Summit 2025",
        description:
          "The premier AI conference with keynotes, workshops, and networking.",
        date: new Date("2025-11-20T09:00:00Z"),
        venue: "Moscone Center, San Francisco",
        type: "rsvp",
        category: "technology",
        duration: "8 hours",
        capacity: 200,
        bookedCount: 195,
        isActive: true,
        createdBy: "system",
      },
      {
        id: EVENT_IDS.blockchain,
        name: "Blockchain Workshop",
        description:
          "Deep dive into blockchain fundamentals, smart contracts, and DeFi.",
        date: new Date("2026-05-25T10:00:00Z"),
        venue: "Digital Lab, Miami",
        type: "rsvp",
        category: "technology",
        duration: "5 hours",
        capacity: 50,
        bookedCount: 30,
        isActive: false,
        createdBy: "system",
      },
    ],
  });

  console.log("Seeding bookings...");

  const bookings: {
    eventId: string;
    userId: string;
    status: "CONFIRMED" | "CANCELLED";
  }[] = [
    // Tech Conference – 8 sample confirmed bookings (498 total via bookedCount)
    ...range(1, 8).map((i) => confirmed(EVENT_IDS.techConf, userUuid(i))),

    // Startup Pitch Night – 6 confirmed + 2 cancelled
    ...range(20, 25).map((i) => confirmed(EVENT_IDS.pitchNight, userUuid(i))),
    cancelled(EVENT_IDS.pitchNight, userUuid(26)),
    cancelled(EVENT_IDS.pitchNight, userUuid(27)),

    // React Workshop – 8 confirmed + 4 cancelled (shows booking churn)
    ...range(40, 47).map((i) => confirmed(EVENT_IDS.reactWorkshop, userUuid(i))),
    ...range(48, 51).map((i) => cancelled(EVENT_IDS.reactWorkshop, userUuid(i))),

    // Jazz in the Park – 6 confirmed
    ...range(60, 65).map((i) => confirmed(EVENT_IDS.jazzPark, userUuid(i))),

    // DevOps Meetup – 5 confirmed + 1 cancelled
    ...range(80, 84).map((i) => confirmed(EVENT_IDS.devopsMeetup, userUuid(i))),
    cancelled(EVENT_IDS.devopsMeetup, userUuid(85)),

    // Photography Masterclass – 5 confirmed (sold out)
    ...range(100, 104).map((i) => confirmed(EVENT_IDS.photoMaster, userUuid(i))),

    // AI Summit (past) – 5 confirmed + 2 cancelled
    ...range(120, 124).map((i) => confirmed(EVENT_IDS.aiSummit, userUuid(i))),
    cancelled(EVENT_IDS.aiSummit, userUuid(125)),
    cancelled(EVENT_IDS.aiSummit, userUuid(126)),

    // Blockchain Workshop (inactive) – 4 confirmed + 1 cancelled
    ...range(140, 143).map((i) => confirmed(EVENT_IDS.blockchain, userUuid(i))),
    cancelled(EVENT_IDS.blockchain, userUuid(144)),
  ];

  await prisma.booking.createMany({ data: bookings });

  console.log("Seeding audit logs...");

  const auditLogs = bookings.flatMap((b) => {
    if (b.status === "CANCELLED") {
      return [
        { opType: "BOOK", eventId: b.eventId, userId: b.userId, outcome: "SUCCESS" },
        { opType: "CANCEL", eventId: b.eventId, userId: b.userId, outcome: "SUCCESS" },
      ];
    }
    return [{ opType: "BOOK", eventId: b.eventId, userId: b.userId, outcome: "SUCCESS" }];
  });

  await prisma.auditLog.createMany({ data: auditLogs });

  const eventCount = await prisma.event.count();
  const bookingCount = await prisma.booking.count();
  const auditCount = await prisma.auditLog.count();
  console.log(
    `Seeded ${eventCount} events, ${bookingCount} bookings, ${auditCount} audit logs.`,
  );
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function confirmed(eventId: string, userId: string) {
  return { eventId, userId, status: "CONFIRMED" as const };
}

function cancelled(eventId: string, userId: string) {
  return { eventId, userId, status: "CANCELLED" as const };
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
