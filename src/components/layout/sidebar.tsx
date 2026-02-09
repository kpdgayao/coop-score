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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/scoring", label: "Credit Scoring", icon: Calculator },
  { href: "/loans", label: "Loans", icon: FileText },
  { href: "/activities", label: "Activities", icon: Calendar },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
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

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Version label */}
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <p className="text-[10px] text-sidebar-foreground/30 text-center">
          CoopScore v1.0
        </p>
      </div>
    </aside>
  );
}
