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
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "flex flex-col shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "border-r border-white/[0.05] z-50",
          isHovered ? "w-60" : "w-[52px]"
        )}
        style={{
          background: "linear-gradient(180deg, #05070A 0%, #080B12 100%)",
          boxShadow: isHovered ? "4px 0 40px rgba(0,0,0,0.6)" : "none",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 h-16 shrink-0 border-b border-white/[0.04]">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-blue-600 shadow-[0_0_16px_rgba(59,130,246,0.35)]">
            <ShieldCheck size={17} className="text-white" />
          </div>
          <span
            className={cn(
              "text-[13px] font-black tracking-[0.2em] text-white uppercase whitespace-nowrap transition-all duration-500",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
            )}
          >
            G300
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-hidden">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "w-full flex items-center h-11 rounded-xl transition-all duration-300 relative group overflow-hidden",
                  isActive
                    ? "bg-blue-500/[0.08] text-blue-400"
                    : "text-gray-500 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                )}

                {/* Icon container — always 52px to align with collapsed sidebar */}
                <div className="w-[52px] shrink-0 flex items-center justify-center">
                  <item.icon
                    size={19}
                    className={cn(
                      "transition-all duration-300",
                      isActive
                        ? "text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                        : "text-gray-500 group-hover:text-white"
                    )}
                  />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-500",
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
        <div className="px-2 pb-4 border-t border-white/[0.04] pt-3">
          <button
            onClick={() => router.push("/login")}
            className="w-full flex items-center h-11 rounded-xl transition-all hover:bg-red-500/10 group overflow-hidden text-gray-500 hover:text-red-400"
          >
            <div className="w-[52px] shrink-0 flex items-center justify-center">
              <LogOut size={17} className="transition-colors" />
            </div>
            <span
              className={cn(
                "text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-500",
                isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
              )}
            >
              Encerrar Sessão
            </span>
          </button>
        </div>
      </aside>

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
