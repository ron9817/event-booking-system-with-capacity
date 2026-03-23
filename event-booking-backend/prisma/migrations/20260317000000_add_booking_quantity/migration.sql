-- AlterTable: add quantity column with default 1 for backfill safety
ALTER TABLE "bookings" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

-- Booking quantity must be at least 1
ALTER TABLE "bookings" ADD CONSTRAINT "booking_quantity_positive" CHECK ("quantity" > 0);

-- booked_count must never go negative
ALTER TABLE "events" ADD CONSTRAINT "booked_count_non_negative" CHECK ("booked_count" >= 0);
