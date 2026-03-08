import axios from "axios";
import { getUserId } from "@/lib/userId";
import { ApiError } from "@/lib/ApiError";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers["x-user-id"] = getUserId();
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response as {
        status: number;
        data: { message?: string; errors?: unknown[] };
      };
      throw new ApiError(
        data?.message ?? error.message,
        status,
        data?.errors,
      );
    }

    if (error instanceof Error) {
      throw new ApiError(error.message, 0);
    }

    throw new ApiError("An unexpected error occurred", 0);
  },
);

export default apiClient;
