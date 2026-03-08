import { Outlet, NavLink } from "react-router-dom";
import { CalendarDays, Ticket } from "lucide-react";
import { getCurrentUser } from "@/lib/user";

const APP_NAME = import.meta.env.VITE_APP_NAME || "EventBook";

const navLinks = [
  { to: "/", label: "Events", icon: CalendarDays, end: true },
  { to: "/my-bookings", label: "My Bookings", icon: Ticket, end: false },
] as const;

const user = getCurrentUser();

export default function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <NavLink to="/" className="text-xl font-bold text-primary-600">
            {APP_NAME}
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-6">
            <nav className="flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:gap-2 sm:px-3 ${
                      isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="flex flex-col items-center gap-0.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                {user.initials}
              </div>
              <span className="hidden text-[11px] font-medium text-gray-500 sm:block">
                {user.name.split(" ")[0]}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
