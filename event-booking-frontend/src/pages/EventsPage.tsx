import { useMemo, useState } from "react";
import { CalendarDays, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { useUserBookings } from "@/hooks/useBookings";
import { getUserId } from "@/lib/userId";
import EventCard from "@/components/EventCard";
import EventCardSkeleton from "@/components/EventCardSkeleton";
import EmptyState from "@/components/EmptyState";

const PAGE_SIZE = 12;

export function Component() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useEvents({
    page,
    limit: PAGE_SIZE,
  });

  const userId = getUserId();
  const { data: userBookings } = useUserBookings(userId, {
    limit: 100,
    status: "CONFIRMED",
  });

  const bookedEventIds = useMemo(
    () => new Set(userBookings?.data?.map((b) => b.event?.id ?? b.eventId) ?? []),
    [userBookings],
  );

  const events = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upcoming Events</h1>
        {meta && (
          <p className="mt-1 text-sm text-gray-500">
            {meta.total} event{meta.total !== 1 ? "s" : ""} available
          </p>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Failed to load events
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-6 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-primary-700 hover:to-indigo-700"
          >
            Try Again
          </button>
        </div>
      )}

      {!isLoading && !isError && events.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming events"
          description="Check back later for new events to book."
        />
      )}

      {!isLoading && !isError && events.length > 0 && (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isBooked={bookedEventIds.has(event.id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="px-3 text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
