"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  LogOut, 
  LogIn,
  ShieldCheck,
  Calendar,
  Zap,
  CalendarDays,
  PackageX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
      setLoadingAuth(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const menuItems = [
    { label: "Colaboradores", icon: Users,         href: "/dashboard/employees",   public: true  },
    { label: "Planejamento",  icon: CalendarDays,  href: "/dashboard/planning",    public: true  },
    { label: "Ausências",     icon: Calendar,      href: "/dashboard/absences",    public: false },
    { label: "Processos",     icon: Zap,           href: "/dashboard/processes",   public: false },
    { label: "Validações",    icon: ShieldCheck,   href: "/dashboard/validacoes",  public: true  },
    { label: "Quarentena",    icon: PackageX,      href: "/dashboard/quarentena",  public: true  },
  ];

  // Route guard: if path is private and user is not admin, redirect to public route
  useEffect(() => {
    if (!loadingAuth) {
      const currentItem = menuItems.find(item => item.href === pathname);
      if (currentItem && !currentItem.public && !isAdmin) {
        router.push("/dashboard/validacoes");
      }
    }
  }, [pathname, isAdmin, loadingAuth]);

  const visibleMenuItems = menuItems.filter(item => item.public || isAdmin);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/dashboard/validacoes");
  };

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
            {visibleMenuItems.map((item) => {
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

                  {/* Icon container */}
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
            {isAdmin ? (
              <button
                onClick={handleLogout}
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
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="w-full flex items-center h-10 rounded-xl transition-all hover:bg-blue-500/10 group overflow-hidden text-gray-500 hover:text-blue-400"
              >
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <LogIn size={16} className="transition-colors group-hover:text-blue-400" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 pl-1",
                    isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
                  )}
                >
                  Entrar
                </span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Page content */}
        <main className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
