import { QueryClient } from "@tanstack/react-query";

const staleTime = Number(import.meta.env.VITE_QUERY_STALE_TIME_MS) || 30_000;
const retry = Number(import.meta.env.VITE_QUERY_RETRY_COUNT) || 1;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime,
      retry,
      refetchOnWindowFocus: true,
    },
  },
});
