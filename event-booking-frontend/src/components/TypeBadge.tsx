import {
  Music,
  Trophy,
  Plane,
  Mic,
  Theater,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

interface TypeConfig {
  icon: LucideIcon;
  className: string;
}

const TYPE_MAP: Record<string, TypeConfig> = {
  concert: {
    icon: Music,
    className: "bg-purple-100 text-purple-700",
  },
  stadium: {
    icon: Trophy,
    className: "bg-green-100 text-green-700",
  },
  flight: {
    icon: Plane,
    className: "bg-sky-100 text-sky-700",
  },
  conference: {
    icon: Mic,
    className: "bg-amber-100 text-amber-700",
  },
  theater: {
    icon: Theater,
    className: "bg-rose-100 text-rose-700",
  },
};

const DEFAULT_CONFIG: TypeConfig = {
  icon: CalendarDays,
  className: "bg-gray-100 text-gray-700",
};

export function getTypeConfig(type: string | null): TypeConfig {
  if (!type) return DEFAULT_CONFIG;
  return TYPE_MAP[type.toLowerCase()] ?? DEFAULT_CONFIG;
}

export function getBorderColor(type: string | null): string {
  if (!type) return "border-l-gray-300";
  const map: Record<string, string> = {
    concert: "border-l-purple-400",
    stadium: "border-l-green-400",
    flight: "border-l-sky-400",
    conference: "border-l-amber-400",
    theater: "border-l-rose-400",
  };
  return map[type.toLowerCase()] ?? "border-l-gray-300";
}

interface TypeBadgeProps {
  type: string | null;
  className?: string;
}

export default function TypeBadge({ type, className = "" }: TypeBadgeProps) {
  const config = getTypeConfig(type);
  const Icon = config.icon;
  const label = type ?? "Event";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.className} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}
