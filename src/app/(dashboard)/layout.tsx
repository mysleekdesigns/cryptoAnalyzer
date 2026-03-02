"use client";

import { cn } from "@/lib/utils/index";
import { useUIStore } from "@/lib/store/ui-store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

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
        <main className="flex-1 px-4 py-6 pb-20 md:px-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
