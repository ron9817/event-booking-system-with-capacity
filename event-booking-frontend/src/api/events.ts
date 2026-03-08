import apiClient from "./client";
import type { Event, ApiSuccessResponse, ApiPaginatedResponse } from "@/types";

export interface GetEventsParams {
  page?: number;
  limit?: number;
}

export async function getEvents(
  params: GetEventsParams = {},
): Promise<ApiPaginatedResponse<Event>> {
  const { data } = await apiClient.get<ApiPaginatedResponse<Event>>("/events", {
    params,
  });
  return data;
}

export async function getEventById(
  id: string,
): Promise<ApiSuccessResponse<Event>> {
  const { data } = await apiClient.get<ApiSuccessResponse<Event>>(
    `/events/${id}`,
  );
  return data;
}
