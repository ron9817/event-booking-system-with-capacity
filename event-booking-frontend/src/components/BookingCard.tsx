import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import type { Booking } from "@/types";
import StatusBadge from "./StatusBadge";
import TypeBadge from "./TypeBadge";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface BookingCardProps {
  booking: Booking;
  onCancel?: (eventId: string) => void;
  cancelling?: boolean;
}

export default function BookingCard({
  booking,
  onCancel,
  cancelling = false,
}: BookingCardProps) {
  const event = booking.event;
  const isCancelled = booking.status === "CANCELLED";

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all ${isCancelled ? "opacity-60" : ""}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {event?.type && <TypeBadge type={event.type} />}
              <StatusBadge status={booking.status} />
            </div>

            {event ? (
              <Link
                to={`/events/${event.id}`}
                className="mt-2 block text-lg font-semibold text-gray-900 transition-colors hover:text-primary-600"
              >
                {event.name}
              </Link>
            ) : (
              <p className="mt-2 text-lg font-semibold text-gray-900">
                Unknown Event
              </p>
            )}

            <div className="mt-2 space-y-1">
              {event?.date && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>
                    {formatDate(event.date)} &middot; {formatTime(event.date)}
                  </span>
                </div>
              )}
              {event?.venue && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{event.venue}</span>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <span>Booked on {formatDate(booking.createdAt)}</span>
            </div>
          </div>

          {!isCancelled && onCancel && event && (
            <button
              onClick={() => onCancel(event.id)}
              disabled={cancelling}
              className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
