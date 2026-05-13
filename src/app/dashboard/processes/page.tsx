"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Zap, 
  Search, 
  Filter, 
  ArrowLeft,
  User,
  Settings,
  AlertCircle,
  Activity,
  Layers,
  Cpu
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
  const [unitFilter, setUnitFilter] = useState('Todas');
  const [processFilter, setProcessFilter] = useState('Todos');

  useEffect(() => {
    fetchProcesses();
  }, []);

  async function fetchProcesses() {
    setLoading(true);
    const { data } = await supabase
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

  const filteredProcesses = useMemo(() => {
    return processes.filter(proc => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = proc.employees?.name.toLowerCase().includes(search) ||
                           proc.process_name.toLowerCase().includes(search);
      const matchesUnit = unitFilter === 'Todas' || (proc.employees?.company || "").toUpperCase() === unitFilter.toUpperCase();
      const matchesProcess = processFilter === 'Todos' || (proc.process_name || "").toUpperCase() === processFilter.toUpperCase();

      return matchesSearch && matchesUnit && matchesProcess;
    });
  }, [processes, searchTerm, unitFilter, processFilter]);

  const uniqueProcessNames = useMemo(() => ["Todos", ...Array.from(new Set(processes.map(p => p.process_name)))], [processes]);

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden">
      
      {/* Header Premium */}
      <div className="flex items-end justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <Cpu className="text-blue-500" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">Matriz de Processos</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Mapeamento de Competências · G300
            </p>
          </div>
        </div>

        <div className="flex bg-[#0D1528] border border-white/5 p-1 rounded-xl">
           <div className="flex items-center gap-2 px-3">
             <Layers size={12} className="text-gray-600" />
             <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">Database V3.0</span>
           </div>
        </div>
      </div>

      {/* Busca & Filtros */}
      <div className="flex items-center gap-4 px-1">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={16} />
          <input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="PESQUISAR POR PROCESSO OU COLABORADOR..."
            className="w-full bg-[#0D1528] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-[11px] font-bold text-white uppercase tracking-widest focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700"
          />
        </div>
        
        <div className="flex gap-2 bg-[#0D1528] border border-white/5 p-1 rounded-2xl">
           <div className="flex bg-black/20 rounded-xl p-0.5 border border-white/5">
             {["Todas", "MONDIAL", "NUTRIVIDA"].map(u => (
               <button
                key={u}
                onClick={() => setUnitFilter(u)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                  unitFilter === u ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-400"
                )}
               >
                {u === "Todas" ? "UNIDADES" : u}
               </button>
             ))}
           </div>

           <div className="flex items-center gap-2 px-3 bg-black/20 rounded-xl border border-white/5">
             <Filter size={12} className="text-gray-600" />
             <select 
               value={processFilter}
               onChange={e => setProcessFilter(e.target.value)}
               className="bg-transparent text-[10px] font-black text-gray-400 uppercase tracking-tighter focus:outline-none cursor-pointer"
             >
               <option value="Todos" className="bg-[#0D1528]">PROCESSOS: TODOS</option>
               {uniqueProcessNames.filter(p => p !== "Todos").map(p => (
                 <option key={p} value={p} className="bg-[#0D1528]">{p.toUpperCase()}</option>
               ))}
             </select>
           </div>
        </div>

        <div className="flex items-center gap-3 bg-[#0D1528] border border-white/5 px-4 py-2 rounded-2xl shadow-xl ml-auto">
          <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest text-right">Processos Ativos:</span>
          <span className="text-sm font-black text-white mono">{filteredProcesses.length}</span>
        </div>
      </div>

      {/* Tabela Matrix */}
      <div className="flex-1 bg-[#0D1528] border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-[#0D1528]/80 backdrop-blur-xl text-left">
              <tr>
                <th className="w-0 p-0 border-b border-white/5"></th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">Processo Operacional</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">Colaborador Vinculado</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">Função</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 text-center">Status de Proficiência</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 text-right">Organização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-5"><div className="h-2 bg-white/5 rounded-full" /></td>
                  </tr>
                ))
              ) : filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <Zap size={48} className="mx-auto mb-4 text-gray-800" />
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Nenhum mapeamento encontrado</p>
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((proc) => {
                  const isActive = proc.status === 'Ativo';
                  const isTraining = proc.status === 'Treinamento';
                  const isNutri = (proc.employees?.company || "").toUpperCase() === "NUTRIVIDA";

                  return (
                    <tr 
                      key={proc.id}
                      className="group transition-all hover:bg-white/[0.03] relative"
                    >
                      {/* Glow Indicator Lateral */}
                      <td className="relative p-0 w-0">
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top",
                          isActive ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        )} />
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02]">
                        <div className="flex items-center gap-3">
                           <div className={cn(
                             "w-7 h-7 rounded-lg flex items-center justify-center border transition-colors",
                             isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20" : "bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20"
                           )}>
                             <Activity size={12} />
                           </div>
                           <span className="text-[12px] font-bold text-gray-300 group-hover:text-white transition-colors">{proc.process_name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02]">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/dashboard/employees/${proc.employee_id}`)}>
                           <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-600 group-hover:border-blue-500/50 transition-all">
                              <User size={10} />
                           </div>
                           <span className="text-[12px] font-bold text-gray-400 group-hover:text-blue-400 transition-colors">
                              {proc.employees?.name}
                           </span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02]">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                          {proc.employees?.job_title}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02] text-center">
                        <span className={cn(
                          "inline-flex px-3 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all",
                          isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20" :
                          isTraining ? "bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20" :
                          "bg-white/5 border-white/10 text-gray-500"
                        )}>
                          {proc.status}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02] text-right">
                         <span className={cn(
                            "text-[9px] px-2.5 py-1 rounded-md border tracking-tighter uppercase font-black inline-block whitespace-nowrap transition-all group-hover:scale-105",
                            isNutri 
                              ? "text-purple-400 border-purple-500/50 bg-purple-500/10" 
                              : "text-white border-white/40 bg-black/40"
                          )}>
                            {proc.employees?.company || "MONDIAL"}
                          </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Matrix */}
        <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
              Matriz de Competência G300 · Atualizado Hoje
            </span>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-blue-400/80 uppercase tracking-[0.2em]">Excelência Operacional</span>
          </div>
        </div>
      </div>

    </div>
  );
}
