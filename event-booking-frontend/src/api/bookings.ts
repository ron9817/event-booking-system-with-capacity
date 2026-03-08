import apiClient from "./client";
import type {
  Booking,
  BookingResult,
  BookingStatus,
  ApiSuccessResponse,
  ApiPaginatedResponse,
} from "@/types";

export async function bookEvent(
  eventId: string,
): Promise<ApiSuccessResponse<BookingResult>> {
  const { data } = await apiClient.post<ApiSuccessResponse<BookingResult>>(
    `/events/${eventId}/bookings`,
  );
  return data;
}

export async function cancelBooking(
  eventId: string,
): Promise<ApiSuccessResponse<BookingResult>> {
  const { data } = await apiClient.delete<ApiSuccessResponse<BookingResult>>(
    `/events/${eventId}/bookings`,
  );
  return data;
}

export interface GetUserBookingsParams {
  page?: number;
  limit?: number;
  status?: BookingStatus;
}

export async function getUserBookings(
  userId: string,
  params: GetUserBookingsParams = {},
): Promise<ApiPaginatedResponse<Booking>> {
  const { data } = await apiClient.get<ApiPaginatedResponse<Booking>>(
    `/users/${userId}/bookings`,
    { params },
  );
  return data;
}
