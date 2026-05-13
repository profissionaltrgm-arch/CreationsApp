"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Settings, ShieldAlert, ChevronDown, Calendar, Search, Filter, MoreVertical, X, Check, Loader2, Info, User, MessageSquare, Plus, FileText, Zap,
  ChevronUp, Warehouse, Truck, Sun, Sunset, Moon, Shield, Users, Camera, Activity, AlertCircle, Briefcase, UserMinus, Award
} from "lucide-react";
import { ObservationManager } from "@/components/employees/ObservationManager";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";

type Employee = {
  employee_id: number;
  name: string;
  hire_date: string;
  job_title: string;
  company: string;
  Shift: string;
  status: string;
  sex: string;
  sector?: string;
  process?: string;
  class?: string;
};

const EMPTY_FORM = {
  employee_id: "",
  name: "",
  job_title: "",
  company: "MONDIAL",
  sex: "Masculino",
  status: "Ativo",
  hire_date: new Date().toISOString().split("T")[0],
  Shift: "Turno 1",
  sector: "Armazenagem",
  process: "",
  class: ""
};

const SHIFTS = [
  { key: "Turno 1", label: "T1", full: "Manhã", icon: Sun },
  { key: "Turno 2", label: "T2", full: "Tarde", icon: Sunset },
  { key: "Turno 3", label: "T3", full: "Noite", icon: Moon },
  { key: "Turno ADM", label: "ADM", full: "ADM", icon: Shield },
];

const REASONS = [
  "Não mencionado", "Atestado médico", "Consulta médica", "Atestado de comparecimento", 
  "Acompanhamento de dependente", "Acompanhamento médico", "Falecimento familiar", 
  "Casamento", "Nascimento de filho", "Problemas pessoais", "Transporte", "Acidente", 
  "Convocação judicial", "Doação de sangue", "Alistamento militar", "Exame médico", 
  "Internação", "Cirurgia", "Emergência familiar", "Convocação eleitoral", 
  "Comparecimento em audiência", "Licença maternidade", "Licença paternidade", 
  "Acidente de trabalho", "Acidente de trajeto", "Problemas climáticos graves", "Outros"
];

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [shiftFilter, setShiftFilter] = useState("Todos");
  const [sectorFilter, setSectorFilter] = useState("Todos");
  const [processFilter, setProcessFilter] = useState("Todos");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee; direction: "asc" | "desc" } | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Employee | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"resumo" | "faltas" | "suspensoes" | "habilidades" | "observacoes">("resumo");
  const [selectedClassification, setSelectedClassification] = useState<string>("Falta Injustificada");
  const [selectedRootCause, setSelectedRootCause] = useState<string>("Não mencionado");
  const [otherReason, setOtherReason] = useState<string>("");
  const [absenceObservation, setAbsenceObservation] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("Descontar");

  useEffect(() => {
    if (selectedClassification === "Falta Justificada") {
      setSelectedTreatment("Abonada");
    } else if (selectedClassification === "Falta Injustificada") {
      setSelectedTreatment("Descontar");
    }
  }, [selectedClassification]);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirmAbsence() {
    if (!selectedProfile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('absences')
        .insert([{
          employee_id: selectedProfile.employee_id,
          date: new Date().toISOString().split('T')[0],
          type: selectedClassification,
          reason: selectedRootCause === 'Outros' ? otherReason : selectedRootCause,
          treatment: selectedTreatment,
          observation: absenceObservation,
        }]);

      if (error) {
        console.error("Erro ao salvar ausência:", error);
        alert("Erro ao salvar registro: " + error.message);
        return;
      }
      
      setAbsenceObservation("");
      setOtherReason("");
      alert("Registro de ausência confirmado com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { fetchEmployees(); }, []);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("employees").select("*").order('name', { ascending: true });
      if (error) setError(error.message);
      else if (data) setEmployees(data as Employee[]);
    } catch (err) {
      setError("Erro ao carregar colaboradores.");
    } finally {
      setLoading(false);
    }
  }



  async function handleSaveEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("O nome é obrigatório."); return; }
    setError("");
    setSaving(true);
    const { error: err } = await supabase.from("employees").insert({
      employee_id: parseInt(form.employee_id) || 0,
      name: form.name.trim(),
      job_title: form.job_title.trim() || null,
      company: form.company,
      sex: form.sex,
      status: form.status,
      hire_date: form.hire_date || null,
      Shift: form.Shift,
      sector: form.sector,
      process: form.process,
      class: form.class
    });
    if (err) { setError(err.message); setSaving(false); return; }
    await fetchEmployees();
    setForm(EMPTY_FORM);
    setShowModal(false);
    setSaving(false);
  }

  const handleSort = (key: keyof Employee) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const filtered = useMemo(() => {
    let result = [...employees];
    result = result.filter((emp) => {
      const searchStr = search.toLowerCase();
      const matchesSearch =
        (emp.name?.toLowerCase() || "").includes(searchStr) ||
        (emp.employee_id?.toString() || "").includes(searchStr) ||
        (emp.job_title?.toLowerCase() || "").includes(searchStr);

      const matchesUnit = unitFilter === "Todas" || (emp.company || "").toUpperCase() === unitFilter.toUpperCase();
      const matchesStatus = statusFilter === "Todos" || (emp.status || "").toUpperCase() === statusFilter.toUpperCase();
      const matchesShift = shiftFilter === "Todos" || (emp.Shift || "").toUpperCase() === shiftFilter.toUpperCase();
      const matchesSector = sectorFilter === "Todos" || (emp.sector || "").toUpperCase() === sectorFilter.toUpperCase();
      const matchesProcess = processFilter === "Todos" || (emp.process || "").toUpperCase() === processFilter.toUpperCase();

      return matchesSearch && matchesUnit && matchesStatus && matchesShift && matchesSector && matchesProcess;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const vA = (a[sortConfig.key] || "").toString(), vB = (b[sortConfig.key] || "").toString();
        if (vA < vB) return sortConfig.direction === "asc" ? -1 : 1;
        if (vA > vB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [employees, search, unitFilter, statusFilter, shiftFilter, sectorFilter, processFilter, sortConfig]);

  const sectors = useMemo(() => ["Todos", ...Array.from(new Set(employees.map(e => e.sector).filter(Boolean)))], [employees]);
  const processes = useMemo(() => ["Todos", ...Array.from(new Set(employees.map(e => e.process).filter(Boolean)))], [employees]);
  const shifts = useMemo(() => ["Todos", "Turno 1", "Turno 2", "Turno 3", "Turno ADM"], []);



  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden">
      
      {/* Header Premium */}
      <div className="flex items-end justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
            <Users className="text-blue-500" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">Colaboradores</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Gestão de Base Ativa · G300
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex bg-[#0D1528] border border-white/5 p-1 rounded-xl">
             {["Todas", "MONDIAL", "NUTRIVIDA"].map(u => (
               <button
                key={u}
                onClick={() => setUnitFilter(u)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                  unitFilter === u ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-400"
                )}
               >
                {u}
               </button>
             ))}
           </div>
           <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
           >
            <Plus size={16} strokeWidth={3} />
            Novo Registro
           </button>
        </div>
      </div>

      {/* Toolbar & Busca */}
      <div className="flex flex-col gap-4 px-1">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="PESQUISAR POR NOME, MATRÍCULA OU CARGO..."
              className="w-full bg-[#0D1528] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-[11px] font-bold text-white uppercase tracking-widest focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700"
            />
          </div>
          
          <div className="relative group/status">
            <button className="h-10 px-5 rounded-2xl bg-[#0D1528] border border-white/5 flex items-center gap-4 hover:border-white/10 transition-all active:scale-95 shadow-xl">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status: {statusFilter}</span>
              <ChevronDown size={14} className="text-gray-600 group-hover/status:rotate-180 transition-transform duration-300" />
            </button>
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#0D1528] border border-white/10 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible translate-y-2 group-hover/status:translate-y-0 transition-all duration-300 z-50 backdrop-blur-xl">
              {["Todos", "Ativo", "Inativo", "Afastado", "Desligado"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-left transition-all hover:bg-white/5 flex items-center gap-3",
                    statusFilter === s ? "text-blue-400 bg-blue-600/10" : "text-gray-500"
                  )}
                >
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    s === "Ativo" ? "bg-emerald-500" : s === "Inativo" ? "bg-red-500" : s === "Afastado" ? "bg-gray-500" : s === "Desligado" ? "bg-red-700" : "bg-blue-500"
                  )} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Linha de Filtros Secundários */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0D1528] border border-white/5 rounded-xl">
            <Filter size={12} className="text-gray-600" />
            <select 
              value={shiftFilter}
              onChange={e => setShiftFilter(e.target.value)}
              className="bg-transparent text-[10px] font-black text-gray-400 uppercase tracking-tighter focus:outline-none cursor-pointer"
            >
              <option value="Todos" className="bg-[#0D1528]">TURNO: TODOS</option>
              {shifts.filter(s => s !== "Todos").map(s => (
                <option key={s} value={s} className="bg-[#0D1528]">{s.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0D1528] border border-white/5 rounded-xl">
            <Filter size={12} className="text-gray-600" />
            <select 
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="bg-transparent text-[10px] font-black text-gray-400 uppercase tracking-tighter focus:outline-none cursor-pointer"
            >
              <option value="Todos" className="bg-[#0D1528]">SETOR: TODOS</option>
              {sectors.filter(s => s !== "Todos").map(s => (
                <option key={s as string} value={s as string} className="bg-[#0D1528]">{String(s).toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0D1528] border border-white/5 rounded-xl">
            <Filter size={12} className="text-gray-600" />
            <select 
              value={processFilter}
              onChange={e => setProcessFilter(e.target.value)}
              className="bg-transparent text-[10px] font-black text-gray-400 uppercase tracking-tighter focus:outline-none cursor-pointer"
            >
              <option value="Todos" className="bg-[#0D1528]">PROCESSO: TODOS</option>
              {processes.filter(p => p !== "Todos").map(p => (
                <option key={p as string} value={p as string} className="bg-[#0D1528]">{String(p).toUpperCase()}</option>
              ))}
            </select>
          </div>

          {(shiftFilter !== "Todos" || sectorFilter !== "Todos" || processFilter !== "Todos" || unitFilter !== "Todas" || statusFilter !== "Todos" || search) && (
            <button 
              onClick={() => {
                setShiftFilter("Todos");
                setSectorFilter("Todos");
                setProcessFilter("Todos");
                setUnitFilter("Todas");
                setStatusFilter("Todos");
                setSearch("");
              }}
              className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors ml-2"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Alta Densidade */}
      <div className="flex-1 bg-[#0D1528] border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-[#0D1528]/80 backdrop-blur-xl">
              <tr>
                <th className="w-0 p-0 border-b border-white/5"></th>
                {[
                  { label: "#", key: null, width: "w-12" },
                  { label: "Colaborador", key: "name", width: "min-w-[250px]" },
                  { label: "Matrícula", key: "employee_id", width: "w-28" },
                  { label: "Turno", key: "Shift", width: "w-24" },
                  { label: "Setor", key: "sector", width: "w-32" },
                  { label: "Cargo", key: "job_title", width: "w-40" },
                  { label: "Classe", key: "class", width: "w-32" },
                  { label: "Processo", key: "process", width: "w-40" },
                  { label: "Tempo de Casa", key: "hire_date", width: "w-32" },
                  { label: "Empresa", key: "company", width: "w-32" },
                  { label: "Status", key: "status", width: "w-28" },
                ].map((col) => (
                  <th 
                    key={col.label}
                    onClick={() => col.key && handleSort(col.key as keyof Employee)}
                    className={cn(
                      "px-6 py-4 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5",
                      col.width,
                      col.key && "cursor-pointer hover:text-white transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      {sortConfig?.key === col.key && (
                        sortConfig.direction === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={12} className="px-6 py-4"><div className="h-2 bg-white/5 rounded-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-32 text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-gray-800" />
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Nenhum colaborador encontrado</p>
                  </td>
                </tr>
              ) : (
                filtered.map((emp, index) => {
                  const isNutri = (emp.company || "").toUpperCase() === "NUTRIVIDA";
                  return (
                    <tr 
                      key={emp.employee_id}
                      onClick={() => {
                        setSelectedProfile(emp);
                        setActiveModalTab("resumo");
                      }}
                      className="group transition-all hover:bg-white/[0.03] relative cursor-pointer"
                    >
                      {/* Efeito Lateral de Brilho */}
                      <td className="relative p-0 w-0">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                      </td>

                      <td className="px-4 py-2.5 text-center border-b border-white/[0.02]">
                        <span className="text-[10px] font-bold text-gray-700 group-hover:text-blue-500/50 transition-colors">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 border-b border-white/[0.02]">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-gray-400 group-hover:text-white transition-colors truncate">
                            {emp.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 border-b border-white/[0.02]">
                        <span className="text-[11px] font-bold text-blue-500/80 tracking-tighter">
                          #{emp.employee_id}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 border-b border-white/[0.02]">
                        <div className="flex items-center gap-1.5">
                          {SHIFTS.find(s => s.key === emp.Shift)?.icon && React.createElement(SHIFTS.find(s => s.key === emp.Shift)!.icon, { size: 10, className: "text-orange-400" })}
                          <span className="text-[10px] font-bold text-gray-500 uppercase">
                            {emp.Shift === "Turno 1" ? "T1" : emp.Shift === "Turno 2" ? "T2" : emp.Shift === "Turno 3" ? "T3" : "ADM"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 border-b border-white/[0.02]">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter whitespace-nowrap">
                          {emp.sector || "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 border-b border-white/[0.02]">
                        <span className="text-[10px] font-bold text-gray-500 uppercase truncate block whitespace-nowrap">
                          {emp.job_title}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 border-b border-white/[0.02]">
                        <span className="text-[10px] font-bold text-blue-400/80 uppercase whitespace-nowrap">
                          {emp.class || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 border-b border-white/[0.02]">
                        <span className="text-[10px] font-bold text-gray-500 uppercase italic whitespace-nowrap">
                          {emp.process || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 border-b border-white/[0.02]">
                        <div className="flex flex-col items-start whitespace-nowrap">
                          <span className="text-[11px] font-bold text-white/90">{seniority(emp.hire_date)}</span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 border-b border-white/[0.02]">
                         <span className={cn(
                            "text-[9px] px-2.5 py-1 rounded-md border tracking-tighter uppercase font-black inline-block whitespace-nowrap transition-all group-hover:scale-105",
                            isNutri 
                              ? "text-purple-400 border-purple-500/50 bg-purple-500/10" 
                              : "text-white border-white/40 bg-black/40"
                          )}>
                            {emp.company || "MONDIAL"}
                          </span>
                      </td>

                      <td className="px-4 py-2.5 border-b border-white/[0.02]">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap transition-all",
                          emp.status === "Ativo" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            emp.status === "Ativo" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                          )} />
                          {emp.status}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabela */}
        <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                {employees.filter(e => e.status === "Ativo").length} Ativos
              </span>
            </div>
            <div className="w-[1px] h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                {employees.length} Total
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Página 1 de 1</span>
          </div>
        </div>
      </div>

      {/* Modal Novo Registro */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050B1D]/80 backdrop-blur-md animate-in fade-in duration-200">
            <div 
              className="bg-[#0D1528] border border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                     <Plus className="text-blue-500" size={20} />
                   </div>
                   <div>
                    <h3 className="text-white font-bold tracking-tight text-lg">Novo Colaborador</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Cadastro de Base Operacional</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEmployee} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Nome Completo</label>
                    <input 
                      required
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="DIGITE O NOME COMPLETO..."
                      className="w-full bg-[#182337]/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-700 uppercase font-bold tracking-widest"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-blue-400/80">Matrícula</label>
                    <input 
                      required
                      type="number"
                      value={form.employee_id}
                      onChange={e => setForm({...form, employee_id: e.target.value})}
                      placeholder="EX: 1234"
                      className="w-full bg-[#182337]/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-700 font-bold tracking-widest"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-pink-400/80">Sexo</label>
                    <div className="grid grid-cols-2 gap-4">
                      {["Masculino", "Feminino"].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm({...form, sex: s})}
                          className={cn(
                            "py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all",
                            form.sex === s
                              ? "bg-white/10 border-white/20 text-white shadow-xl scale-[1.02]"
                              : "bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/10"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Turno</label>
                    <div className="grid grid-cols-4 gap-2">
                      {SHIFTS.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setForm({...form, Shift: s.key})}
                          className={cn(
                            "py-2 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center gap-1",
                            form.Shift === s.key
                              ? "bg-blue-600/20 border-blue-600 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                              : "bg-white/[0.02] border-white/10 text-gray-500 hover:border-white/20"
                          )}
                        >
                          <s.icon size={12} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Setor</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "Armazenagem", label: "ARM", icon: Warehouse },
                        { id: "Expedição", label: "EXP", icon: Truck }
                      ].map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setForm({...form, sector: op.id})}
                          className={cn(
                            "py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-2",
                            form.sector === op.id
                              ? "bg-emerald-600/20 border-emerald-600 text-emerald-400"
                              : "bg-white/[0.02] border-white/10 text-gray-500 hover:border-white/20"
                          )}
                        >
                          <op.icon size={12} />
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-white/50">Função (Cargo)</label>
                    <input 
                      value={form.job_title}
                      onChange={e => setForm({...form, job_title: e.target.value})}
                      placeholder="EX: CONFERENTE"
                      className="w-full bg-[#182337]/40 border border-white/10 rounded-2xl px-5 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-white/50">Classe</label>
                    <input 
                      value={form.class}
                      onChange={e => setForm({...form, class: e.target.value})}
                      placeholder="EX: SUBSTITUIÇÃO"
                      className="w-full bg-[#182337]/40 border border-white/10 rounded-2xl px-5 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-white/50">Processo</label>
                    <input 
                      value={form.process}
                      onChange={e => setForm({...form, process: e.target.value})}
                      placeholder="EX: RECEBIMENTO"
                      className="w-full bg-[#182337]/40 border border-white/10 rounded-2xl px-5 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-white/50">Admissão</label>
                    <input 
                      type="date"
                      value={form.hire_date}
                      onChange={e => setForm({...form, hire_date: e.target.value})}
                      className="w-full bg-[#182337]/40 border border-white/10 rounded-2xl px-5 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Empresa</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["MONDIAL", "NUTRIVIDA"].map((emp) => (
                        <button
                          key={emp}
                          type="button"
                          onClick={() => setForm({...form, company: emp})}
                          className={cn(
                            "py-3 rounded-xl text-[10px] font-bold border transition-all",
                            form.company === emp
                              ? emp === "NUTRIVIDA" ? "bg-purple-600/20 border-purple-600 text-purple-400" : "bg-blue-600/20 border-blue-600 text-blue-400"
                              : "bg-white/[0.02] border-white/10 text-gray-500 hover:border-white/20"
                          )}
                        >
                          {emp}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Ativo", "Inativo", "Afastado", "Desligado"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm({...form, status: s})}
                          className={cn(
                            "py-3 rounded-xl text-[9px] font-bold border transition-all",
                            form.status === s
                              ? s === "Ativo" ? "bg-emerald-600/20 border-emerald-600 text-emerald-400" : s === "Inativo" ? "bg-red-600/20 border-red-600 text-red-400" : "bg-gray-600/20 border-gray-600 text-gray-400"
                              : "bg-white/[0.02] border-white/10 text-gray-500"
                          )}
                        >
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <X size={14} />
                    {error}
                  </div>
                )}

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-white/10 text-[11px] font-bold text-gray-500 hover:bg-white/5 transition-all uppercase tracking-[0.2em]"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-[1.5] bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={4} />}
                    Finalizar Cadastro
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Perfil do Colaborador (Comando Central) */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProfile(null)}
              className="absolute inset-0 bg-[#050B1D]/90 backdrop-blur-xl"
            />
            
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="relative w-[95vw] h-[90vh] bg-[#0D1528] border border-white/10 rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
              >
                {/* Cabeçalho Superior (Header) */}
                <div className="p-8 pb-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                  <div className="flex items-center gap-6">
                    <div className="relative group/photo shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-[#0D1528] border border-white/10 shadow-xl overflow-hidden flex items-center justify-center relative transition-transform group-hover/photo:scale-105 duration-500">
                        <span className="text-3xl font-bold text-gray-700">{selectedProfile.name.charAt(0)}</span>
                        <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <Camera size={14} className="text-white/70" />
                        </div>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500 border-2 border-[#0D1528] shadow-lg flex items-center justify-center">
                        <Check size={12} className="text-[#0D1528] font-bold" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight leading-tight uppercase">{selectedProfile.name}</h2>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           Ativo
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                        <div className="flex items-center gap-2">
                           <Briefcase size={14} className="text-blue-500/50" />
                           {selectedProfile.job_title}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">•</div>
                        <div className="flex items-center gap-2">
                           <Warehouse size={14} className="text-blue-500/50" />
                           {selectedProfile.company}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">•</div>
                        <div className="flex items-center gap-2">
                           <Sun size={14} className="text-blue-500/50" />
                           {selectedProfile.Shift}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all">
                       <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => setSelectedProfile(null)}
                      className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                       <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Barra de Navegação (Tabs) */}
                <div className="px-8 py-4 bg-[#0D1528] border-b border-white/5 flex items-center gap-2">
                  {[
                    { id: "resumo", label: "Resumo", icon: FileText },
                    { id: "faltas", label: "Faltas", icon: Activity },
                    { id: "suspensoes", label: "Suspensões", icon: UserMinus },
                    { id: "habilidades", label: "Habilidades", icon: Award },
                    { id: "observacoes", label: "Observações", icon: Zap }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveModalTab(tab.id as any)}
                      className={cn(
                        "px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-3 border",
                        activeModalTab === tab.id 
                          ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                          : "bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-300"
                      )}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Área de Conteúdo (Scrollable) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                  <AnimatePresence mode="wait">
                    {activeModalTab === "resumo" && (
                      <motion.div
                        key="resumo"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-12"
                      >
                         <section>
                            <div className="flex items-center gap-4 mb-6">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                               <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Dados Contratuais e Pessoais</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                               <div>
                                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-4">Matrícula</span>
                                  <span className="text-xl font-bold text-blue-500 tracking-tight">#{selectedProfile.employee_id}</span>
                               </div>
                               <div>
                                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-4">Data de Admissão</span>
                                  <span className="text-xl font-bold text-gray-300 tracking-tight">{selectedProfile.hire_date || "—"}</span>
                               </div>
                               <div>
                                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-4">Gênero / Sexo</span>
                                  <span className="text-xl font-bold text-gray-300 tracking-tight">{selectedProfile.sex}</span>
                               </div>
                               <div>
                                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-4">Tempo de Empresa</span>
                                  <span className="text-xl font-bold text-gray-300 tracking-tight">{seniority(selectedProfile.hire_date)}</span>
                               </div>
                            </div>
                         </section>

                         <section>
                            <div className="flex items-center gap-4 mb-6">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                               <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Processos Operacionais</h5>
                            </div>
                            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                               <Zap size={32} className="text-gray-800 mb-4" />
                               <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Nenhum processo vinculado</p>
                            </div>
                         </section>
                      </motion.div>
                    )}

                    {activeModalTab === "faltas" && (
                      <motion.div
                        key="faltas"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                         <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                            <div className="flex items-center justify-between mb-8">
                               <h3 className="text-base font-bold text-white uppercase tracking-widest">Registrar Nova Ausência</h3>
                               <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-bold uppercase tracking-widest">Ocorrência</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div className="space-y-6">
                                  <div>
                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Classificação</label>
                                    <div className="grid grid-cols-2 gap-2">
                                      {["Falta Justificada", "Falta Injustificada", "Falta Parcial", "Atraso", "Sa\u00edda Antecipada", "Suspens\u00e3o", "Afastamento"].map((tipo) => (
                                         <button 
                                           key={tipo}
                                           onClick={() => setSelectedClassification(tipo)}
                                           className={cn(
                                             "py-3 px-4 rounded-xl border text-[9px] font-bold uppercase tracking-wide text-left flex items-center justify-between transition-all",
                                             selectedClassification === tipo 
                                               ? "bg-blue-600 border-blue-500 text-white shadow-lg" 
                                               : "bg-white/[0.02] border-white/5 text-gray-400 hover:border-blue-500/30 hover:text-white"
                                           )}
                                         >
                                           {tipo}
                                           <div className={cn("w-2 h-2 rounded-full", selectedClassification === tipo ? "bg-white" : "bg-blue-500/20")} />
                                         </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Tratamento</label>
                                    <div className="grid grid-cols-3 gap-2">
                                      {["Banco de horas", "Descontar", "Abonada"].map((t) => {
                                         const isLocked = (selectedClassification === "Falta Justificada" && t !== "Abonada") || 
                                                         (selectedClassification === "Falta Injustificada" && t !== "Descontar");
                                         return (
                                           <button 
                                             key={t}
                                             disabled={isLocked}
                                             onClick={() => setSelectedTreatment(t)}
                                             className={cn(
                                               "py-3 px-3 rounded-xl border text-[9px] font-bold uppercase tracking-wide text-center transition-all",
                                               selectedTreatment === t 
                                                 ? "bg-emerald-600 border-emerald-500 text-white shadow-lg" 
                                                 : "bg-white/[0.02] border-white/5 text-gray-400 hover:border-emerald-500/30 hover:text-white",
                                               isLocked && "opacity-20 cursor-not-allowed grayscale"
                                             )}
                                           >
                                             {t}
                                           </button>
                                         );
                                      })}
                                    </div>
                                  </div>
                               </div>

                               <div className="space-y-6 flex flex-col h-full">
                                  <div>
                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Motivo / Causa Raiz</label>
                                    <div className="relative">
                                      <select 
                                        value={selectedRootCause}
                                        onChange={(e) => setSelectedRootCause(e.target.value)}
                                        className="w-full bg-black/20 border border-white/5 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                                      >
                                        {REASONS.map(m => (
                                          <option key={m} value={m} className="bg-[#0D1528]">{m}</option>
                                        ))}
                                      </select>
                                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                    </div>
                                  </div>

                                  {selectedRootCause === "Outros" && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      className="space-y-2"
                                    >
                                      <label className="text-[9px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Especifique o Motivo</label>
                                      <input 
                                        type="text"
                                        value={otherReason}
                                        onChange={(e) => setOtherReason(e.target.value)}
                                        placeholder="Digite o motivo detalhado..."
                                        className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner"
                                      />
                                    </motion.div>
                                  )}

                                  <div className="flex-1 flex flex-col">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Observações</label>
                                    <textarea 
                                      value={absenceObservation}
                                      onChange={(e) => setAbsenceObservation(e.target.value)}
                                      placeholder="Notas administrativas..."
                                      className="flex-1 w-full bg-black/20 border border-white/5 rounded-xl p-4 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none min-h-[100px]"
                                    />
                                  </div>
                                  
                                  <button 
                                    onClick={handleConfirmAbsence}
                                    disabled={saving}
                                    className={cn(
                                      "w-full py-4 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl flex items-center justify-center gap-2",
                                      saving && "opacity-50 cursor-not-allowed"
                                    )}
                                  >
                                    {saving ? <Loader2 className="animate-spin" size={16} /> : "Confirmar Registro"}
                                  </button>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    )}

                    {activeModalTab === "suspensoes" && (
                      <motion.div
                        key="suspensoes"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-6">
                               <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  Nova Medida Disciplinar
                               </h3>
                               <div className="space-y-4">
                                  <div>
                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Tipo de Medida</label>
                                    <select className="w-full bg-black/20 border border-white/5 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none appearance-none">
                                      <option>ADVERTÊNCIA VERBAL</option>
                                      <option>ADVERTÊNCIA ESCRITA</option>
                                      <option>SUSPENSÃO (1 DIA)</option>
                                      <option>SUSPENSÃO (3 DIAS)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Descrição do Fato</label>
                                    <textarea 
                                      className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-xs font-medium text-white focus:outline-none min-h-[150px] resize-none"
                                      placeholder="Descreva detalhadamente o motivo da medida..."
                                    />
                                  </div>
                                  <button className="w-full py-4 rounded-xl bg-red-600/80 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all">
                                    Aplicar Medida
                                  </button>
                               </div>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                               <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Histórico Disciplinar</h3>
                               <div className="h-[300px] flex flex-col items-center justify-center opacity-10">
                                  <ShieldAlert size={48} className="mb-4" />
                                  <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma ocorrência</p>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    )}

                    {activeModalTab === "habilidades" && (
                      <motion.div
                        key="habilidades"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="h-full flex flex-col items-center justify-center space-y-4 py-20"
                      >
                         <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                            <Settings className="text-blue-500 animate-spin-slow" size={32} />
                         </div>
                         <h3 className="text-xl font-bold text-white uppercase tracking-widest">Em Desenvolvimento</h3>
                         <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] max-w-xs text-center leading-relaxed">
                            O módulo de mapeamento de competências e matriz de polivalência está sendo preparado.
                         </p>
                      </motion.div>
                    )}

                    {activeModalTab === "observacoes" && (
                      <motion.div
                        key="observacoes"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full"
                      >
                        <ObservationManager employeeId={selectedProfile.employee_id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}

function seniority(hireDate: string) {
  if (!hireDate) return "N/A";
  const start = new Date(hireDate);
  const now = new Date();
  
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  const days = now.getDate() - start.getDate();
  if (days < 0) months -= 1;

  if (months < 1) return "Recém-admitido";
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  
  return remMonths === 0 
    ? `${years} ${years === 1 ? 'ano' : 'anos'}` 
    : `${years}a ${remMonths}m`;
}
