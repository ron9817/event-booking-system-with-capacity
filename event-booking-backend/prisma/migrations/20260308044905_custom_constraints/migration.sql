ALTER TABLE events ADD CONSTRAINT capacity_safety CHECK (booked_count <= capacity);

CREATE INDEX idx_events_upcoming_partial ON events (date) WHERE is_active = TRUE;

CREATE UNIQUE INDEX "unique_active_booking"
ON "bookings" ("event_id", "user_id")
WHERE "status" = 'CONFIRMED';