"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  Activity, 
  Calendar,
  Zap,
  ArrowUpRight,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    men: number;
    women: number;
    absencesThisMonth: number;
    topSkills: any[];
  }>({
    total: 0,
    active: 0,
    men: 0,
    women: 0,
    absencesThisMonth: 0,
    topSkills: []
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const [
        { data: employees },
        { data: absences },
        { data: skills }
      ] = await Promise.all([
        supabase.from("employees").select("status, sex"),
        supabase.from("absences").select("id"),
        supabase.from("skills").select("id")
      ]);

      if (employees) {
        const activeEmployees = employees.filter(e => e.status?.toLowerCase() === 'ativo');
        const men = activeEmployees.filter(e => e.sex?.startsWith('M')).length;
        const women = activeEmployees.filter(e => e.sex?.startsWith('F')).length;

        setStats({
          total: employees.length,
          active: activeEmployees.length,
          men: men,
          women: women,
          absencesThisMonth: absences?.length || 0,
          topSkills: skills || []
        });
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Estúdio */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display text-white tracking-tight">Panorama <span className="text-blue-500">Analítico</span></h1>
          <p className="text-slate-500 text-[9px] mt-2 font-bold uppercase tracking-[0.3em]">Visão Estratégica de Capital Humano</p>
        </div>
        <div className="flex items-center gap-4 bg-[#121b28] px-5 py-3 rounded-2xl border border-[#1e293b] shadow-xl">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-lg border-2 border-[#121b28] bg-slate-800 flex items-center justify-center overflow-hidden">
                <User size={14} className="text-slate-500" />
              </div>
            ))}
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Força de Trabalho</span>
            <span className="text-xs font-bold text-white tracking-tight">{stats.total} Colaboradores</span>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Petroleum */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Total de Ativos" 
          value={stats.active} 
          icon={Users} 
          trend="+4% este mês" 
          color="blue"
        />
        <div onClick={() => router.push('/dashboard/absences')}>
          <StatCard 
            label="Taxa de Absenteísmo" 
            value={`${((stats.absencesThisMonth / (stats.total || 1)) * 100).toFixed(1)}%`} 
            icon={Calendar} 
            trend="Estável" 
            color="amber"
          />
        </div>
        <StatCard 
          label="Matriz de Skills" 
          value={stats.topSkills.length} 
          icon={Zap} 
          trend="Operacional" 
          color="indigo"
        />
      </div>

      {/* Seção Inteligente: Gênero */}
      <div className="flex justify-center">
        <div className="pro-card p-10 flex flex-col justify-between min-h-[380px] w-full max-w-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10">
            <h3 className="text-xl font-display text-white mb-1 tracking-tight">Composição Demográfica</h3>
            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em]">Distribuição de Gênero na Operação</p>
          </div>
          
          <div className="space-y-10 relative z-10">
            <GenderBar label="Mulheres" count={stats.women} total={stats.total} color="bg-rose-500" glow="shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
            <GenderBar label="Homens" count={stats.men} total={stats.total} color="bg-blue-500" glow="shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
          </div>

          <div className="pt-6 border-t border-white/5 opacity-0"></div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend, color }: any) {
  const colors: any = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };

  return (
    <div className="pro-card p-8 group hover:bg-[#1a2538] transition-all cursor-pointer relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-6 border transition-all group-hover:scale-110", colors[color])}>
        <Icon size={24} />
      </div>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <h2 className="text-3xl font-display text-white tracking-tighter">{value}</h2>
        <div className="text-[9px] font-bold text-emerald-500 flex items-center gap-1 mb-1 uppercase tracking-widest">
          {trend}
        </div>
      </div>
    </div>
  );
}

function GenderBar({ label, count, total, color, glow }: any) {
  const percentage = (count / (total || 1)) * 100;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end px-1">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{label}</span>
        <span className="text-xl font-display text-white tracking-tighter">{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={cn("h-full rounded-full transition-all relative", color, glow)} 
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
        </motion.div>
      </div>
    </div>
  );
}
