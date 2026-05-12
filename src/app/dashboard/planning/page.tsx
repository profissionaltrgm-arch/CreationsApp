"use client";

import {
  useEffect, useState, useMemo, createContext,
  useContext, useCallback,
} from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Sun, Sunset, Moon, Truck, Warehouse,
  Crown, Shield, Star, BarChart2, Briefcase,
  ClipboardList, GraduationCap, Forklift, ScanLine,
  Package, Users, Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Employee = {
  employee_id: number;
  full_name: string;
  hire_date: string;
  job_title: string;
  company: string;
  shift: string;
  employment_status: string;
  classification?: string;
  department?: string;
};

// ─── Hierarchy ────────────────────────────────────────────────────────────────

const HIERARCHY = [
  { label: "Supervisor",                icon: Crown,         color: "text-amber-400",  bg: "bg-amber-400/10" },
  { label: "Encarregado",              icon: Shield,         color: "text-blue-400",   bg: "bg-blue-400/10" },
  { label: "Líder",                    icon: Star,           color: "text-purple-400", bg: "bg-purple-400/10" },
  { label: "Analista",                 icon: BarChart2,      color: "text-cyan-400",   bg: "bg-cyan-400/10" },
  { label: "Assistente Administrativo",icon: Briefcase,      color: "text-slate-300",  bg: "bg-slate-400/10" },
  { label: "Auxiliar Administrativo",  icon: ClipboardList,  color: "text-slate-400",  bg: "bg-slate-400/10" },
  { label: "Jovem Aprendiz",           icon: GraduationCap,  color: "text-green-400",  bg: "bg-green-400/10" },
  { label: "Empilhador",               icon: Forklift,       color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { label: "Conferente",               icon: ScanLine,       color: "text-cyan-400",   bg: "bg-cyan-400/10" },
  { label: "Auxiliar de Armazenagem",  icon: Package,        color: "text-orange-400", bg: "bg-orange-400/10" },
  { label: "Auxiliar de Expedição",    icon: Truck,          color: "text-rose-400",   bg: "bg-rose-400/10" },
] as const;

function getHier(title?: string) {
  if (!title) return HIERARCHY[5];
  const t = title.toLowerCase();
  return HIERARCHY.find((h) => t.includes(h.label.toLowerCase())) ?? HIERARCHY[5];
}

function getRank(title?: string) {
  if (!title) return 99;
  const t = title.toLowerCase();
  const idx = HIERARCHY.findIndex((h) => t.includes(h.label.toLowerCase()));
  return idx === -1 ? 98 : idx;
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

const SHIFTS = [
  { key: "manha", label: "Manhã",  icon: Sun,    accent: "#38BDF8", dim: "#38BDF808", keywords: ["manhã","manha","1°","1 ","turno 1"] },
  { key: "tarde", label: "Tarde",  icon: Sunset, accent: "#FB923C", dim: "#FB923C08", keywords: ["tarde","2°","2 ","turno 2"] },
  { key: "noite", label: "Noite",  icon: Moon,   accent: "#818CF8", dim: "#818CF808", keywords: ["noite","3°","3 ","turno 3"] },
] as const;

function matchShift(shift?: string, kw: readonly string[] = []) {
  if (!shift) return false;
  const s = shift.toLowerCase();
  return kw.some((k) => s.includes(k));
}

// ─── Sectors ──────────────────────────────────────────────────────────────────

const MAIN_SECTORS = [
  {
    key: "expedicao",
    label: "Expedição",
    icon: Truck,
    accent: "#38BDF8",
    kw: ["expedição","expedicao","expedi","auxiliar de expedi"],
    dept: ["expedicao","expedição","expedition"],
  },
  {
    key: "armazenagem",
    label: "Armazenagem",
    icon: Warehouse,
    accent: "#FB923C",
    kw: ["armazenagem","almox","auxiliar de armazenagem"],
    dept: ["armazenagem","armazem","storage","warehouse"],
  },
] as const;

const OTHER_ROLES = [
  "supervisor","encarregado","líder","lider","analista",
  "assistente","auxiliar administrativo","aprendiz","empilhador","conferente",
];

function getSectorKey(emp: Employee): "expedicao" | "armazenagem" | "outros" {
  // Prefer department field
  const dept = (emp.department || "").toLowerCase();
  for (const s of MAIN_SECTORS) {
    if (s.dept.some((d) => dept.includes(d))) return s.key;
  }
  // Fall back to job_title / classification
  const src = (emp.classification || emp.job_title || "").toLowerCase();
  for (const s of MAIN_SECTORS) {
    if (s.kw.some((k) => src.includes(k))) return s.key;
  }
  return "outros";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcTenure(hireDate?: string) {
  if (!hireDate) return null;
  const months = Math.floor((Date.now() - new Date(hireDate).getTime()) / 2_592_000_000);
  if (months < 1) return "< 1m";
  if (months < 12) return `${months}m`;
  const y = Math.floor(months / 12), m = months % 12;
  return m > 0 ? `${y}a ${m}m` : `${y}a`;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Drag Context ─────────────────────────────────────────────────────────────

type DragCtx = { draggedId: number | null; onDragStart(e: Employee): void; onDragEnd(): void };
const DragContext = createContext<DragCtx>({ draggedId: null, onDragStart: () => {}, onDragEnd: () => {} });

// ─── Employee Card ────────────────────────────────────────────────────────────

function EmpCard({ emp }: { emp: Employee }) {
  const { draggedId, onDragStart, onDragEnd } = useContext(DragContext);
  const hier = getHier(emp.job_title);
  const HIcon = hier.icon;
  const tenure = calcTenure(emp.hire_date);
  const isDragging = draggedId === emp.employee_id;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(emp)}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg",
        "hover:bg-white/[0.05] transition-all cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-30 scale-95"
      )}
    >
      {/* Avatar */}
      <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">
        {initials(emp.full_name)}
      </div>

      {/* Role icon */}
      <div className={cn("w-4 h-4 rounded flex items-center justify-center shrink-0", hier.bg)}>
        <HIcon size={9} className={hier.color} />
      </div>

      {/* Name */}
      <span className="flex-1 text-[11px] text-slate-200 truncate leading-none">
        {emp.full_name}
      </span>

      {/* Tenure */}
      {tenure && (
        <span className="shrink-0 text-[9px] font-mono text-slate-600 tabular-nums">
          {tenure}
        </span>
      )}
    </div>
  );
}

// ─── Shift Lane ───────────────────────────────────────────────────────────────

function ShiftLane({
  shift,
  employees,
  onDrop,
}: {
  shift: typeof SHIFTS[number];
  employees: Employee[];
  onDrop(shiftKey: string): void;
}) {
  const [isOver, setIsOver] = useState(false);
  const ShIcon = shift.icon;
  const sorted = [...employees].sort((a, b) => getRank(a.job_title) - getRank(b.job_title));

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(shift.key); }}
      className={cn(
        "flex-1 min-w-0 flex flex-col rounded-xl border transition-all",
        isOver ? "border-white/20 bg-white/[0.04]" : "border-white/[0.06] bg-white/[0.02]"
      )}
    >
      {/* Lane header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.05] rounded-t-xl"
        style={{ background: shift.dim }}
      >
        <ShIcon size={12} style={{ color: shift.accent }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: shift.accent }}>
          {shift.label}
        </span>
        <div className="flex-1" />
        <span
          className="text-sm font-black tabular-nums"
          style={{ color: shift.accent }}
        >
          {sorted.length}
        </span>
      </div>

      {/* Employees */}
      <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: "none" }}>
        {sorted.length === 0 ? (
          <p className="text-[10px] text-slate-700 text-center py-4">Nenhum</p>
        ) : (
          sorted.map((e) => <EmpCard key={e.employee_id} emp={e} />)
        )}
      </div>
    </div>
  );
}

// ─── Sector Block ─────────────────────────────────────────────────────────────

function SectorBlock({
  sectorKey,
  employees,
  onDrop,
  otherEmployees,
}: {
  sectorKey: "expedicao" | "armazenagem";
  employees: Employee[];
  onDrop(shiftKey: string, sectorKey: string): void;
  otherEmployees?: Employee[]; // liderança/adm shown inside
}) {
  const sector = MAIN_SECTORS.find((s) => s.key === sectorKey)!;
  const SIcon = sector.icon;

  const byShift = SHIFTS.map((sh) => ({
    shift: sh,
    emps: employees.filter((e) => matchShift(e.shift, sh.keywords)),
  }));

  const noShift = employees.filter((e) => !SHIFTS.some((s) => matchShift(e.shift, s.keywords)));

  return (
    <div className="flex flex-col gap-3">
      {/* Sector header */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${sector.accent}18` }}
        >
          <SIcon size={16} style={{ color: sector.accent }} />
        </div>
        <div>
          <h2 className="text-sm font-black text-white tracking-tight">{sector.label}</h2>
          <p className="text-[10px] text-slate-600">
            {employees.length} colaboradores
            {noShift.length > 0 && (
              <span className="text-rose-500/70 ml-1">· {noShift.length} sem turno</span>
            )}
          </p>
        </div>
        {/* Total badges per shift */}
        <div className="flex items-center gap-2 ml-auto">
          {byShift.map(({ shift, emps }) => (
            <div key={shift.key} className="flex items-center gap-1">
              <shift.icon size={10} style={{ color: shift.accent }} />
              <span className="text-[11px] font-bold tabular-nums" style={{ color: shift.accent }}>
                {emps.length}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3 shift lanes side-by-side */}
      <div className="grid grid-cols-3 gap-2 min-h-[280px]">
        {byShift.map(({ shift, emps }) => (
          <ShiftLane
            key={shift.key}
            shift={shift}
            employees={emps}
            onDrop={(sk) => onDrop(sk, sectorKey)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Outros (liderança, adm, empilhador, conferente) ─────────────────────────

function OthersBlock({ employees, onDrop }: { employees: Employee[]; onDrop(sk: string): void }) {
  if (!employees.length) return null;

  const byShift = SHIFTS.map((sh) => ({
    shift: sh,
    emps: employees.filter((e) => matchShift(e.shift, sh.keywords)),
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
          <Users size={15} className="text-slate-400" />
        </div>
        <div>
          <h2 className="text-sm font-black text-white tracking-tight">Liderança & Apoio</h2>
          <p className="text-[10px] text-slate-600">{employees.length} colaboradores</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 min-h-[180px]">
        {byShift.map(({ shift, emps }) => (
          <ShiftLane key={shift.key} shift={shift} employees={emps} onDrop={onDrop} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [draggedEmp, setDraggedEmp] = useState<Employee | null>(null);

  const handleDragStart = useCallback((e: Employee) => setDraggedEmp(e), []);
  const handleDragEnd   = useCallback(() => setDraggedEmp(null), []);

  const handleDrop = useCallback((shiftKey: string, _sectorKey?: string) => {
    if (!draggedEmp) return;
    const targetShift = SHIFTS.find((s) => s.key === shiftKey)?.label ?? shiftKey;
    setEmployees((prev) =>
      prev.map((e) =>
        e.employee_id === draggedEmp.employee_id ? { ...e, shift: targetShift } : e
      )
    );
    supabase
      .from("employees")
      .update({ shift: targetShift })
      .eq("employee_id", draggedEmp.employee_id)
      .then();
    setDraggedEmp(null);
  }, [draggedEmp]);

  useEffect(() => {
    supabase
      .from("employees")
      .select("employee_id, full_name, hire_date, job_title, company, shift, employment_status, classification, department")
      .order("full_name", { ascending: true })
      .then(({ data }) => {
        if (data) setEmployees(data as Employee[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return e.full_name?.toLowerCase().includes(q) || String(e.employee_id).includes(q);
      }),
    [employees, search]
  );

  // Split by sector
  const expedicao   = useMemo(() => filtered.filter((e) => getSectorKey(e) === "expedicao"),   [filtered]);
  const armazenagem = useMemo(() => filtered.filter((e) => getSectorKey(e) === "armazenagem"), [filtered]);
  const outros      = useMemo(() => filtered.filter((e) => getSectorKey(e) === "outros"),      [filtered]);

  // Summary stats
  const stats = useMemo(() => SHIFTS.map((sh) => ({
    shift: sh,
    total: filtered.filter((e) => matchShift(e.shift, sh.keywords)).length,
  })), [filtered]);

  const noShift = useMemo(
    () => filtered.filter((e) => !SHIFTS.some((s) => matchShift(e.shift, s.keywords))).length,
    [filtered]
  );

  return (
    <DragContext.Provider value={{ draggedId: draggedEmp?.employee_id ?? null, onDragStart: handleDragStart, onDragEnd: handleDragEnd }}>
      <div className="space-y-8 pb-8 animate-in fade-in duration-500">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mb-1">
              G300 · Operações
            </p>
            <h1 className="text-2xl font-light text-white tracking-tight">
              Planejamento de <span className="text-blue-400">Turno</span>
            </h1>
            <p className="text-[11px] text-slate-600 mt-1">
              {filtered.length} colaboradores · arraste para redistribuir turnos
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[12px] text-white outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-700"
            />
          </div>
        </div>

        {/* ── Shift summary bar ── */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ shift, total }) => {
            const ShIcon = shift.icon;
            return (
              <div
                key={shift.key}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06]"
                style={{ background: shift.dim }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${shift.accent}18` }}
                >
                  <ShIcon size={15} style={{ color: shift.accent }} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{shift.label}</p>
                  <p className="text-lg font-black tabular-nums leading-tight" style={{ color: shift.accent }}>
                    {total}
                  </p>
                </div>
                <div className="flex-1 h-1 rounded-full bg-white/[0.04] ml-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: filtered.length ? `${Math.round((total / filtered.length) * 100)}%` : "0%",
                      background: shift.accent,
                      opacity: 0.5,
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-600 tabular-nums shrink-0">
                  {filtered.length ? Math.round((total / filtered.length) * 100) : 0}%
                </span>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* ── Expedição ── */}
            <div className="bg-[#38BDF808] border border-sky-400/10 rounded-2xl p-5">
              <SectorBlock
                sectorKey="expedicao"
                employees={expedicao}
                onDrop={handleDrop}
              />
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.05]" />
              <span className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">setores</span>
              <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            {/* ── Armazenagem ── */}
            <div className="bg-[#FB923C08] border border-orange-400/10 rounded-2xl p-5">
              <SectorBlock
                sectorKey="armazenagem"
                employees={armazenagem}
                onDrop={handleDrop}
              />
            </div>

            {/* ── Liderança & Apoio ── */}
            {outros.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">apoio</span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
                  <OthersBlock employees={outros} onDrop={handleDrop} />
                </div>
              </>
            )}

            {/* ── Sem turno ── */}
            {noShift > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
                <Users size={12} className="text-rose-500/60" />
                <span className="text-[11px] text-rose-400/70 font-medium">
                  {noShift} colaborador{noShift > 1 ? "es" : ""} sem turno definido
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </DragContext.Provider>
  );
}
