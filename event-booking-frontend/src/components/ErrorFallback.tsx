import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export default function ErrorFallback() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status}: ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-gray-900">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">{message}</p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Reload Page
        </button>
        <Link
          to="/"
          className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-primary-700 hover:to-indigo-700"
        >
          Back to Events
        </Link>
      </div>
    </div>
  );
}
