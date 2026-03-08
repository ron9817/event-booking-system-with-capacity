import type { BookingStatus } from "@/types";
import { CircleCheck, CircleX } from "lucide-react";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; className: string; icon: typeof CircleCheck }
> = {
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    icon: CircleCheck,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-gray-50 text-gray-500 ring-gray-500/10",
    icon: CircleX,
  },
};

interface StatusBadgeProps {
  status: BookingStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
