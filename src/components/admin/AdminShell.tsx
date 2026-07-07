"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Gauge,
  Lightbulb,
  LogOut,
  Package,
  Radio,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/traffic", label: "Traffic", icon: TrendingUp },
  { href: "/admin/product", label: "Product", icon: Package },
  { href: "/admin/system", label: "System", icon: Activity },
  { href: "/admin/insights", label: "Insights", icon: Lightbulb },
  { href: "/admin/command", label: "Command Center", icon: Radio },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // The login page renders without the shell chrome.
  if (pathname === "/admin/login") return <>{children}</>;

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--surface)]/60 lg:min-h-screen">
        <div className="px-4 h-14 flex items-center gap-3 border-b border-[var(--border)]">
          <div className="w-7 h-7 bg-[var(--accent)] flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="font-mono text-sm font-semibold text-[var(--text)] leading-none">
              PDFSearch
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)] mt-0.5">
              Admin Analytics
            </div>
          </div>
        </div>
        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible p-2 gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 font-mono text-xs whitespace-nowrap transition-colors",
                  active
                    ? "bg-[var(--accent)] text-black font-semibold"
                    : "text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden lg:block p-2 mt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 font-mono text-xs text-[var(--text-3)] hover:text-[var(--red)] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 max-w-[1400px]">{children}</main>
    </div>
  );
}
