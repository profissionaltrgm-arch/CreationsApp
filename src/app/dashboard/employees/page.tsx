"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, 
  Plus, 
  Filter,
  ChevronDown,
  User,
  X,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type Employee = {
  employee_id: number;
  name: string;
  hire_date: string;
  job_title: string;
  company: string;
  Shift: string;
  status: string;
  sex: string;
};

const EMPTY_FORM = {
  name: "",
  job_title: "",
  company: "G300",
  sex: "Masculino",
  status: "Ativo",
  hire_date: new Date().toISOString().split("T")[0],
  Shift: "",
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [unitFilter, setUnitFilter] = useState("Todas");
  const [jobFilter, setJobFilter] = useState("Todas");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee, direction: 'asc' | 'desc' } | null>(null);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);

  // Modal Novo Colaborador
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    setLoading(true);
    const { data } = await supabase
      .from("employees")
      .select("employee_id, name, hire_date, job_title, company, status, sex")
      .order("name", { ascending: true });
    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  }

  async function handleSaveEmployee() {
    if (!form.name.trim()) { setError("O nome é obrigatório."); return; }
    setError("");
    setSaving(true);
    const { error: err } = await supabase.from("employees").insert({
      name: form.name.trim(),
      job_title: form.job_title.trim() || null,
      company: form.company,
      sex: form.sex,
      status: form.status,
      hire_date: form.hire_date || null,
      Shift: form.Shift.trim() || null,
    });
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    await fetchEmployees();
    setForm(EMPTY_FORM);
    setShowModal(false);
    setSaving(false);
  }

  const handleSort = (key: keyof Employee | 'seniority') => {
    let direction: 'asc' | 'desc' = 'asc';
    const sortKey = key === 'seniority' ? 'hire_date' : key;
    if (sortConfig && sortConfig.key === sortKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: sortKey as keyof Employee, direction });
  };

  const filtered = useMemo(() => {
    let result = [...employees];
    result = result.filter((emp) => {
      const matchesSearch = emp.name?.toLowerCase().includes(search.toLowerCase()) || 
                            emp.employee_id.toString().includes(search);
      const matchesUnit = unitFilter === "Todas" || emp.company === unitFilter;
      const matchesJob = jobFilter === "Todas" || emp.job_title === jobFilter;
      return matchesSearch && matchesUnit && matchesJob;
    });
    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (!valA) return 1;
        if (!valB) return -1;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [employees, search, unitFilter, jobFilter, sortConfig]);

  const uniqueJobs = useMemo(() => {
    return ["Todas", ...new Set(employees.map(e => e.job_title).filter(Boolean))];
  }, [employees]);

  const SortIcon = ({ column }: { column: keyof Employee | 'seniority' }) => {
    const activeKey = column === 'seniority' ? 'hire_date' : column;
    if (sortConfig?.key !== activeKey) return <Filter size={10} className="opacity-0 group-hover/th:opacity-30 transition-opacity ml-2" />;
    return sortConfig.direction === 'asc' ? 
      <ChevronDown size={10} className="ml-2 text-blue-500" /> : 
      <ChevronDown size={10} className="ml-2 text-blue-500 rotate-180" />;
  };

  const calculateSeniority = (hireDate: string) => {
    if (!hireDate) return "—";
    const start = new Date(hireDate);
    const now = new Date();
    const diffInMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (diffInMonths < 12) return `${diffInMonths} meses`;
    const years = Math.floor(diffInMonths / 12);
    const months = diffInMonths % 12;
    return months > 0 ? `${years}a ${months}m` : `${years} anos`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl font-display text-white tracking-tight">Base de <span className="text-blue-500">Colaboradores</span></h1>
          <p className="text-slate-500 text-[9px] mt-2 font-bold uppercase tracking-[0.3em]">Gestão de Capital Humano G300</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-500/10 transition-all active:scale-95 group border border-white/10"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Novo Registro</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative group flex-1 min-w-[300px]">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou matrícula..."
            className="w-full bg-[#121b28] border border-[#1e293b] rounded-2xl py-4 pl-16 pr-8 text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 text-sm shadow-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center bg-[#121b28] border border-[#1e293b] rounded-2xl p-1.5 shadow-xl">
          {/* Unit Filter */}
          <div className="relative">
            <button 
              onClick={() => { setIsUnitDropdownOpen(!isUnitDropdownOpen); setIsJobDropdownOpen(false); }}
              className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-white/5 rounded-xl transition-all"
            >
              <span className="text-slate-500 uppercase text-[9px] font-bold tracking-[0.2em]">Empresa</span>
              <span className="text-white font-semibold">{unitFilter}</span>
              <ChevronDown size={14} className={cn("text-slate-600 transition-transform duration-300", isUnitDropdownOpen && "rotate-180")} />
            </button>
            {isUnitDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUnitDropdownOpen(false)} />
                <div className="absolute left-0 mt-3 w-56 bg-[#1a2538] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 space-y-0.5">
                    {["Todas", "Nutrivida", "Mondial", "G300"].map((unit) => (
                      <button key={unit} onClick={() => { setUnitFilter(unit); setIsUnitDropdownOpen(false); }}
                        className={cn("w-full text-left px-4 py-3 rounded-xl text-[12px] transition-all flex items-center justify-between",
                          unitFilter === unit ? "bg-blue-600/20 text-blue-400 font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}>
                        {unit}
                        {unitFilter === unit && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-white/5 mx-2" />

          {/* Job Filter */}
          <div className="relative">
            <button 
              onClick={() => { setIsJobDropdownOpen(!isJobDropdownOpen); setIsUnitDropdownOpen(false); }}
              className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-white/5 rounded-xl transition-all"
            >
              <span className="text-slate-500 uppercase text-[9px] font-bold tracking-[0.2em]">Função</span>
              <span className="text-white font-semibold truncate max-w-[140px]">{jobFilter}</span>
              <ChevronDown size={14} className={cn("text-slate-600 transition-transform duration-300", isJobDropdownOpen && "rotate-180")} />
            </button>
            {isJobDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsJobDropdownOpen(false)} />
                <div className="absolute right-0 mt-3 w-72 bg-[#1a2538] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 space-y-0.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                    {uniqueJobs.map((job) => (
                      <button key={job} onClick={() => { setJobFilter(job); setIsJobDropdownOpen(false); }}
                        className={cn("w-full text-left px-4 py-3 rounded-xl text-[12px] transition-all flex items-center justify-between",
                          jobFilter === job ? "bg-blue-600/20 text-blue-400 font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}>
                        <span className="truncate pr-4">{job}</span>
                        {jobFilter === job && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[#121b28] border border-[#1e293b] rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead className="relative z-10">
              <tr className="bg-white/[0.01]">
                <th className="pl-10 py-5 text-left cursor-pointer group/th select-none outline-none" onClick={() => handleSort('employee_id')}>
                  <div className="flex items-center text-[10px] font-medium text-slate-500 uppercase tracking-widest">Matrícula <SortIcon column="employee_id" /></div>
                </th>
                <th className="py-5 text-left cursor-pointer group/th select-none outline-none" onClick={() => handleSort('name')}>
                  <div className="flex items-center text-[10px] font-medium text-slate-500 uppercase tracking-widest">Colaborador <SortIcon column="name" /></div>
                </th>
                <th className="py-5 text-left cursor-pointer group/th select-none outline-none" onClick={() => handleSort('sex')}>
                  <div className="flex items-center text-[10px] font-medium text-slate-500 uppercase tracking-widest">Sexo <SortIcon column="sex" /></div>
                </th>
                <th className="py-5 text-left cursor-pointer group/th select-none outline-none" onClick={() => handleSort('company')}>
                  <div className="flex items-center text-[10px] font-medium text-slate-500 uppercase tracking-widest">Empresa <SortIcon column="company" /></div>
                </th>
                <th className="py-5 text-left cursor-pointer group/th select-none outline-none" onClick={() => handleSort('job_title')}>
                  <div className="flex items-center text-[10px] font-medium text-slate-500 uppercase tracking-widest">Função <SortIcon column="job_title" /></div>
                </th>
                <th className="py-5 text-left cursor-pointer group/th select-none outline-none" onClick={() => handleSort('seniority')}>
                  <div className="flex items-center text-[10px] font-medium text-slate-500 uppercase tracking-widest">Tempo <SortIcon column="seniority" /></div>
                </th>
                <th className="py-5 text-center cursor-pointer group/th select-none outline-none" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center text-[10px] font-medium text-slate-500 uppercase tracking-widest">Status <SortIcon column="status" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1e293b]/10 last:border-0">
                    <td colSpan={7} className="p-5">
                      <div className="h-3 bg-white/5 rounded-full w-full opacity-30 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <User size={40} className="text-slate-500" />
                      <p className="text-sm text-slate-500">Nenhum colaborador encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((emp) => (
                <tr 
                  key={emp.employee_id} 
                  className="group hover:bg-white/[0.01] transition-all cursor-pointer border-b border-[#1e293b]/30 last:border-0"
                  onClick={() => router.push(`/dashboard/employees/${emp.employee_id}`)}
                >
                  <td className="pl-10 py-4">
                    <span className="text-[11px] font-mono text-slate-600 tracking-tight">{emp.employee_id}</span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-700 group-hover:text-white transition-all">
                        <User size={16} />
                      </div>
                      <span className="text-[13px] font-normal text-slate-300 tracking-tight">{emp.name}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="text-[11px] text-slate-600 font-normal">{emp.sex || "—"}</span>
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "text-[9px] font-medium px-3 py-1 rounded-lg border uppercase tracking-wider",
                      emp.company?.toUpperCase() === 'NUTRIVIDA' 
                        ? "bg-purple-500/5 border-purple-500/20 text-purple-400" 
                        : "bg-slate-500/5 border-white/10 text-slate-500"
                    )}>
                      {emp.company || "—"}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className="text-[11px] text-slate-600 font-normal">{emp.job_title || "—"}</span>
                  </td>
                  <td className="py-4">
                    <span className="text-[11px] text-slate-600 font-normal">{calculateSeniority(emp.hire_date)}</span>
                  </td>
                  <td className="py-4 text-center">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-medium uppercase tracking-wider",
                      emp.status?.toLowerCase() === 'ativo' 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                        : "bg-rose-500/5 border-rose-500/20 text-rose-400"
                    )}>
                      <div className={cn("w-1 h-1 rounded-full", emp.status?.toLowerCase() === 'ativo' ? "bg-emerald-400" : "bg-rose-400")} />
                      {emp.status}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Colaborador */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
            >
              <div className="bg-[#121b28] border border-[#1e293b] rounded-[2rem] p-8 shadow-2xl">
                {/* Header do Modal */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-display text-white tracking-tight">Novo Colaborador</h2>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Preencha os dados do registro</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>

                {/* Campos */}
                <div className="space-y-4">
                  <Field label="Nome Completo *">
                    <input
                      type="text"
                      placeholder="Ex: João da Silva"
                      className="modal-input"
                      value={form.name}
                      onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                      autoFocus
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Função / Cargo">
                      <input
                        type="text"
                        placeholder="Ex: Operador"
                        className="modal-input"
                        value={form.job_title}
                        onChange={(e) => setForm(p => ({ ...p, job_title: e.target.value }))}
                      />
                    </Field>
                    <Field label="Turno">
                      <input
                        type="text"
                        placeholder="Ex: 1° Turno"
                        className="modal-input"
                        value={form.Shift}
                        onChange={(e) => setForm(p => ({ ...p, Shift: e.target.value }))}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Empresa">
                      <select className="modal-input appearance-none cursor-pointer" value={form.company} onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))}>
                        <option>G300</option>
                        <option>Nutrivida</option>
                        <option>Mondial</option>
                      </select>
                    </Field>
                    <Field label="Sexo">
                      <select className="modal-input appearance-none cursor-pointer" value={form.sex} onChange={(e) => setForm(p => ({ ...p, sex: e.target.value }))}>
                        <option>Masculino</option>
                        <option>Feminino</option>
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Data de Admissão">
                      <input
                        type="date"
                        className="modal-input"
                        value={form.hire_date}
                        onChange={(e) => setForm(p => ({ ...p, hire_date: e.target.value }))}
                      />
                    </Field>
                    <Field label="Status">
                      <select className="modal-input appearance-none cursor-pointer" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}>
                        <option>Ativo</option>
                        <option>Inativo</option>
                        <option>Afastado</option>
                      </select>
                    </Field>
                  </div>

                  {error && (
                    <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">{error}</p>
                  )}
                </div>

                {/* Botões */}
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setError(""); }}
                    className="flex-1 py-3 rounded-xl border border-white/5 text-slate-400 hover:text-white hover:bg-white/5 text-[11px] font-bold uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEmployee}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {saving ? "Salvando..." : "Cadastrar"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">{label}</label>
      {children}
    </div>
  );
}
