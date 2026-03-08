interface CapacityBarProps {
  booked: number;
  capacity: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

function getBarColor(ratio: number): string {
  if (ratio >= 1) return "bg-red-500";
  if (ratio >= 0.8) return "bg-red-400";
  if (ratio >= 0.5) return "bg-amber-400";
  return "bg-emerald-400";
}

function getTextColor(ratio: number): string {
  if (ratio >= 1) return "text-red-600";
  if (ratio >= 0.8) return "text-red-500";
  if (ratio >= 0.5) return "text-amber-600";
  return "text-gray-500";
}

export default function CapacityBar({
  booked,
  capacity,
  showLabel = true,
  size = "sm",
}: CapacityBarProps) {
  const ratio = capacity > 0 ? booked / capacity : 0;
  const percent = Math.min(ratio * 100, 100);
  const spotsLeft = capacity - booked;
  const isSoldOut = spotsLeft <= 0;

  const barHeight = size === "sm" ? "h-1.5" : "h-2.5";

  const label = isSoldOut
    ? "Sold out"
    : spotsLeft <= 5
      ? `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`
      : `${booked} of ${capacity} booked`;

  return (
    <div className="w-full">
      <div className={`w-full overflow-hidden rounded-full bg-gray-100 ${barHeight}`}>
        <div
          className={`${barHeight} rounded-full transition-all duration-500 ${getBarColor(ratio)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className={`mt-1 text-xs font-medium ${getTextColor(ratio)}`}>
          {label}
        </p>
      )}
    </div>
  );
}
