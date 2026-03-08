import { Link } from "react-router-dom";
import { CalendarDays, MapPin, CircleCheck, Ban } from "lucide-react";
import type { Event } from "@/types";
import TypeBadge, { getBorderColor } from "./TypeBadge";
import CapacityBar from "./CapacityBar";

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface EventCardProps {
  event: Event;
  isBooked?: boolean;
}

export default function EventCard({ event, isBooked = false }: EventCardProps) {
  const borderColor = getBorderColor(event.type);
  const isSoldOut = event.availableSpots === 0;

  return (
    <Link
      to={`/events/${event.id}`}
      className={`group block overflow-hidden rounded-xl border border-l-4 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${borderColor} ${isSoldOut && !isBooked ? "opacity-75" : ""}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <TypeBadge type={event.type} />
          {isSoldOut && !isBooked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-500/20">
              <Ban className="h-3 w-3" />
              Sold Out
            </span>
          ) : event.category ? (
            <span className="text-xs font-medium text-gray-400">
              {event.category}
            </span>
          ) : null}
        </div>

        <h3 className="mt-3 text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
          {event.name}
        </h3>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
            <span>
              {formatEventDate(event.date)} &middot; {formatEventTime(event.date)}
            </span>
          </div>
          {event.venue && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate">{event.venue}</span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <CapacityBar booked={event.bookedCount} capacity={event.capacity} />
        </div>

        {isBooked && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <CircleCheck className="h-3.5 w-3.5" />
            Booked
          </div>
        )}
      </div>
    </Link>
  );
}
