"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Users, User, Calendar, Zap, TrendingUp, PieChart, ShieldCheck, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    men: 0,
    women: 0,
    absencesThisMonth: 0,
    topSkills: [] as any[],
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const [{ data: employees }, { data: absences }, { data: skills }] =
        await Promise.all([
          supabase.from("employees").select("status, sex"),
          supabase.from("absences").select("id"),
          supabase.from("skills").select("id"),
        ]);

      if (employees) {
        const active = employees.filter((e) => e.status?.toLowerCase() === "ativo");
        setStats({
          total: employees.length,
          active: active.length,
          men:    active.filter((e) => e.sex?.startsWith("M")).length,
          women:  active.filter((e) => e.sex?.startsWith("F")).length,
          absencesThisMonth: absences?.length || 0,
          topSkills: skills || [],
        });
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const absRate = ((stats.absencesThisMonth / (stats.total || 1)) * 100).toFixed(1);

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden custom-scrollbar overflow-y-auto pr-2">
      
      {/* Header Premium */}
      <div className="flex items-end justify-between px-1 mt-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <TrendingUp className="text-blue-500" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none uppercase">Visão Analítica</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Human Capital Intelligence · G300
            </p>
          </div>
        </div>

        <div className="flex bg-[#0D1528] border border-white/5 p-1 rounded-xl">
           <div className="flex items-center gap-2 px-3">
             <Activity size={12} className="text-emerald-500" />
             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">System Live</span>
           </div>
        </div>
      </div>

      {/* Cards de Estatísticas High-End */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-1">
        <StatCard
          label="Colaboradores Ativos"
          value={loading ? "..." : stats.active}
          sub={loading ? "" : `DE ${stats.total} NO QUADRO TOTAL`}
          icon={Users}
          trend="+2.4%"
          color="blue"
        />
        <StatCard
          label="Taxa de Absenteísmo"
          value={loading ? "..." : `${absRate}%`}
          sub="INDICADOR DE ASSIDUIDADE"
          icon={Calendar}
          onClick={() => router.push("/dashboard/absences")}
          trend="-0.8%"
          color="red"
        />
        <StatCard
          label="Matriz de Skills"
          value={loading ? "..." : stats.topSkills.length}
          sub="COMPETÊNCIAS MAPEADAS"
          icon={Zap}
          trend="READY"
          color="emerald"
        />
      </div>

      {/* Composição Demográfica Premium */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-1 flex-1 min-h-0">
        <div className="bg-[#0D1528] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col group transition-all hover:border-white/10 shadow-2xl">
           {/* Background Decoration */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />
           
           <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Demografia Operacional</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Distribuição de gênero por competência</p>
              </div>
              <PieChart size={20} className="text-gray-700" />
           </div>

           <div className="space-y-8 relative z-10 flex-1 flex flex-col justify-center">
              <GenderBar label="Mulheres" count={stats.women} total={stats.total} color="bg-blue-500" glow="shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
              <GenderBar label="Homens"   count={stats.men}   total={stats.total} color="bg-emerald-500" glow="shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
           </div>
        </div>

        <div className="bg-[#0D1528] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:border-white/10 transition-all shadow-2xl overflow-hidden relative">
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />
           
           <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                 <ShieldCheck className="text-emerald-500" size={20} />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Sistema Integrado <br/> de Performance</h2>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-3">Ready for Operational Tasks</p>
           </div>

           <div className="relative z-10 pt-8 mt-auto">
              <div className="flex items-center gap-4 text-gray-400">
                 <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0D1528] bg-gray-800 flex items-center justify-center overflow-hidden">
                         <User size={14} className="text-gray-600" />
                      </div>
                    ))}
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Equipe Técnica Conectada</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, onClick, trend, color }: any) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
    red: "text-red-500 bg-red-500/10 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]",
  };

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      className={cn(
        "bg-[#0D1528] border border-white/5 rounded-[2.5rem] p-6 transition-all shadow-xl group",
        onClick && "cursor-pointer active:scale-95"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-6">
        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110", colors[color])}>
          <Icon size={18} />
        </div>
        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", colors[color])}>
          {trend}
        </span>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] leading-none">{label}</h3>
        <div className="text-3xl font-black text-white tracking-tighter mono leading-tight">
          {value}
        </div>
        <p className="text-[9px] font-bold text-gray-700 tracking-widest uppercase">{sub}</p>
      </div>
    </motion.div>
  );
}

function GenderBar({ label, count, total, color, glow }: any) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between leading-none">
        <div>
          <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">{label}</span>
          <div className="text-xl font-black text-white mono mt-1 tracking-tighter">{count}</div>
        </div>
        <span className="text-[10px] font-black text-gray-500 mono bg-white/5 px-2 py-1 rounded-lg border border-white/5">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/[0.02]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={cn("h-full rounded-full transition-all duration-1000", color, glow)}
        />
      </div>
    </div>
  );
}
