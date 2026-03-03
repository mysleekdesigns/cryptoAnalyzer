"use client";

import { cn } from "@/lib/utils/index";
import { useUIStore } from "@/lib/store/ui-store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAlertChecker } from "@/hooks/use-alert-checker";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  useAlertChecker();

  return (
    <div className="min-h-screen">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main area */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300",
          collapsed ? "md:ml-16" : "md:ml-60"
        )}
      >
        <Header />
        <main id="main-content" className="flex-1 px-3 py-4 pb-24 sm:px-4 sm:py-6 md:px-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
