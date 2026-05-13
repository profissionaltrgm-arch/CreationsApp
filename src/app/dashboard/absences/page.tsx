"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Search,
  ChevronDown,
  User,
  FileText,
  AlertCircle,
  Calendar,
  ChevronUp,
  Filter,
  Activity,
  History
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface GlobalAbsence {
  id: string;
  date: string;
  type: string;
  reason: string;
  treatment: string;
  employee_id: number;
  employees: { name: string; company: string; job_title: string };
}

const TYPE_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
  'Falta Injustificada': { label: 'INJUSTIFICADA', color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/10' },
  'Falta Justificada':   { label: 'JUSTIFICADA', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
  'Atraso':              { label: 'ATRASO', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
  'Afastamento':         { label: 'AFASTAMENTO', color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10' },
};

export default function GlobalAbsencesPage() {
  const router = useRouter();
  const [absences, setAbsences] = useState<GlobalAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [unitFilter, setUnitFilter] = useState('Todas');

  useEffect(() => { fetchAbsences(); }, []);

  async function fetchAbsences() {
    setLoading(true);
    const { data } = await supabase
      .from('absences')
      .select('*, employees(name, company, job_title)')
      .order('date', { ascending: false });
    if (data) setAbsences(data as any);
    setLoading(false);
  }

  const types = ['Todos', 'Falta Injustificada', 'Falta Justificada', 'Atraso', 'Afastamento'];

  const filtered = useMemo(() => {
    return absences.filter((abs) => {
      const matchesSearch =
        abs.employees?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        abs.reason?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'Todos' || abs.type === filterType;
      const matchesUnit = unitFilter === 'Todas' || (abs.employees?.company || "").toUpperCase() === unitFilter.toUpperCase();
      
      return matchesSearch && matchesType && matchesUnit;
    });
  }, [absences, searchTerm, filterType, unitFilter]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden">
      
      {/* Header Premium */}
      <div className="flex items-end justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center">
            <Activity className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">Ausências</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Monitoramento de Assiduidade · G300
            </p>
          </div>
        </div>

        <div className="flex bg-[#0D1528] border border-white/5 p-1 rounded-xl">
           <div className="flex items-center gap-1 px-3">
             <History size={12} className="text-gray-600" />
             <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">Últimos 30 dias</span>
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
            placeholder="PESQUISAR POR COLABORADOR OU MOTIVO..."
            className="w-full bg-[#0D1528] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-[11px] font-bold text-white uppercase tracking-widest focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700"
          />
        </div>
        
        <div className="flex gap-2 bg-[#0D1528] border border-white/5 p-1 rounded-2xl">
           <div className="flex bg-black/20 rounded-xl p-0.5 border border-white/5 mr-1">
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
           <div className="flex items-center gap-1">
             {types.map(t => (
               <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  "px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all",
                  filterType === t 
                    ? "bg-white/5 text-white" 
                    : "text-gray-600 hover:text-gray-400"
                )}
               >
                {t === 'Todos' ? 'TIPOS' : t.split(' ')[1] || t}
               </button>
             ))}
           </div>
        </div>
      </div>

      {/* Tabela de Ausências */}
      <div className="flex-1 bg-[#0D1528] border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-[#0D1528]/80 backdrop-blur-xl text-left">
              <tr>
                <th className="w-0 p-0 border-b border-white/5"></th>
                <th className="w-24 px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">Data</th>
                <th className="min-w-[250px] px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">Colaborador</th>
                <th className="w-40 px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 text-center">Tipo</th>
                <th className="min-w-[300px] px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">Motivo</th>
                <th className="w-40 px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">Tratamento</th>
                <th className="w-32 px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 text-right">Empresa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-5"><div className="h-2 bg-white/5 rounded-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-32 text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-gray-800" />
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Nenhuma ausência registrada</p>
                  </td>
                </tr>
              ) : (
                filtered.map((abs) => {
                  const config = TYPE_CONFIG[abs.type] || { label: abs.type, color: 'text-gray-400', border: 'border-white/10', bg: 'bg-white/5' };
                  const isNutri = (abs.employees?.company || "").toUpperCase() === "NUTRIVIDA";
                  const isJustified = abs.type === 'Falta Justificada';

                  return (
                    <tr 
                      key={abs.id}
                      className="group transition-all hover:bg-white/[0.03] relative"
                    >
                      {/* Efeito Lateral de Brilho */}
                      <td className="relative p-0 w-0 border-b border-white/[0.02]">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02]">
                        <div className="flex items-center gap-2">
                           <Calendar size={12} className="text-gray-700 group-hover:text-red-500/50 transition-colors" />
                           <span className="text-[11px] font-bold text-gray-500 group-hover:text-white transition-colors">{formatDate(abs.date)}</span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02]">
                        <div className="flex flex-col cursor-pointer" onClick={() => router.push(`/dashboard/employees/${abs.employee_id}`)}>
                          <span className="text-[13px] font-bold text-gray-400 group-hover:text-white transition-colors truncate">
                            {abs.employees?.name}
                          </span>
                          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">
                            {abs.employees?.job_title}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02] text-center">
                        <span className={cn(
                          "inline-flex px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest",
                          config.bg, config.border, config.color
                        )}>
                          {config.label}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02]">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter truncate max-w-[300px]">
                          {abs.reason || "MOTIVO NÃO INFORMADO"}
                        </p>
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <FileText size={11} className={cn("text-gray-700", isJustified && "text-emerald-500/50")} />
                          <span className={cn(
                            "text-[10px] font-bold uppercase italic",
                            isJustified ? "text-emerald-400" : "text-gray-500"
                          )}>
                            {isJustified ? "ABONADA" : (abs.treatment || "PENDENTE")}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 border-b border-white/[0.02] text-right">
                         <span className={cn(
                            "text-[9px] px-2.5 py-1 rounded-md border tracking-tighter uppercase font-black inline-block whitespace-nowrap transition-all group-hover:scale-105",
                            isNutri 
                              ? "text-purple-400 border-purple-500/50 bg-purple-500/10" 
                              : "text-white border-white/40 bg-black/40"
                          )}>
                            {abs.employees?.company || "MONDIAL"}
                          </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabela */}
        <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
              Total de Ocorrências: {filtered.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-red-400/80 uppercase tracking-[0.2em]">Live Monitoring System</span>
          </div>
        </div>
      </div>

    </div>
  );
}
