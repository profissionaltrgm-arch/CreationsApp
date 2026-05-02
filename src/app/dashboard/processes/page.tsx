'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Zap, 
  Search, 
  Filter, 
  ArrowLeft,
  User,
  Settings,
  AlertCircle,
  Activity
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface EmployeeProcess {
  id: string;
  process_name: string;
  description: string;
  status: string;
  employee_id: number;
  employees: {
    name: string;
    company: string;
    job_title: string;
  };
}

export default function GlobalProcessesPage() {
  const router = useRouter();
  const [processes, setProcesses] = useState<EmployeeProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProcesses();
  }, []);

  async function fetchProcesses() {
    setLoading(true);
    const { data, error } = await supabase
      .from('employee_processes')
      .select(`
        *,
        employees (
          name,
          company,
          job_title
        )
      `)
      .order('process_name', { ascending: true });

    if (data) setProcesses(data as any);
    setLoading(false);
  }

  const filteredProcesses = processes.filter(proc => {
    return proc.employees?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           proc.process_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-4 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Voltar</span>
          </button>
          <h1 className="text-4xl font-display text-white tracking-tight">Matriz de <span className="text-blue-500">Processos</span></h1>
          <p className="text-slate-500 text-[9px] mt-2 font-bold uppercase tracking-[0.3em]">Mapeamento de Competências Operacionais</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por colaborador ou processo..."
            className="w-full bg-[#121b28] border border-[#1e293b] rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all shadow-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-center bg-[#121b28] border border-[#1e293b] rounded-2xl px-4 py-4 shadow-xl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-3">Processos Ativos:</span>
          <span className="text-lg font-display text-white tracking-tighter">{filteredProcesses.length}</span>
        </div>
      </div>

      {/* Tabela de Processos */}
      <div className="bg-[#121b28] border border-[#1e293b] rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.01]">
                <th className="pl-10 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Processo</th>
                <th className="py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Responsável</th>
                <th className="py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Função</th>
                <th className="py-5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="py-5 text-right pr-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Empresa</th>
              </tr>
            </thead>
            <tbody className="">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1e293b]/10">
                    <td colSpan={5} className="p-5">
                      <div className="h-3 bg-white/5 rounded-full w-full animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredProcesses.map((proc) => (
                <tr 
                  key={proc.id} 
                  className="group hover:bg-white/[0.01] transition-all border-b border-[#1e293b]/30 last:border-0"
                >
                  <td className="pl-10 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <Activity size={14} />
                      </div>
                      <span className="text-[13px] text-white font-medium">
                        {proc.process_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group/user"
                      onClick={() => router.push(`/dashboard/employees/${proc.employee_id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover/user:bg-blue-500 group-hover/user:text-white transition-all">
                        <User size={14} />
                      </div>
                      <span className="text-[13px] text-slate-300 font-normal group-hover/user:text-blue-400 transition-colors">{proc.employees?.name}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="text-[11px] text-slate-500">{proc.employees?.job_title}</span>
                  </td>
                  <td className="py-4 text-center">
                    <span className={cn(
                      "text-[9px] font-bold px-3 py-1 rounded-full border uppercase tracking-widest",
                      proc.status === 'Ativo' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      proc.status === 'Treinamento' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                      "bg-slate-500/10 border-white/10 text-slate-500"
                    )}>
                      {proc.status}
                    </span>
                  </td>
                  <td className="py-4 text-right pr-10">
                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                      {proc.employees?.company}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && filteredProcesses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Zap size={40} className="text-slate-500" />
                      <p className="text-sm font-medium text-slate-500">Nenhum processo mapeado ainda</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
