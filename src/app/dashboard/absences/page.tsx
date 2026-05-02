'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Search, 
  Filter, 
  ArrowLeft,
  User,
  Clock,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface GlobalAbsence {
  id: string;
  date: string;
  type: string;
  reason: string;
  treatment: string;
  employee_id: number;
  employees: {
    name: string;
    company: string;
  };
}

export default function GlobalAbsencesPage() {
  const router = useRouter();
  const [absences, setAbsences] = useState<GlobalAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');

  useEffect(() => {
    fetchAbsences();
  }, []);

  async function fetchAbsences() {
    setLoading(true);
    const { data, error } = await supabase
      .from('absences')
      .select(`
        *,
        employees (
          name,
          company
        )
      `)
      .order('date', { ascending: false });

    if (data) setAbsences(data as any);
    setLoading(false);
  }

  const filteredAbsences = absences.filter(abs => {
    const matchesSearch = abs.employees?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         abs.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'Todos' || abs.type === filterType;
    return matchesSearch && matchesType;
  });

  const types = ['Todos', ...Array.from(new Set(absences.map(a => a.type)))];

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
          <h1 className="text-4xl font-display text-white tracking-tight">Gestão de <span className="text-blue-500">Ausências</span></h1>
          <p className="text-slate-500 text-[9px] mt-2 font-bold uppercase tracking-[0.3em]">Monitoramento Global de Assiduidade</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por colaborador ou motivo..."
            className="w-full bg-[#121b28] border border-[#1e293b] rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all shadow-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative group">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
          <select 
            className="w-full bg-[#121b28] border border-[#1e293b] rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-xl appearance-none cursor-pointer"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-center bg-[#121b28] border border-[#1e293b] rounded-2xl px-4 py-4 shadow-xl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-3">Total:</span>
          <span className="text-lg font-display text-white tracking-tighter">{filteredAbsences.length}</span>
        </div>
      </div>

      {/* Tabela de Ausências */}
      <div className="bg-[#121b28] border border-[#1e293b] rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.01]">
                <th className="pl-10 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data</th>
                <th className="py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Colaborador</th>
                <th className="py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo</th>
                <th className="py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Motivo</th>
                <th className="py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tratamento</th>
                <th className="py-5 text-right pr-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Empresa</th>
              </tr>
            </thead>
            <tbody className="">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1e293b]/10">
                    <td colSpan={6} className="p-5">
                      <div className="h-3 bg-white/5 rounded-full w-full animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredAbsences.map((abs) => (
                <tr 
                  key={abs.id} 
                  className="group hover:bg-white/[0.01] transition-all border-b border-[#1e293b]/30 last:border-0"
                >
                  <td className="pl-10 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <Calendar size={14} />
                      </div>
                      <span className="text-[12px] text-slate-300 font-medium">
                        {new Date(abs.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group/user"
                      onClick={() => router.push(`/dashboard/employees/${abs.employee_id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover/user:bg-blue-500 group-hover/user:text-white transition-all">
                        <User size={14} />
                      </div>
                      <span className="text-[13px] text-slate-300 font-normal group-hover/user:text-blue-400 transition-colors">{abs.employees?.name}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "text-[9px] font-bold px-3 py-1 rounded-full border uppercase tracking-widest",
                      abs.type === 'Falta' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                      abs.type === 'Atraso' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                      "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    )}>
                      {abs.type}
                    </span>
                  </td>
                  <td className="py-4 max-w-[200px]">
                    <p className="text-[11px] text-slate-500 truncate" title={abs.reason}>
                      {abs.reason || "Não informado"}
                    </p>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <FileText size={12} className="text-slate-600" />
                      <span className="text-[11px]">{abs.treatment || "Pendente"}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right pr-10">
                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                      {abs.employees?.company}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && filteredAbsences.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <AlertCircle size={40} className="text-slate-500" />
                      <p className="text-sm font-medium text-slate-500">Nenhuma ausência encontrada</p>
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
