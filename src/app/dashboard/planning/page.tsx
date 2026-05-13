"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Sun, Sunset, Moon, Warehouse, Truck, Search, X, Check, Loader2 } from "lucide-react";
import React from 'react';

// ─── TIPOS ────────────────────────────────────────────────────
type Employee = {
  employee_id: number;
  name: string;
  hire_date: string;
  job_title: string;
  company: string;
  Shift: string;
  status: string;
  process?: string;
  sector?: string;
  class?: string;
};

// ─── CONFIGURAÇÕES ────────────────────────────────────────────
const SHIFTS = [
  { key: "Turno 1", label: "Manhã", icon: Sun,    accent: "#38BDF8", keywords: ["manhã","manha","1"] },
  { key: "Turno 2", label: "Tarde", icon: Sunset, accent: "#FB7185", keywords: ["tarde","2"] },
  { key: "Turno 3", label: "Noite", icon: Moon,   accent: "#A78BFA", keywords: ["noite","3"] },
  { key: "Turno ADM", label: "ADM", icon: Search, accent: "#A78BFA", keywords: ["adm","administrativo"] },
];

const SECTOR_KEYS = ["Liderança", "Administrativo", "Conferente", "Empilhador", "Operacional"] as const;
type SectorKey = typeof SECTOR_KEYS[number];

function getOpSection(emp: Employee): "arm" | "exp" {
  const s = (emp.sector || "").toLowerCase();
  const j = (emp.job_title || "").toLowerCase();
  if (s.includes("expedi") || j.includes("expedi")) return "exp";
  return "arm";
}

function getRoleKey(emp: Employee): SectorKey {
  const title = (emp.job_title || "").toLowerCase();
  if (title.includes("lider") || title.includes("líder") || title.includes("supervisor") || title.includes("encarregado")) return "Liderança";
  if (title.includes("adm") || title.includes("analista") || title.includes("assistente") || title.includes("aprendiz")) return "Administrativo";
  if (title.includes("conferente")) return "Conferente";
  if (title.includes("empilhador") || title.includes("empilhadeira")) return "Empilhador";
  return "Operacional";
}

// ─── PAGE ─────────────────────────────────────────────────────
export default function PlanningPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [activeTab, setActiveTab] = useState<"arm" | "exp" | "adm">("arm");
  
  // Modal State
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").order("name");
    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("employees")
      .update({
        job_title: selectedEmp.job_title,
        process: selectedEmp.process,
        class: selectedEmp.class,
        company: selectedEmp.company,
        Shift: selectedEmp.Shift,
        sector: selectedEmp.sector
      })
      .eq("employee_id", selectedEmp.employee_id);

    if (!error) {
      await fetchEmployees();
      setSelectedEmp(null);
    }
    setIsSaving(false);
  };

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const section = getOpSection(e);
      
      if (activeTab === "adm") {
        return matchesSearch && (e.Shift || "").toLowerCase().includes("adm");
      }
      
      return matchesSearch && section === activeTab;
    });
  }, [employees, search, activeTab]);

  const visibleShifts = activeTab === "adm" 
    ? SHIFTS.filter(s => s.key === "Turno ADM")
    : SHIFTS.filter(s => s.key !== "Turno ADM");

  return (
    <div className="min-h-screen bg-[#050B1D] p-4 lg:p-6 text-gray-400 font-sans flex flex-col overflow-hidden relative">
      
      {/* Header Minimalist */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Painel Operacional</h1>
          <p className="text-blue-400/40 text-[9px] uppercase tracking-[0.4em] font-bold mt-1">Gestão de Equipes • G300</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#182337]/40 p-1.5 rounded-xl border border-white/10 flex gap-1 shadow-lg text-gray-100">
            <button
              onClick={() => setActiveTab("arm")}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 tracking-wider",
                activeTab === "arm" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Warehouse size={13} strokeWidth={2} /> ARMAZENAGEM
            </button>
            <button
              onClick={() => setActiveTab("exp")}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 tracking-wider",
                activeTab === "exp" ? "bg-emerald-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Truck size={13} strokeWidth={2} /> EXPEDIÇÃO
            </button>
            <button
              onClick={() => setActiveTab("adm")}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 tracking-wider",
                activeTab === "adm" ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Search size={13} strokeWidth={2} /> TURNO ADM
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} strokeWidth={2} />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#182337]/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/30 w-44 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid Turnos */}
      <div className="flex-1 overflow-hidden">
        <div className={cn(
          "grid gap-6 h-full transition-all duration-500",
          activeTab === "adm" ? "grid-cols-1 max-w-2xl mx-auto" : "grid-cols-1 lg:grid-cols-3"
        )}>
          {visibleShifts.map((shift) => {
            const shiftEmps = filtered.filter(e => {
              const s = e.Shift?.toLowerCase() || "";
              return shift.keywords.some(k => s.includes(k));
            });

            return (
              <div key={shift.key} className="bg-[#0D1528]/40 border border-white/5 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
                {/* Header Turno */}
                <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#050B1D] border border-white/10" style={{ color: shift.accent }}>
                      <shift.icon size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-widest text-gray-500 font-bold">{shift.key}</span>
                      <h2 className="text-base font-bold text-white tracking-tight">{shift.label}</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-[11px] font-bold">
                    <span className="text-white">{shiftEmps.length}</span>
                    <span className="text-[9px] text-gray-500 font-bold tracking-tight">PESSOAS</span>
                  </div>
                </div>

                {/* Tabela de Planilha */}
                <div className="flex-1 overflow-x-auto custom-scrollbar overflow-y-auto relative">
                  {shiftEmps.length > 0 ? (
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead className="sticky top-0 bg-[#0D1528] z-20 border-b border-white/10 text-left">
                        <tr>
                          <th className="w-0 p-0"></th>
                          <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Colaborador / Função</th>
                          <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Processo</th>
                          <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-bold text-right">Empresa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SECTOR_KEYS.map(cat => {
                          const catEmps = shiftEmps.filter(e => getRoleKey(e) === cat)
                            .sort((a, b) => {
                              const aM = a.company?.toLowerCase().includes("mondial");
                              const bM = b.company?.toLowerCase().includes("mondial");
                              if (aM && !bM) return -1;
                              if (!aM && bM) return 1;
                              return a.name.localeCompare(b.name);
                            });

                          if (catEmps.length === 0) return null;

                          return (
                            <React.Fragment key={cat}>
                              <tr className="bg-white/[0.03] border-y border-white/10">
                                <td colSpan={4} className="px-4 py-1.5">
                                  <span className="text-[9px] uppercase tracking-[0.2em] text-blue-400 font-bold whitespace-nowrap">
                                    {cat}
                                  </span>
                                </td>
                              </tr>
                              {catEmps.map((emp) => {
                                const isNutri = emp.company?.toLowerCase().includes("nutri");
                                return (
                                  <tr 
                                    key={emp.employee_id} 
                                    onClick={() => setSelectedEmp(emp)}
                                    className="border-b border-white/[0.03] hover:bg-blue-500/[0.05] transition-all group cursor-pointer relative"
                                  >
                                    <td className="relative p-0 w-0">
                                      {/* Indicador de Hover Lateral */}
                                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                    </td>
                                    
                                    <td className="px-4 py-2.5 relative">
                                      <div className="flex flex-col whitespace-nowrap group-hover:translate-x-1 transition-transform duration-200">
                                        <span className="text-[13px] font-semibold text-gray-400 group-hover:text-white transition-colors">
                                          {emp.name}
                                        </span>
                                        <div className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-tight">
                                          <span className="text-gray-500 group-hover:text-gray-400 transition-colors">{emp.job_title}</span>
                                          {emp.class && (
                                            <>
                                              <span className="text-gray-700">•</span>
                                              <span className="text-blue-400/80 font-bold group-hover:text-blue-400 transition-colors">{emp.class}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span className="text-[10px] text-gray-500 font-bold uppercase italic block whitespace-nowrap group-hover:text-gray-400 transition-colors">
                                        {emp.process || "—"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      <span className={cn(
                                        "text-[9px] px-2.5 py-1 rounded-md border tracking-tighter uppercase font-black inline-block whitespace-nowrap transition-all group-hover:scale-105",
                                        isNutri 
                                          ? "text-purple-400 border-purple-500/50 bg-purple-500/10" 
                                          : "text-white border-white/40 bg-black/40"
                                      )}>
                                        {isNutri ? "NUTRIVIDA" : "MONDIAL"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center p-6">
                      <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3">
                        <Loader2 className="text-gray-700 animate-spin-slow" size={20} />
                      </div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Nenhum colaborador escalado</p>
                      <p className="text-[9px] text-gray-700 mt-1 uppercase tracking-tighter font-medium italic">Este turno está livre hoje</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Edição */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050B1D]/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="bg-[#0D1528] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-white font-bold tracking-tight">Editar Planejamento</h3>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-0.5">{selectedEmp.name}</p>
              </div>
              <button 
                onClick={() => setSelectedEmp(null)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Seleção de Turno Customizada */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">Selecione o Turno</label>
                <div className="grid grid-cols-4 gap-2">
                  {SHIFTS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSelectedEmp({...selectedEmp, Shift: s.key})}
                      className={cn(
                        "py-2.5 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center gap-1.5",
                        selectedEmp.Shift === s.key
                          ? "bg-blue-600/20 border-blue-600 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                          : "bg-white/[0.02] border-white/10 text-gray-500 hover:border-white/20 hover:bg-white/[0.04]"
                      )}
                    >
                      <s.icon size={14} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seleção de Operação Customizada */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">Operação Principal</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "Armazenagem", label: "Armazenagem", icon: Warehouse, color: "emerald" },
                    { id: "Expedição", label: "Expedição", icon: Truck, color: "blue" }
                  ].map((op) => {
                    const isActive = (selectedEmp.sector || "").toLowerCase().includes(op.id.toLowerCase().substring(0, 3));
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setSelectedEmp({...selectedEmp, sector: op.id})}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-2",
                          isActive
                            ? "bg-emerald-600/20 border-emerald-600 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            : "bg-white/[0.02] border-white/10 text-gray-500 hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                      >
                        <op.icon size={16} />
                        {op.label.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Função (Cargo)</label>
                  <input 
                    value={selectedEmp.job_title}
                    onChange={e => setSelectedEmp({...selectedEmp, job_title: e.target.value})}
                    className="w-full bg-[#182337]/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Classe</label>
                  <input 
                    value={selectedEmp.class || ""}
                    onChange={e => setSelectedEmp({...selectedEmp, class: e.target.value})}
                    placeholder="Ex: SUBSTITUIÇÃO"
                    className="w-full bg-[#182337]/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Processo Atual</label>
                <input 
                  value={selectedEmp.process || ""}
                  onChange={e => setSelectedEmp({...selectedEmp, process: e.target.value})}
                  placeholder="Ex: RECEBIMENTO, CARREGAMENTO"
                  className="w-full bg-[#182337]/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>

              {/* Seleção de Empresa Customizada */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">Empresa Responsável</label>
                <div className="grid grid-cols-2 gap-2">
                  {["MONDIAL", "NUTRIVIDA"].map((emp) => {
                    const isActive = selectedEmp.company === emp;
                    return (
                      <button
                        key={emp}
                        type="button"
                        onClick={() => setSelectedEmp({...selectedEmp, company: emp})}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-bold border transition-all",
                          isActive
                            ? emp === "NUTRIVIDA" 
                              ? "bg-purple-600/20 border-purple-600 text-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.2)]"
                              : "bg-blue-600/20 border-blue-600 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                            : "bg-white/[0.02] border-white/10 text-gray-500 hover:border-white/20"
                        )}
                      >
                        {emp}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setSelectedEmp(null)}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-[10px] font-bold text-gray-400 hover:bg-white/5 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-[10px] font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  SALVAR ALTERAÇÕES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
