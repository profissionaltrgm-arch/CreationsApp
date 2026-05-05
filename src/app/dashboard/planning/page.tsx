"use client";

import { useEffect, useState, useMemo, createContext, useContext, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Sun, Sunset, Moon, Users, Warehouse, Truck,
  Crown, Star, Shield, BarChart2, Briefcase,
  BookOpen, Package, Send, ChevronDown, ChevronRight,
  GraduationCap, ClipboardList, Forklift, ScanLine
} from "lucide-react";

// ─── TIPOS ───────────────────────────────────────────────────
type Employee = {
  employee_id: number;
  name: string;
  hire_date: string;
  job_title: string;
  company: string;
  Shift: string;
  status: string;
  class?: string;
};

// ─── HIERARQUIA ──────────────────────────────────────────────
const HIERARCHY: { label: string; icon: React.ElementType; color: string }[] = [
  { label: "Supervisor",               icon: Crown,        color: "text-amber-400" },
  { label: "Encarregado",             icon: Shield,       color: "text-blue-400" },
  { label: "Líder",                   icon: Star,         color: "text-purple-400" },
  { label: "Analista",                icon: BarChart2,    color: "text-cyan-400" },
  { label: "Assistente Administrativo",              icon: Briefcase,    color: "text-slate-300" },
  { label: "Auxiliar Administrativo", icon: ClipboardList,color: "text-slate-400" },
  { label: "Jovem Aprendiz",          icon: GraduationCap,color: "text-green-400" },
  { label: "Empilhador",              icon: Forklift,     color: "text-yellow-400" },
  { label: "Auxiliar de Armazenagem", icon: Package,      color: "text-orange-400" },
  { label: "Auxiliar de Expedição",   icon: Send,         color: "text-rose-400" },
];

function getHier(title?: string) {
  if (!title) return HIERARCHY[4];
  const t = title.toLowerCase();
  return HIERARCHY.find((h) => t.includes(h.label.toLowerCase())) ?? HIERARCHY[4];
}

function getRank(title?: string) {
  if (!title) return 99;
  const t = title.toLowerCase();
  const idx = HIERARCHY.findIndex((h) => t.includes(h.label.toLowerCase()));
  return idx === -1 ? 98 : idx;
}

// ─── TURNOS ──────────────────────────────────────────────────
const SHIFTS = [
  { key: "manha", label: "Manhã",  subtitle: "Turno 1", icon: Sun,    accent: "#38BDF8", border: "border-sky-400/40",    keywords: ["manhã","manha","1"] },
  { key: "tarde", label: "Tarde",  subtitle: "Turno 2", icon: Sunset, accent: "#FB923C", border: "border-orange-400/40", keywords: ["tarde","2"] },
  { key: "noite", label: "Noite",  subtitle: "Turno 3", icon: Moon,   accent: "#818CF8", border: "border-indigo-400/40", keywords: ["noite","3"] },
];

function matchShift(shift?: string, kw: string[] = []) {
  if (!shift) return false;
  const s = shift.toLowerCase();
  return kw.some((k) => s.includes(k));
}

// ─── SETORES ──────────────────────────────────────────────
const SECTORS = [
  {
    key: "lideranca",
    label: "Liderança",
    icon: Crown,
    color: "text-amber-400",
    kw: ["lideranca", "liderança", "supervisor", "encarregado", "líder", "lider"],
  },
  {
    key: "administrativo",
    label: "Administrativo",
    icon: ClipboardList,
    color: "text-slate-400",
    kw: ["administrativo", "analista", "assistente", "aprendiz"],
  },
  {
    key: "conferente",
    label: "Conferente",
    icon: ScanLine,
    color: "text-cyan-400",
    kw: ["conferente"],
  },
  {
    key: "empilhador",
    label: "Empilhador",
    icon: Forklift,
    color: "text-yellow-400",
    kw: ["empilhador"],
  },
  {
    key: "armazenagem",
    label: "Armazenagem",
    icon: Warehouse,
    color: "text-orange-400",
    kw: ["armazenagem", "almox"],
  },
  {
    key: "expedicao",
    label: "Expedição",
    icon: Truck,
    color: "text-sky-400",
    kw: ["expedição", "expedicao", "expedi"],
  },
] as const;

type SectorKey = typeof SECTORS[number]["key"];

// Usa coluna `class` se preenchida, caso contrário infere por job_title
function getSectorKey(title?: string, cls?: string): SectorKey {
  const source = (cls || title || "").toLowerCase();
  for (const s of SECTORS) {
    if (s.kw.some((k) => source.includes(k))) return s.key;
  }
  return "administrativo";
}

// ─── DRAG CONTEXT ───────────────────────────────────────────
type DragCtx = {
  draggedId: number | null;
  onDragStart: (emp: Employee) => void;
  onDragEnd:   () => void;
};
const DragContext = createContext<DragCtx>({
  draggedId: null,
  onDragStart: () => {},
  onDragEnd:   () => {},
});



// ─── TENURE HELPER ────────────────────────────────────────────
function tenureLabel(hireDate?: string) {
  if (!hireDate) return null;
  const months = Math.floor((Date.now() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return { text: "< 1m" };
  if (months < 12) return { text: `${months}m` };
  const yrs = Math.floor(months / 12);
  const rem = months % 12;
  return { text: rem > 0 ? `${yrs}a ${rem}m` : `${yrs}a` };
}

// ─── EMPLOYEE ROW ────────────────────────────────────────────
function EmpRow({ emp }: { emp: Employee }) {
  const { draggedId, onDragStart, onDragEnd } = useContext(DragContext);
  const hier   = getHier(emp.job_title);
  const Icon   = hier.icon;
  const tenure = tenureLabel(emp.hire_date);
  const isDragging = draggedId === emp.employee_id;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(emp)}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-2 px-2.5 py-[5px] rounded-md hover:bg-white/[0.04] transition-colors",
        "cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-40"
      )}
    >
      {/* Avatar */}
      <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
        {emp.name?.[0] ?? "?"}
      </div>

      {/* Cargo icon */}
      <Icon size={9} className={cn(hier.color, "shrink-0")} />

      {/* Nome */}
      <span className="flex-1 text-[11px] font-medium text-slate-200 truncate leading-none">
        {emp.name}
      </span>

      {/* Tempo de empresa */}
      {tenure && (
        <span className="shrink-0 text-[9px] font-mono text-slate-500">
          {tenure.text}
        </span>
      )}
    </div>
  );
}

// ─── SECTOR GROUP ─────────────────────────────────────────────
function SectorGroup({ employees, sectorKey }: { employees: Employee[]; sectorKey: string }) {
  const [open, setOpen] = useState(true);
  const sector = SECTORS.find((s) => s.key === sectorKey)!;
  const SectorIcon = sector.icon;
  const sorted = [...employees].sort((a, b) => getRank(a.job_title) - getRank(b.job_title));

  if (!sorted.length) return null;

  return (
    <div className="mb-0.5">
      {/* Sector header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/[0.04] transition-colors"
      >
        <SectorIcon size={10} className={sector.color} />
        <span className={cn("text-[9px] font-black uppercase tracking-[0.25em]", sector.color)}>
          {sector.label}
        </span>
        <span className="text-[8px] text-slate-700 font-bold ml-0.5">· {sorted.length}</span>
        <div className="flex-1 h-px bg-white/[0.05] mx-1" />
        {open
          ? <ChevronDown size={8} className="text-slate-700" />
          : <ChevronRight size={8} className="text-slate-700" />}
      </button>

      {/* Employees */}
      {open && (
        <div className="mt-0.5">
          {sorted.map((emp) => (
            <EmpRow key={emp.employee_id} emp={emp} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SHIFT COLUMN ─────────────────────────────────────────────
function ShiftColumn({
  shift,
  employees,
  onDrop,
}: {
  shift: (typeof SHIFTS)[0];
  employees: Employee[];
  onDrop: (shiftKey: string) => void;
}) {
  const ShiftIcon = shift.icon;
  const [isOver, setIsOver] = useState(false);

  // Agrupar por setor (usando coluna `class` como fonte principal)
  const grouped = useMemo(() => {
    const groups: Record<SectorKey, Employee[]> = {
      lideranca: [],
      administrativo: [],
      conferente: [],
      empilhador: [],
      armazenagem: [],
      expedicao: [],
    };
    employees.forEach((e) => {
      groups[getSectorKey(e.job_title, e.class)].push(e);
    });
    return groups;
  }, [employees]);

  // Mini stats
  const stats = [
    { label: "Liderança",    short: "Lid", val: grouped.lideranca.length,      color: "text-amber-400",  icon: Crown },
    { label: "Adm.",          short: "Adm", val: grouped.administrativo.length,  color: "text-slate-400",  icon: ClipboardList },
    { label: "Conferente",    short: "Con", val: grouped.conferente.length,      color: "text-cyan-400",   icon: ScanLine },
    { label: "Empilhador",    short: "Emp", val: grouped.empilhador.length,      color: "text-yellow-400", icon: Forklift },
    { label: "Armazenagem",   short: "Arm", val: grouped.armazenagem.length,     color: "text-orange-400", icon: Warehouse },
    { label: "Expedição",    short: "Exp", val: grouped.expedicao.length,       color: "text-sky-400",    icon: Truck },
  ];

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(shift.key); }}
      className={cn(
        "flex flex-col rounded-2xl border overflow-hidden bg-[#07080e] transition-colors relative",
        shift.border,
        isOver && "border-white/30 bg-white/[0.05]"
      )}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 border-b border-white/[0.05]"
        style={{ background: `${shift.accent}09` }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${shift.accent}18` }}
          >
            <ShiftIcon size={16} style={{ color: shift.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.35em] text-slate-600">
              {shift.subtitle}
            </p>
            <h2 className="text-sm font-black text-white tracking-tight leading-none mt-0.5">
              {shift.label}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-white leading-none" style={{ color: shift.accent }}>
              {employees.length}
            </p>
            <p className="text-[7px] font-bold text-slate-600 uppercase tracking-wide">pessoas</p>
          </div>
        </div>

        {/* Stats — flat inline */}
        <div className="flex items-center gap-3 flex-wrap">
          {stats.map((s, i) => {
            const StatIcon = s.icon;
            return (
              <div key={s.short} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-white/10 text-xs select-none">·</span>}
                <StatIcon size={10} className={cn(s.color, "opacity-60")} />
                <span className={cn("text-[11px] font-black tabular-nums", s.color)}>{s.val}</span>
                <span className="text-[10px] text-slate-600 font-medium">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#1e293b transparent" }}
      >
        <SectorGroup employees={grouped.lideranca}      sectorKey="lideranca" />
        <SectorGroup employees={grouped.administrativo} sectorKey="administrativo" />
        <SectorGroup employees={grouped.conferente}     sectorKey="conferente" />
        <SectorGroup employees={grouped.empilhador}     sectorKey="empilhador" />
        <SectorGroup employees={grouped.armazenagem}    sectorKey="armazenagem" />
        <SectorGroup employees={grouped.expedicao}      sectorKey="expedicao" />
      </div>
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────
export default function PlanningPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterClass, setFilterClass] = useState("all");

  const [draggedEmp, setDraggedEmp] = useState<Employee | null>(null);

  const handleDragStart = useCallback((emp: Employee) => setDraggedEmp(emp), []);
  const handleDragEnd   = useCallback(() => setDraggedEmp(null), []);

  const handleDrop = useCallback((shiftKey: string) => {
    if (!draggedEmp) return;
    const targetShift = SHIFTS.find((s) => s.key === shiftKey)?.label || shiftKey;

    setEmployees((prev) =>
      prev.map((e) => (e.employee_id === draggedEmp.employee_id ? { ...e, Shift: targetShift } : e))
    );

    supabase.from("employees").update({ Shift: targetShift }).eq("employee_id", draggedEmp.employee_id).then();
    setDraggedEmp(null);
  }, [draggedEmp]);

  useEffect(() => {
    supabase
      .from("employees")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setEmployees(data);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch = !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.employee_id.toString().includes(search);
      const sector = getSectorKey(e.job_title, e.class);
      const matchClass = 
        filterClass === "all" || 
        (filterClass === "armazenagem" && sector === "armazenagem") || 
        (filterClass === "expedicao" && sector === "expedicao");
      return matchSearch && matchClass;
    });
  }, [employees, search, filterClass]);

  const byShift = useMemo(
    () =>
      SHIFTS.map((shift) => ({
        shift,
        employees: filtered.filter((e) => matchShift(e.Shift, shift.keywords)),
      })),
    [filtered]
  );

  const noShift = useMemo(
    () => filtered.filter((e) => !SHIFTS.some((s) => matchShift(e.Shift, s.keywords))),
    [filtered]
  );

  return (
    <DragContext.Provider value={{ draggedId: draggedEmp?.employee_id || null, onDragStart: handleDragStart, onDragEnd: handleDragEnd }}>
      <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mb-1">
              G300 · Operações
            </p>
            <h1 className="text-xl font-black text-white tracking-tight">Planejamento de Turno</h1>
            <p className="text-slate-600 text-[11px] mt-0.5">
              {filtered.length} colaboradores listados · distribuição por turno
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none focus:border-blue-500/40 transition-all cursor-pointer"
            >
              <option value="all" className="bg-[#0f111a]">Todos os setores</option>
              <option value="armazenagem" className="bg-[#0f111a]">Armazenagem</option>
              <option value="expedicao" className="bg-[#0f111a]">Expedição</option>
            </select>
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

      {/* 3 colunas */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white/[0.04] h-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
          {byShift.map(({ shift, employees: shiftEmps }) => (
            <ShiftColumn key={shift.key} shift={shift} employees={shiftEmps} onDrop={handleDrop} />
          ))}
        </div>
      )}

      {/* Sem turno */}
      {!loading && noShift.length > 0 && (
        <div className="shrink-0 border border-white/[0.06] rounded-xl px-4 py-2.5 flex items-center gap-2 bg-white/[0.02]">
          <Users size={12} className="text-slate-600" />
          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            {noShift.length} colaboradores sem turno definido
          </span>
        </div>
      )}
      </div>
    </DragContext.Provider>
  );
}
