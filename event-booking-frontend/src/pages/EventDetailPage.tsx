import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Clock,
  Tag,
  AlertCircle,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useEventDetail } from "@/hooks/useEvents";
import { useBookEvent, useCancelBooking, useUserBookings } from "@/hooks/useBookings";
import { getUserId } from "@/lib/userId";
import { ApiError } from "@/lib/ApiError";
import TypeBadge, { getBorderColor } from "@/components/TypeBadge";
import CapacityBar from "@/components/CapacityBar";
import ConfirmModal from "@/components/ConfirmModal";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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

export function Component() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  } = useEventDetail(id!);
  const bookEvent = useBookEvent();
  const cancelBooking = useCancelBooking();

  const userId = getUserId();
  const { data: userBookings } = useUserBookings(userId, { limit: 100 });

  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const event = data?.data;

  const existingBooking = userBookings?.data?.find(
    (b) => (b.event?.id ?? b.eventId) === id && b.status === "CONFIRMED",
  );
  const isAlreadyBooked = !!existingBooking;
  const isSoldOut = event ? event.availableSpots === 0 : false;

  function handleBook() {
    if (!id) return;
    bookEvent.mutate(id, {
      onSuccess: () => {
        setShowConfirm(false);
        toast.success("Booking confirmed! You're all set.");
      },
      onError: (err) => {
        setShowConfirm(false);
        if (err instanceof ApiError) {
          if (err.isNotFound) {
            toast.error("This event no longer exists.");
            navigate("/");
            return;
          }
          if (err.isConflict && err.message.includes("fully booked")) {
            toast.error("This event just sold out.");
            refetch();
            return;
          }
          if (err.isConflict && err.message.includes("already have")) {
            toast.info("You already have a booking for this event.");
            refetch();
            return;
          }
          if (err.isRateLimited) {
            toast.warning("Too many requests. Please wait a moment and try again.");
            return;
          }
        }
        toast.error(
          err instanceof Error ? err.message : "Failed to book event.",
        );
      },
    });
  }

  function handleCancel() {
    if (!id) return;
    cancelBooking.mutate(id, {
      onSuccess: () => {
        setShowCancelConfirm(false);
        toast.success("Booking cancelled successfully.");
      },
      onError: (err) => {
        setShowCancelConfirm(false);
        if (err instanceof ApiError) {
          if (err.isNotFound) {
            toast.info("Booking was already cancelled.");
            refetch();
            return;
          }
          if (err.isRateLimited) {
            toast.warning("Too many requests. Please wait a moment and try again.");
            return;
          }
        }
        toast.error(
          err instanceof Error ? err.message : "Failed to cancel booking.",
        );
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          Event not found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {error instanceof Error
            ? error.message
            : "This event may have been removed or doesn't exist."}
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/"
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Back to Events
          </Link>
          <button
            onClick={() => refetch()}
            className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-primary-700 hover:to-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const borderColor = getBorderColor(event.type);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div
        className={`overflow-hidden rounded-xl border border-l-4 bg-white shadow-sm ${borderColor}`}
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={event.type} />
            {event.category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                <Tag className="h-3 w-3" />
                {event.category}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            {event.name}
          </h1>

          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <CalendarDays className="h-5 w-5 shrink-0 text-gray-400" />
              <div>
                <p className="font-medium">{formatDate(event.date)}</p>
                <p className="text-gray-400">{formatTime(event.date)}</p>
              </div>
            </div>

            {event.venue && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="h-5 w-5 shrink-0 text-gray-400" />
                <span>{event.venue}</span>
              </div>
            )}

            {event.duration && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Clock className="h-5 w-5 shrink-0 text-gray-400" />
                <span>{event.duration}</span>
              </div>
            )}
          </div>

          {event.description && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <h2 className="text-sm font-semibold text-gray-900">About</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}

          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-gray-700">
                Capacity
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                {event.bookedCount} / {event.capacity}
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  aria-label="Refresh capacity"
                  className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                </button>
              </span>
            </div>
            <CapacityBar
              booked={event.bookedCount}
              capacity={event.capacity}
              size="md"
            />
            {dataUpdatedAt > 0 && (
              <p className="mt-1.5 text-[11px] text-gray-400">
                Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="mt-6">
            {isAlreadyBooked ? (
              <div key="booked" className="animate-in space-y-3">
                <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <Check className="h-4 w-4" />
                  You're booked for this event
                </div>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full rounded-xl border border-red-200 bg-white px-6 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Cancel Booking
                </button>
              </div>
            ) : isSoldOut ? (
              <button
                key="soldout"
                disabled
                className="animate-in w-full rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-400"
              >
                Sold Out
              </button>
            ) : (
              <button
                key="book"
                onClick={() => setShowConfirm(true)}
                className="animate-in w-full rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-primary-700 hover:to-indigo-700 hover:shadow-md active:scale-[0.98]"
              >
                Book This Event
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleBook}
        title="Confirm Booking"
        confirmLabel="Confirm Booking"
        cancelLabel="Go Back"
        variant="primary"
        loading={bookEvent.isPending}
      >
        <div className="space-y-3">
          <p>You are about to book:</p>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="font-semibold text-gray-900">{event.name}</p>
            <p className="mt-1 text-xs text-gray-500">
              {formatDate(event.date)} &middot; {formatTime(event.date)}
            </p>
            {event.venue && (
              <p className="mt-0.5 text-xs text-gray-500">{event.venue}</p>
            )}
          </div>
          <p className="text-xs text-gray-400">
            You can cancel your booking later from the My Bookings page.
          </p>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel Booking"
        confirmLabel="Yes, Cancel Booking"
        cancelLabel="Keep Booking"
        variant="danger"
        loading={cancelBooking.isPending}
      >
        <div className="space-y-2">
          <p>
            Are you sure you want to cancel your booking for{" "}
            <span className="font-semibold text-gray-900">{event.name}</span>?
          </p>
          <p className="text-xs text-gray-400">
            This action cannot be undone. You may be able to rebook if spots
            are still available.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}
