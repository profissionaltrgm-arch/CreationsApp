"use client";

import { useState } from "react";
import { 
  Users, 
  LogOut, 
  Menu, 
  Bell,
  User as UserIcon,
  ShieldCheck,
  Calendar,
  Zap,
  CalendarDays,
  PackageSearch
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: "Colaboradores", icon: Users,            href: "/dashboard/employees" },
    { label: "Planejamento",  icon: CalendarDays,     href: "/dashboard/planning" },
    { label: "Ausências",     icon: Calendar,         href: "/dashboard/absences" },
    { label: "Processos",     icon: Zap,              href: "/dashboard/processes" },
    { label: "Validações",    icon: ShieldCheck,      href: "/dashboard/validacoes" },
  ];

  return (
    <div className="min-h-screen flex selection:bg-blue-500/30" style={{ background: "#05070A" }}>
      {/* ── Sidebar Premium ───────────────────────────────────────── */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] border-r border-white/[0.04] overflow-hidden",
          isHovered ? "w-60" : "w-[52px]"
        )}
        style={{
          background: "linear-gradient(180deg, #05070A 0%, #080B10 100%)",
          boxShadow: isHovered ? "4px 0 32px rgba(0,0,0,0.5)" : "none",
        }}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-4 px-3 h-16 shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)] bg-blue-600 transition-transform duration-500 rotate-0 group-hover:rotate-12"
          >
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div className={cn(
            "flex flex-col transition-all duration-500",
            isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10 pointer-events-none"
          )}>
            <span className="text-sm font-black tracking-[0.2em] text-white uppercase leading-none">G300</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "w-full flex items-center h-12 rounded-2xl transition-all duration-300 relative group",
                  isActive ? "bg-white/[0.06] shadow-xl" : "hover:bg-white/[0.03]"
                )}
              >
                <div className="w-[52px] shrink-0 flex items-center justify-center">
                   <item.icon size={20} className={cn(
                     "transition-all duration-300",
                     isActive ? "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "text-gray-500 group-hover:text-white"
                   )} />
                </div>
                <span
                  className={cn(
                    "text-[12px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-500",
                    isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                  )}
                  style={{ color: isActive ? "#FFF" : "#6B7280" }}
                >
                  {item.label}
                </span>
                
                {/* Active Indicator G300 Style */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 space-y-2 border-t border-white/5">
           <button
            onClick={() => router.push("/login")}
            className="w-full flex items-center h-12 rounded-2xl transition-all hover:bg-red-500/10 group overflow-hidden text-gray-500"
           >
            <div className="w-[52px] shrink-0 flex items-center justify-center">
               <LogOut size={18} className="group-hover:text-red-500 transition-colors" />
            </div>
            <span
              className={cn(
                "text-[12px] font-black uppercase tracking-widest transition-all duration-500",
                isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              Encerrar Sessão
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-500"
        style={{ paddingLeft: "52px" }}
      >
        {/* Header Superior Premium */}
        <header
          className="h-16 flex items-center justify-end px-8 sticky top-0 z-40 border-b border-white/5 backdrop-blur-3xl"
          style={{ background: "rgba(5,7,10,0.7)" }}
        >

          <div className="flex items-center gap-6">


            <button className="relative p-2.5 rounded-2xl transition-all hover:bg-white/5 border border-transparent hover:border-white/5 text-gray-500 hover:text-white">
              <Bell size={18} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-600 border-2 border-[#050710] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            </button>

            <div className="flex items-center gap-4 pl-4 border-l border-white/5">
              <div className="flex flex-col items-end leading-none">
                <span className="text-[11px] font-black text-white uppercase tracking-tighter">Administrador</span>
                <span className="text-[9px] font-bold text-blue-500/80 uppercase tracking-widest mt-1">Acesso Master</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-[1px] shadow-lg shadow-blue-500/10">
                 <div className="w-full h-full rounded-[calc(1rem-1px)] bg-[#05070A] flex items-center justify-center text-white">
                    <UserIcon size={18} />
                 </div>
              </div>
            </div>
          </div>
        </header>

        {/* Viewport Principal */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
