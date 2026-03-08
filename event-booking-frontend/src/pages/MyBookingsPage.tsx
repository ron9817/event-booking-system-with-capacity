import { useState } from "react";
import { Ticket, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getUserId } from "@/lib/userId";
import { useUserBookings, useCancelBooking } from "@/hooks/useBookings";
import { ApiError } from "@/lib/ApiError";
import type { BookingStatus } from "@/types";
import BookingCard from "@/components/BookingCard";
import ConfirmModal from "@/components/ConfirmModal";
import EmptyState from "@/components/EmptyState";

type FilterTab = "ALL" | BookingStatus;

const TABS: { value: FilterTab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAGE_SIZE = 10;

export function Component() {
  const userId = getUserId();
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<{
    eventId: string;
    eventName: string;
  } | null>(null);

  const statusFilter = activeTab === "ALL" ? undefined : activeTab;
  const { data, isLoading, isError, error, refetch } = useUserBookings(userId, {
    page,
    limit: PAGE_SIZE,
    status: statusFilter,
  });

  const cancelBooking = useCancelBooking();

  const bookings = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab);
    setPage(1);
  }

  function handleCancelClick(eventId: string) {
    const booking = bookings.find(
      (b) => b.event?.id === eventId || b.eventId === eventId,
    );
    const eventName = booking?.event?.name ?? "this event";
    setCancelTarget({ eventId, eventName });
  }

  function handleConfirmCancel() {
    if (!cancelTarget) return;
    cancelBooking.mutate(cancelTarget.eventId, {
      onSuccess: () => {
        setCancelTarget(null);
        toast.success("Booking cancelled successfully.");
      },
      onError: (err) => {
        setCancelTarget(null);
        if (err instanceof ApiError) {
          if (err.isNotFound) {
            toast.info("Booking was already cancelled.");
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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        {meta && (
          <p className="mt-1 text-sm text-gray-500">
            {meta.total} booking{meta.total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="mb-5 flex gap-1 rounded-lg bg-gray-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Failed to load bookings
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

      {!isLoading && !isError && bookings.length === 0 && (
        <EmptyState
          icon={Ticket}
          title="No bookings yet"
          description={
            activeTab === "ALL"
              ? "Browse events and make your first booking."
              : `No ${activeTab.toLowerCase()} bookings found.`
          }
          actionLabel={activeTab === "ALL" ? "Browse Events" : undefined}
          actionTo={activeTab === "ALL" ? "/" : undefined}
        />
      )}

      {!isLoading && !isError && bookings.length > 0 && (
        <>
          <div className="space-y-3">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancelClick}
                cancelling={
                  cancelBooking.isPending &&
                  cancelTarget?.eventId === (booking.event?.id ?? booking.eventId)
                }
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

      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Booking"
        confirmLabel="Yes, Cancel Booking"
        cancelLabel="Keep Booking"
        variant="danger"
        loading={cancelBooking.isPending}
      >
        <div className="space-y-2">
          <p>
            Are you sure you want to cancel your booking for{" "}
            <span className="font-semibold text-gray-900">
              {cancelTarget?.eventName}
            </span>
            ?
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
