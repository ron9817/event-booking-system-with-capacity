export default function EventCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-l-4 border-gray-200 border-l-gray-200 bg-white p-6 shadow-sm">
      <div className="h-5 w-20 rounded-full bg-gray-200" />
      <div className="mt-4 h-6 w-3/4 rounded bg-gray-200" />
      <div className="mt-4 space-y-2">
        <div className="h-4 w-2/3 rounded bg-gray-100" />
        <div className="h-4 w-1/2 rounded bg-gray-100" />
      </div>
      <div className="mt-5">
        <div className="h-1.5 w-full rounded-full bg-gray-100" />
        <div className="mt-1.5 h-3 w-24 rounded bg-gray-100" />
      </div>
    </div>
  );
}
