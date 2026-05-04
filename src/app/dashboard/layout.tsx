"use client";

import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  Search,
  Bell,
  User as UserIcon,
  ShieldCheck,
  Calendar,
  Zap,
  CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Colaboradores", icon: Users, href: "/dashboard/employees" },
    { label: "Planejamento", icon: CalendarDays, href: "/dashboard/planning" },
    { label: "Ausências", icon: Calendar, href: "/dashboard/absences" },
    { label: "Processos", icon: Zap, href: "/dashboard/processes" },
  ];

  return (
    <div className="min-h-screen flex bg-[#05070a] font-inter">
      {/* Sidebar Vercel Style */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#05070a] border-r border-white/5 transition-all duration-300 lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col p-6">
          {/* Logo Minimalista */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-blue-600 flex items-center justify-center rounded-xl shadow-lg shadow-blue-500/20">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <h1 className="text-[15px] font-display font-bold tracking-tight text-white">G300 ADM</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
                    isActive 
                      ? "text-white font-bold bg-[#121b28] border border-[#1e293b] shadow-xl shadow-black/20" 
                      : "text-slate-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Footer Sidebar */}
          <div className="mt-auto pt-6 border-t border-white/5">
            <button 
              onClick={() => router.push("/login")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-500 hover:text-rose-500 transition-all"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Ultra-Clean */}
        <header className="h-16 bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-10 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-500 hover:bg-gray-50 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="relative hidden md:block w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input 
                type="text" 
                placeholder="Pesquisa rápida..."
                className="w-full pl-11 pr-4 py-2 rounded-xl border border-white/5 bg-white/5 text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="p-2 text-slate-500 hover:text-white transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#05070a]" />
            </button>
            <div className="h-6 w-px bg-white/5" />
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all group">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-white transition-all overflow-hidden shadow-lg">
                <UserIcon size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white leading-none">Admin</span>
                <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mt-1">Superuser</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Area Area */}
        <main className="flex-1 p-10 overflow-y-auto bg-[#05070a] custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
