import { createBrowserRouter, RouterProvider } from "react-router-dom";
import RootLayout from "@/layouts/RootLayout";
import ErrorFallback from "@/components/ErrorFallback";

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorFallback />,
    children: [
      {
        index: true,
        lazy: () => import("@/pages/EventsPage"),
      },
      {
        path: "events/:id",
        lazy: () => import("@/pages/EventDetailPage"),
      },
      {
        path: "my-bookings",
        lazy: () => import("@/pages/MyBookingsPage"),
      },
      {
        path: "*",
        lazy: () => import("@/pages/NotFoundPage"),
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
