import { queryOptions, useQuery } from "@tanstack/react-query";
import { getEvents, getEventById, type GetEventsParams } from "@/api/events";

export const eventQueries = {
  all: () => ["events"] as const,

  list: (params: GetEventsParams = {}) =>
    queryOptions({
      queryKey: [...eventQueries.all(), "list", params] as const,
      queryFn: () => getEvents(params),
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: [...eventQueries.all(), "detail", id] as const,
      queryFn: () => getEventById(id),
      enabled: !!id,
      staleTime: 10_000,
      refetchOnMount: "always",
    }),
};

export function useEvents(params: GetEventsParams = {}) {
  return useQuery(eventQueries.list(params));
}

export function useEventDetail(id: string) {
  return useQuery(eventQueries.detail(id));
}
