import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  bookEvent,
  cancelBooking,
  getUserBookings,
  type GetUserBookingsParams,
} from "@/api/bookings";
import { eventQueries } from "./useEvents";

export const bookingQueries = {
  all: () => ["bookings"] as const,

  userList: (userId: string, params: GetUserBookingsParams = {}) =>
    queryOptions({
      queryKey: [...bookingQueries.all(), "user-list", userId, params] as const,
      queryFn: () => getUserBookings(userId, params),
      enabled: !!userId,
    }),
};

export function useUserBookings(
  userId: string,
  params: GetUserBookingsParams = {},
) {
  return useQuery(bookingQueries.userList(userId, params));
}

export function useBookEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bookEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventQueries.all() });
      queryClient.invalidateQueries({ queryKey: bookingQueries.all() });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventQueries.all() });
      queryClient.invalidateQueries({ queryKey: bookingQueries.all() });
    },
  });
}
