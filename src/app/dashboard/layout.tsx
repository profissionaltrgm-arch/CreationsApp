"use client";

import { useState } from "react";
import { 
  Users, 
  LogOut, 
  Bell,
  User as UserIcon,
  ShieldCheck,
  Calendar,
  Zap,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: "Colaboradores", icon: Users,         href: "/dashboard/employees" },
    { label: "Planejamento",  icon: CalendarDays,  href: "/dashboard/planning" },
    { label: "Ausências",     icon: Calendar,      href: "/dashboard/absences" },
    { label: "Processos",     icon: Zap,           href: "/dashboard/processes" },
    { label: "Validações",    icon: ShieldCheck,   href: "/dashboard/validacoes" },
  ];

  return (
    <div
      className="h-screen flex overflow-hidden selection:bg-blue-500/30"
      style={{ background: "#05070A" }}
    >
      {/* ── Sidebar Container (Floats/Overlays on Hover) ──────────────── */}
      <div 
        className="w-16 shrink-0 relative z-50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <aside
          className={cn(
            "absolute top-0 left-0 h-full flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "border-r border-white/[0.05]",
            isHovered ? "w-64 shadow-[10px_0_50px_rgba(0,0,0,0.8)]" : "w-16"
          )}
          style={{
            background: "linear-gradient(180deg, #06080C 0%, #080B11 100%)",
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-16 shrink-0 border-b border-white/[0.04]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-blue-600 shadow-[0_0_16px_rgba(59,130,246,0.35)]">
              <ShieldCheck size={17} className="text-white" />
            </div>
            <span
              className={cn(
                "text-[13px] font-black tracking-[0.25em] text-white uppercase whitespace-nowrap transition-all duration-300",
                isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
              )}
            >
              G300
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-hidden">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "w-full flex items-center h-10 rounded-xl transition-all duration-200 relative group overflow-hidden",
                    isActive
                      ? "bg-blue-500/[0.08] text-blue-400"
                      : "text-gray-500 hover:bg-white/[0.03] hover:text-white"
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  )}

                  {/* Icon container - exactly 40px (w-10) to center perfectly in the 40px space when collapsed (64px - 24px padding) */}
                  <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                    <item.icon
                      size={18}
                      className={cn(
                        "transition-all duration-200",
                        isActive
                          ? "text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                          : "text-gray-500 group-hover:text-white"
                      )}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 pl-1",
                      isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-3 pb-4 border-t border-white/[0.04] pt-3">
            <button
              onClick={() => router.push("/login")}
              className="w-full flex items-center h-10 rounded-xl transition-all hover:bg-red-500/10 group overflow-hidden text-gray-500 hover:text-red-400"
            >
              <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                <LogOut size={16} className="transition-colors" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 pl-1",
                  isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
                )}
              >
                Sair
              </span>
            </button>
          </div>
        </aside>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header
          className="h-16 flex items-center justify-end px-8 shrink-0 border-b border-white/5 z-40"
          style={{ background: "rgba(5,7,10,0.85)", backdropFilter: "blur(24px)" }}
        >
          <div className="flex items-center gap-4">
            <button className="relative p-2.5 rounded-xl transition-all hover:bg-white/5 text-gray-500 hover:text-white">
              <Bell size={17} />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]" />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-white/[0.06]">
              <div className="flex flex-col items-end leading-none">
                <span className="text-[11px] font-black text-white uppercase tracking-tight">Administrador</span>
                <span className="text-[9px] font-bold text-blue-400/80 uppercase tracking-widest mt-1">Acesso Master</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-[1px] shadow-lg shadow-blue-500/10">
                <div className="w-full h-full rounded-[calc(0.75rem-1px)] bg-[#05070A] flex items-center justify-center text-white">
                  <UserIcon size={16} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
