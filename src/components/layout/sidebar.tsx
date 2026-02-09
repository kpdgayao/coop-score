"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calculator,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/members", label: "Members", icon: Users },
      { href: "/scoring", label: "Credit Scoring", icon: Calculator },
      { href: "/loans", label: "Loans", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/activities", label: "Activities", icon: Calendar },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Flat export for mobile nav
export const navItems = navGroups.flatMap((g) => g.items);

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-2 py-4 space-y-4">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold px-3 mb-1.5">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary border-l-3 border-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-3 border-transparent"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside
      className="hidden lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:h-screen lg:w-64 lg:block bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-sidebar-primary" />
          <div>
            <span className="text-lg font-bold text-sidebar-foreground">
              CoopScore
            </span>
            <span className="block text-[10px] text-sidebar-foreground/60 -mt-1">
              Credit Intelligence
            </span>
          </div>
        </Link>
      </div>

      <SidebarNav />

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 px-4 space-y-1">
        <p className="text-[10px] text-sidebar-foreground/50 text-center">
          Oro Integrated Cooperative
        </p>
        <p className="text-[10px] text-sidebar-foreground/30 text-center">
          CoopScore v1.0
        </p>
      </div>
    </aside>
  );
}
