-- CreateEnum
CREATE TYPE "waitlist_status" AS ENUM ('WAITING', 'ALLOCATED', 'REMOVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "allocation_outbox_reason" AS ENUM ('CANCELLED', 'CAPACITY_INCREASED');

-- CreateEnum
CREATE TYPE "allocation_outbox_status" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateSequence (global monotonic ordering for FIFO fairness)
CREATE SEQUENCE waitlist_position_seq;

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "position_token" BIGINT NOT NULL DEFAULT nextval('waitlist_position_seq'),
    "status" "waitlist_status" NOT NULL DEFAULT 'WAITING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocated_at" TIMESTAMPTZ,
    "removed_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocation_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "reason" "allocation_outbox_reason" NOT NULL,
    "status" "allocation_outbox_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allocation_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: fast lookup for next waitlist candidate per event
CREATE INDEX "idx_waitlist_next_candidate" ON "waitlist_entries"("event_id", "status", "position_token");

-- CreateIndex: user lookup
CREATE INDEX "idx_waitlist_user_id" ON "waitlist_entries"("user_id");

-- CreateIndex: outbox worker polling
CREATE INDEX "idx_outbox_pending" ON "allocation_outbox"("status", "next_attempt_at");

-- Unique active waitlist entry per user/event (prevents duplicate WAITING entries)
CREATE UNIQUE INDEX "unique_active_waitlist"
ON "waitlist_entries" ("event_id", "user_id")
WHERE "status" = 'WAITING';

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_outbox" ADD CONSTRAINT "allocation_outbox_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
