"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase, supabaseAvarias } from "@/lib/supabase";
import {
  ArrowLeft, ScanBarcode, AlertTriangle, CheckCircle2, Plus,
  ChevronRight, ChevronDown, X, Trash2, Save, Loader2,
  Building2, Percent, ShieldAlert, Pencil, Share2, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// --- Tipos e Interfaces ---
type Company = "BR" | "AG";

interface BaseCodigoItem {
  code: string;
  description: string;
}

interface Divergence {
  id: string;
  session_id: string;
  session_date: string;
  position: string;
  company: Company;
  code: string;
  description?: string;
  system_qty: number;
  physical_qty: number;
  type: string;
  created_at: string;
  treatment?: string;
  observation?: string;
  resolved?: boolean;
}

interface ValidationSession {
  id: string;
  session_date: string;
  week_number: number;
  year: number;
  week_start: string;
  week_end: string;
  company: Company;
  type: string;
  validated_count: number;
  notes?: string;
  created_at: string;
}

interface WeekGroup {
  week_number: number;
  year: number;
  week_start: string;
  week_end: string;
  type: string;
  notes?: string;
  sessions: ValidationSession[];
  divergences: Divergence[];
}

interface DraftDivergence {
  key: number;
  record_date: string;
  position: string;
  company: Company;
  code: string;
  description: string;
  system_qty: string;
  physical_qty: string;
  treatment: string;
  observation: string;
  resolved: boolean;
}

interface ConsolidatedGroup {
  key: string;
  position: string;
  code: string;
  resolved: boolean;
  treatment: string;
  observation: string;
  company: Company;
  items: DivergenceWithWeek[];
}

interface DivergenceWithWeek extends Divergence {
  week_number: number;
  year: number;
}

// --- Helpers de Formatação ---
function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function fmtFullDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getWeekNumber(dateStr: string): number {
  if (!dateStr) return 0;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Helper para estilo de badge consistente (Fix para html2canvas)
const badgeStyle = (color: string, bg: string, border: string) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: 1,
  color: color,
  padding: "4px 10px",
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 999,
  boxSizing: "border-box" as const,
  display: "inline-flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  whiteSpace: "nowrap" as const,
  lineHeight: 1,
});

/* ─── Share Card Component (Para exportação de imagem) ──────────────── */
function ShareCard({
  cardRef, items, weekInfo
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  items: Divergence[];
  weekInfo: string;
}) {
  const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const pending = items.filter(i => !i.resolved);
  
  const groups = [
    {
      label: "BR",
      color: "#34d399",
      bg: "rgba(16,185,129,0.06)",
      border: "rgba(16,185,129,0.15)",
      items: pending.filter(i => i.company === "BR").sort((a, b) => a.code.localeCompare(b.code)),
    },
    {
      label: "AG",
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.06)",
      border: "rgba(96,165,250,0.15)",
      items: pending.filter(i => i.company === "AG").sort((a, b) => a.code.localeCompare(b.code)),
    },
  ].filter(g => g.items.length > 0);

  return (
    <div
      ref={cardRef}
      style={{
        fontFamily: "'Inter', sans-serif",
        width: 600,
        background: "#080C12",
        padding: "40px",
        borderRadius: "24px",
        color: "white"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              Quarentena
            </span>
            <span style={badgeStyle("#fbbf24", "rgba(245,158,11,0.1)", "rgba(245,158,11,0.2)")}>
              G300
            </span>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6, fontWeight: 500 }}>
            Situação atual · {now}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16, textAlign: "center" }}>
          Total em Quarentena
        </p>
        <p style={{ fontSize: 48, fontWeight: 300, color: "#fff", textAlign: "center", margin: 0 }}>
          {pending.length}
        </p>
      </div>

      {groups.map((group, gIdx) => (
        <div key={group.label} style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={badgeStyle(group.color, group.bg, group.border)}>
              {group.label}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
              {group.items.length} itens
            </span>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 60px", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
              {["Código", "Obs.", "Qtd."].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: 1 }}>{h}</span>
              ))}
            </div>
            {group.items.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 60px", padding: "12px 20px", borderBottom: i < group.items.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{item.code}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{item.observation || "—"}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", textAlign: "right" }}>{item.physical_qty}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Nova Validação Modal ──────────────────────────────────────────────────────
function NovaValidacaoModal({ onClose, onSaved, descMap }: { onClose: () => void; onSaved: () => void; descMap: Record<string, string> }) {
  const today = new Date().toISOString().split("T")[0];
  const [weekNumber, setWeekNumber] = useState(getWeekNumber(today).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [weekStart, setWeekStart] = useState(today);
  const [weekEnd, setWeekEnd] = useState(today);
  const [validationType, setValidationType] = useState("picking");
  const [notes, setNotes] = useState("");
  const [validatedCountAg, setValidatedCountAg] = useState("");
  const [validatedCountBr, setValidatedCountBr] = useState("");
  const [rows, setRows] = useState<DraftDivergence[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keyCounter, setKeyCounter] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<{ key: number, field: 'company' | 'resolved' } | null>(null);

  useEffect(() => {
    if (weekStart) {
      setWeekNumber(getWeekNumber(weekStart).toString());
      setYear(weekStart.split("-")[0]);
    }
  }, [weekStart]);

  function addRow() {
    setRows(r => [...r, { key: keyCounter, record_date: today, position: "", company: "AG", code: "", description: "", system_qty: "", physical_qty: "", treatment: "", observation: "", resolved: false }]);
    setKeyCounter(k => k + 1);
  }
  function removeRow(key: number) { setRows(r => r.filter(x => x.key !== key)); }
  function updateRow(key: number, field: keyof DraftDivergence, value: any) {
    setRows(r => r.map(x => x.key === key ? { ...x, [field]: value } : x));
  }

  async function handleSave() {
    if (!weekNumber || !weekStart || !weekEnd) { setError("Preencha semana, data início e fim."); return; }
    const countAg = parseInt(validatedCountAg) || 0;
    const countBr = parseInt(validatedCountBr) || 0;
    if (countAg === 0 && countBr === 0) { setError("Informe posições validadas para ao menos uma empresa."); return; }
    if (rows.some(r => !r.position || !r.code)) { setError("Preencha Posição e Código para todas as divergências."); return; }

    setSaving(true); setError("");
    try {
      let sessionAgId: string | null = null;
      let sessionBrId: string | null = null;

      const hasAgDivs = rows.some(r => r.company === "AG");
      if (countAg > 0 || hasAgDivs) {
        const { data: valAg, error: errAg } = await supabase.from("validation_sessions")
          .insert({ session_date: weekStart, week_number: parseInt(weekNumber), year: parseInt(year), week_start: weekStart, week_end: weekEnd, company: "AG", type: validationType, validated_count: countAg, notes: notes || null })
          .select().single();
        if (errAg || !valAg) throw new Error(`Erro sessão AG: ${errAg?.message}`);
        sessionAgId = valAg.id;
      }

      const hasBrDivs = rows.some(r => r.company === "BR");
      if (countBr > 0 || hasBrDivs) {
        const { data: valBr, error: errBr } = await supabase.from("validation_sessions")
          .insert({ session_date: weekStart, week_number: parseInt(weekNumber), year: parseInt(year), week_start: weekStart, week_end: weekEnd, company: "BR", type: validationType, validated_count: countBr, notes: notes || null })
          .select().single();
        if (errBr || !valBr) throw new Error(`Erro sessão BR: ${errBr?.message}`);
        sessionBrId = valBr.id;
      }

      if (rows.length > 0) {
        const toInsert = rows.map(r => {
          const sId = r.company === "AG" ? sessionAgId : sessionBrId;
          if (!sId) throw new Error(`Divergência ${r.company} sem sessão correspondente.`);
          return {
            session_id: sId,
            session_date: weekStart,
            position: r.position.toUpperCase().trim(),
            company: r.company,
            code: r.code.trim(),
            description: null,
            system_qty: parseInt(r.system_qty) || 0,
            physical_qty: parseInt(r.physical_qty) || 0,
            type: validationType,
            treatment: r.treatment || null,
            observation: r.observation || null,
            resolved: r.resolved
          };
        });
        const { error: divErr } = await supabase.from("divergences").insert(toInsert);
        if (divErr) throw new Error(`Erro divergências: ${divErr.message}`);
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Erro desconhecido.");
    } finally { setSaving(false); }
  }

  const field = "w-full bg-[#121622] border border-white/5 rounded-2xl px-4 py-3 text-[13px] text-white/90 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/20";
  const rowField = "w-full bg-[#121622] border border-white/5 rounded-xl px-2 py-1.5 text-[11px] text-white/90 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/20";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0A0D14] border border-white/10 rounded-[28px] w-full max-w-5xl my-8 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#07090F]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <ScanBarcode size={18} className="text-blue-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Nova Validação de Picking</h3>
              <p className="text-[11px] text-white/40 mt-0.5 font-medium tracking-wide">Registre o período e as divergências encontradas no WMS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white/85 hover:bg-white/5 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest block mb-3">Informações do Período</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Nº Semana", value: weekNumber, set: setWeekNumber, type: "number" },
                { label: "Ano", value: year, set: setYear, type: "number" },
                { label: "Data Início", value: weekStart, set: setWeekStart, type: "date" },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} className={field} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Tipo de Validação</label>
              <select value={validationType} onChange={e => setValidationType(e.target.value)} className={field}>
                <option value="picking">Picking</option>
                <option value="inventario">Inventário</option>
                <option value="avaria">Avaria</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Observações (opcional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Contagem nas prateleiras da AG" className={field} />
            </div>
          </div>

          <div className="bg-[#0E121C] border border-white/5 rounded-2xl p-5 shadow-inner">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={14} className="text-white/30" />
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Posições Auditadas</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-2">Total AG</label>
                <input type="number" value={validatedCountAg} onChange={e => setValidatedCountAg(e.target.value)} className={cn(field, "border-emerald-500/10 focus:border-emerald-500/30 text-emerald-300 font-semibold")} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-blue-400/80 mb-2">Total BR</label>
                <input type="number" value={validatedCountBr} onChange={e => setValidatedCountBr(e.target.value)} className={cn(field, "border-blue-500/10 focus:border-blue-500/30 text-blue-300 font-semibold")} />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Divergências Detectadas</span>
              </div>
              <span className="text-[11px] text-white/30 font-bold bg-white/5 px-2.5 py-1 rounded-full">{rows.length} registros</span>
            </div>

            <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#07090F]">
              <div className="grid bg-[#0E121C] border-b border-white/5 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-white/30 gap-1.5"
                style={{ gridTemplateColumns: "100px 65px 100px 1fr 105px 65px 65px 36px" }}>
                {["Posição", "Empresa", "Código", "Tratamento", "Status", "Sistema", "Físico", ""].map(h => (
                  <span key={h} className={cn((h === "Sistema" || h === "Físico" || h === "Empresa" || h === "Status") && "text-center")}>{h}</span>
                ))}
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-white/[0.03]">
                {rows.map(row => (
                  <div key={row.key} className="grid items-center px-3 py-2 hover:bg-white/[0.01] gap-1.5"
                    style={{ gridTemplateColumns: "100px 65px 100px 1fr 105px 65px 65px 36px" }}>
                    <input type="text" value={row.position} onChange={e => updateRow(row.key, "position", e.target.value)} className={cn(rowField, "px-2 py-1.5 rounded-xl font-mono uppercase text-white/80")} />
                    <div className="relative">
                      <button type="button" onClick={() => setActiveDropdown(activeDropdown?.key === row.key && activeDropdown?.field === 'company' ? null : { key: row.key, field: 'company' })} className="w-full bg-[#121622] border border-white/5 rounded-xl px-2 py-1.5 text-[11px] font-bold text-white/80 flex items-center justify-between gap-1">
                        <span className="w-full text-center">{row.company}</span>
                        <ChevronDown size={10} className="text-white/30 shrink-0" />
                      </button>
                      {activeDropdown?.key === row.key && activeDropdown?.field === 'company' && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#121622] border border-white/10 rounded-xl shadow-2xl z-50">
                          <button type="button" onClick={() => { updateRow(row.key, "company", "AG"); setActiveDropdown(null); }} className="w-full text-center px-2 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/5 transition-all">AG</button>
                          <button type="button" onClick={() => { updateRow(row.key, "company", "BR"); setActiveDropdown(null); }} className="w-full text-center px-2 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/5 transition-all">BR</button>
                        </div>
                      )}
                    </div>
                    <input type="text" value={row.code} onChange={e => updateRow(row.key, "code", e.target.value)} className={cn(rowField, "px-2 py-1.5 rounded-xl font-mono text-white/80")} />
                    <input type="text" value={row.treatment} placeholder="Tratamento..." onChange={e => updateRow(row.key, "treatment", e.target.value)} className={cn(rowField, "px-2 py-1.5 rounded-xl text-white/80")} />
                    <div className="relative">
                      <button type="button" onClick={() => setActiveDropdown(activeDropdown?.key === row.key && activeDropdown?.field === 'resolved' ? null : { key: row.key, field: 'resolved' })} className="w-full bg-[#121622] border border-white/5 rounded-xl px-2 py-1.5 text-[11px] font-bold flex items-center justify-between gap-1">
                        <span className={cn("w-full text-center", row.resolved ? "text-emerald-400" : "text-amber-400")}>{row.resolved ? "Resolvido" : "Pendente"}</span>
                        <ChevronDown size={10} className="text-white/30 shrink-0" />
                      </button>
                      {activeDropdown?.key === row.key && activeDropdown?.field === 'resolved' && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#121622] border border-white/10 rounded-xl shadow-2xl z-50 min-w-[90px]">
                          <button type="button" onClick={() => { updateRow(row.key, "resolved", false); setActiveDropdown(null); }} className="w-full text-center px-2 py-1.5 text-[11px] font-bold text-amber-400 hover:bg-white/5 transition-all">Pendente</button>
                          <button type="button" onClick={() => { updateRow(row.key, "resolved", true); setActiveDropdown(null); }} className="w-full text-center px-2 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-white/5 transition-all">Resolvido</button>
                        </div>
                      )}
                    </div>
                    <input type="number" value={row.system_qty} onChange={e => updateRow(row.key, "system_qty", e.target.value)} className={cn(rowField, "px-1 py-1.5 rounded-xl text-center font-mono")} />
                    <input type="number" value={row.physical_qty} onChange={e => updateRow(row.key, "physical_qty", e.target.value)} className={cn(rowField, "px-1 py-1.5 rounded-xl text-center font-mono")} />
                    <div className="flex justify-end">
                      <button onClick={() => removeRow(row.key)} className="flex items-center justify-center w-8 h-8 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/35 hover:text-amber-400 hover:bg-amber-500/5 transition-all border-t border-white/5"><Plus size={14} /> Adicionar Divergência</button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-8 py-6 border-t border-white/5 bg-[#07090F]">
          <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">{rows.length} divergências</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[12px] font-bold uppercase tracking-wider transition-all disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{saving ? "Salvando..." : "Salvar Alterações"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Editar Validação Modal ──────────────────────────────────────────────────────
function EditarValidacaoModal({ group, onClose, onSaved, descMap }: { group: WeekGroup; onClose: () => void; onSaved: () => void; descMap: Record<string, string> }) {
  const [weekNumber, setWeekNumber] = useState(group.week_number.toString());
  const [year, setYear] = useState(group.year.toString());
  const [weekStart, setWeekStart] = useState(group.week_start);
  const [notes, setNotes] = useState(group.notes || "");
  const [validatedCountAg, setValidatedCountAg] = useState(group.sessions.find(s => s.company === "AG")?.validated_count.toString() || "0");
  const [validatedCountBr, setValidatedCountBr] = useState(group.sessions.find(s => s.company === "BR")?.validated_count.toString() || "0");
  const [rows, setRows] = useState<DraftDivergence[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keyCounter, setKeyCounter] = useState(1000);
  const [activeDropdown, setActiveDropdown] = useState<{ key: number, field: 'company' | 'resolved' } | null>(null);

  useEffect(() => {
    if (group.divergences) {
      setRows(group.divergences.map((d, i) => ({
        key: i,
        record_date: d.session_date,
        position: d.position,
        company: d.company,
        code: d.code,
        description: d.description || "",
        system_qty: d.system_qty.toString(),
        physical_qty: d.physical_qty.toString(),
        treatment: d.treatment || "",
        observation: d.observation || "",
        resolved: d.resolved ?? false
      })));
    }
  }, [group]);

  function addRow() {
    setRows(r => [...r, { key: keyCounter, record_date: weekStart, position: "", company: "AG", code: "", description: "", system_qty: "", physical_qty: "", treatment: "", observation: "", resolved: false }]);
    setKeyCounter(k => k + 1);
  }
  function removeRow(key: number) { setRows(r => r.filter(x => x.key !== key)); }
  function updateRow(key: number, field: keyof DraftDivergence, value: any) {
    setRows(r => r.map(x => x.key === key ? { ...x, [field]: value } : x));
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const sessionIds = group.sessions.map(s => s.id);
      const countAg = parseInt(validatedCountAg) || 0;
      const countBr = parseInt(validatedCountBr) || 0;
      let sessionAgId: string | null = group.sessions.find(s => s.company === "AG")?.id || null;
      let sessionBrId: string | null = group.sessions.find(s => s.company === "BR")?.id || null;
      const hasAgDivs = rows.some(r => r.company === "AG");
      if (countAg > 0 || hasAgDivs) {
        if (sessionAgId) { await supabase.from("validation_sessions").update({ session_date: weekStart, week_number: parseInt(weekNumber), year: parseInt(year), week_start: weekStart, validated_count: countAg, notes: notes || null }).eq("id", sessionAgId); }
        else { const { data: nAg } = await supabase.from("validation_sessions").insert({ session_date: weekStart, week_number: parseInt(weekNumber), year: parseInt(year), week_start: weekStart, week_end: group.week_end, company: "AG", type: group.type, validated_count: countAg, notes: notes || null }).select().single(); sessionAgId = nAg?.id; }
      }
      const hasBrDivs = rows.some(r => r.company === "BR");
      if (countBr > 0 || hasBrDivs) {
        if (sessionBrId) { await supabase.from("validation_sessions").update({ session_date: weekStart, week_number: parseInt(weekNumber), year: parseInt(year), week_start: weekStart, validated_count: countBr, notes: notes || null }).eq("id", sessionBrId); }
        else { const { data: nBr } = await supabase.from("validation_sessions").insert({ session_date: weekStart, week_number: parseInt(weekNumber), year: parseInt(year), week_start: weekStart, week_end: group.week_end, company: "BR", type: group.type, validated_count: countBr, notes: notes || null }).select().single(); sessionBrId = nBr?.id; }
      }
      if (sessionIds.length > 0) await supabase.from("divergences").delete().in("session_id", sessionIds);
      if (rows.length > 0) {
        const toInsert = rows.map(r => {
          const sId = r.company === "AG" ? sessionAgId : sessionBrId;
          if (!sId) throw new Error(`Divergência ${r.company} sem sessão correspondente.`);
          return { session_id: sId, session_date: weekStart, position: r.position.toUpperCase().trim(), company: r.company, code: r.code.trim(), description: null, system_qty: parseInt(r.system_qty) || 0, physical_qty: parseInt(r.physical_qty) || 0, type: group.type, treatment: r.treatment || null, observation: r.observation || null, resolved: r.resolved };
        });
        await supabase.from("divergences").insert(toInsert);
      }
      onSaved(); onClose();
    } catch (err: unknown) { setError((err as Error).message || "Erro desconhecido."); } finally { setSaving(false); }
  }

  const field = "w-full bg-[#121622] border border-white/5 rounded-2xl px-4 py-3 text-[13px] text-white/90 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-white/20";
  const rowField = "w-full bg-[#121622] border border-white/5 rounded-xl px-2 py-1.5 text-[11px] text-white/90 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/20";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0A0D14] border border-white/10 rounded-[28px] w-full max-w-5xl my-8 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#07090F]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Pencil size={18} className="text-amber-400" /></div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Editar Validação — Semana {group.week_number}</h3>
              <p className="text-[11px] text-white/40 mt-0.5 font-medium tracking-wide">Tipo: <span className="text-amber-400/80 font-bold uppercase">{group.type}</span> · Alterações substituem os dados anteriores</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white/85 hover:bg-white/5 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{ label: "Nº Semana", value: weekNumber, set: setWeekNumber, type: "number" }, { label: "Ano", value: year, set: setYear, type: "number" }, { label: "Data Início", value: weekStart, set: setWeekStart, type: "date" }].map(f => (
              <div key={f.label}><label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">{f.label}</label><input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} className={field} /></div>
            ))}
          </div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Observações (opcional)</label><input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={field} /></div>
          <div className="bg-[#0E121C] border border-white/5 rounded-2xl p-5 shadow-inner">
            <div className="flex items-center gap-2 mb-4"><Building2 size={14} className="text-white/30" /><span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Posições Auditadas</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-2">Total AG</label><input type="number" value={validatedCountAg} onChange={e => setValidatedCountAg(e.target.value)} className={cn(field, "border-emerald-500/10 focus:border-emerald-500/30 text-emerald-300 font-semibold")} /></div>
              <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-blue-400/80 mb-2">Total BR</label><input type="number" value={validatedCountBr} onChange={e => setValidatedCountBr(e.target.value)} className={cn(field, "border-blue-500/10 focus:border-blue-500/30 text-blue-300 font-semibold")} /></div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><AlertTriangle size={14} className="text-amber-400" /><span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Divergências</span></div><span className="text-[11px] text-white/30 font-bold bg-white/5 px-2.5 py-1 rounded-full">{rows.length} registros</span></div>
            <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#07090F]">
              <div className="grid bg-[#0E121C] border-b border-white/5 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-white/30 gap-1.5" style={{ gridTemplateColumns: "100px 65px 100px 1fr 105px 65px 65px 36px" }}>{["Posição", "Empresa", "Código", "Tratamento", "Status", "Sistema", "Físico", ""].map(h => (<span key={h} className={cn((h === "Sistema" || h === "Físico" || h === "Empresa" || h === "Status") && "text-center")}>{h}</span>))}</div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-white/[0.03]">
                {rows.map(row => (
                  <div key={row.key} className="grid items-center px-3 py-2 hover:bg-white/[0.01] gap-1.5" style={{ gridTemplateColumns: "100px 65px 100px 1fr 105px 65px 65px 36px" }}>
                    <input type="text" value={row.position} onChange={e => updateRow(row.key, "position", e.target.value)} className={cn(rowField, "px-2 py-1.5 rounded-xl font-mono uppercase text-white/80")} />
                    <div className="relative"><button type="button" onClick={() => setActiveDropdown(activeDropdown?.key === row.key && activeDropdown?.field === 'company' ? null : { key: row.key, field: 'company' })} className="w-full bg-[#121622] border border-white/5 rounded-xl px-2 py-1.5 text-[11px] font-bold text-white/80 flex items-center justify-between gap-1"><span className="w-full text-center">{row.company}</span><ChevronDown size={10} className="text-white/30 shrink-0" /></button>
                      {activeDropdown?.key === row.key && activeDropdown?.field === 'company' && (<div className="absolute top-full left-0 right-0 mt-1 bg-[#121622] border border-white/10 rounded-xl shadow-2xl z-50"><button type="button" onClick={() => { updateRow(row.key, "company", "AG"); setActiveDropdown(null); }} className="w-full text-center px-2 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/5 transition-all">AG</button><button type="button" onClick={() => { updateRow(row.key, "company", "BR"); setActiveDropdown(null); }} className="w-full text-center px-2 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/5 transition-all">BR</button></div>)}</div>
                    <input type="text" value={row.code} onChange={e => updateRow(row.key, "code", e.target.value)} className={cn(rowField, "px-2 py-1.5 rounded-xl font-mono text-white/80")} />
                    <input type="text" value={row.treatment} placeholder="Tratamento..." onChange={e => updateRow(row.key, "treatment", e.target.value)} className={cn(rowField, "px-2 py-1.5 rounded-xl text-white/80")} />
                    <div className="relative"><button type="button" onClick={() => setActiveDropdown(activeDropdown?.key === row.key && activeDropdown?.field === 'resolved' ? null : { key: row.key, field: 'resolved' })} className="w-full bg-[#121622] border border-white/5 rounded-xl px-2 py-1.5 text-[11px] font-bold flex items-center justify-between gap-1"><span className={cn("w-full text-center", row.resolved ? "text-emerald-400" : "text-amber-400")}>{row.resolved ? "Resolvido" : "Pendente"}</span><ChevronDown size={10} className="text-white/30 shrink-0" /></button>
                      {activeDropdown?.key === row.key && activeDropdown?.field === 'resolved' && (<div className="absolute top-full left-0 right-0 mt-1 bg-[#121622] border border-white/10 rounded-xl shadow-2xl z-50 min-w-[90px]"><button type="button" onClick={() => { updateRow(row.key, "resolved", false); setActiveDropdown(null); }} className="w-full text-center px-2 py-1.5 text-[11px] font-bold text-amber-400 hover:bg-white/5 transition-all">Pendente</button><button type="button" onClick={() => { updateRow(row.key, "resolved", true); setActiveDropdown(null); }} className="w-full text-center px-2 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-white/5 transition-all">Resolvido</button></div>)}</div>
                    <input type="number" value={row.system_qty} onChange={e => updateRow(row.key, "system_qty", e.target.value)} className={cn(rowField, "px-1 py-1.5 rounded-xl text-center font-mono")} />
                    <input type="number" value={row.physical_qty} onChange={e => updateRow(row.key, "physical_qty", e.target.value)} className={cn(rowField, "px-1 py-1.5 rounded-xl text-center font-mono")} />
                    <div className="flex justify-end"><button onClick={() => removeRow(row.key)} className="flex items-center justify-center w-8 h-8 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button></div>
                  </div>
                ))}
              </div>
              <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/35 hover:text-amber-400 hover:bg-amber-500/5 transition-all border-t border-white/5"><Plus size={14} /> Adicionar Divergência</button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-8 py-6 border-t border-white/5 bg-[#07090F]">
          <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">{rows.length} divergências</span>
          <div className="flex gap-3"><button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">Cancelar</button><button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[12px] font-bold uppercase tracking-wider transition-all disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{saving ? "Salvando..." : "Salvar Alterações"}</button></div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail View ─────────────────────────────────────────
function DetailView({ v, onBack, descMap }: { v: WeekGroup; onBack: () => void; descMap: Record<string, string> }) {
  const [capturing, setCapturing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  async function handleCapture() {
    if (!cardRef.current) return;
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: "#080C12", scale: 2, useCORS: true });
      const link = document.createElement("a"); link.download = `auditoria_semana_${v.week_number}.png`; link.href = canvas.toDataURL("image/png"); link.click();
    } finally { setCapturing(false); }
  }
  const valAg = v.sessions.find(s => s.company === "AG")?.validated_count ?? 0;
  const valBr = v.sessions.find(s => s.company === "BR")?.validated_count ?? 0;
  const totalVal = valAg + valBr;
  const totalDivs = v.divergences.length;
  const accuracy = totalVal > 0 ? ((totalVal - totalDivs) / totalVal) * 100 : 100;

  return (
    <div className="min-h-full space-y-6">
      <div style={{ position: "fixed", left: -9999, top: 0, zIndex: -1 }}><ShareCard cardRef={cardRef} items={v.divergences} weekInfo={`Semana ${v.week_number}`} /></div>
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"><ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /><span className="text-[11px] font-bold uppercase tracking-widest">Voltar para Lista</span></button>
        <button onClick={handleCapture} disabled={capturing} className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all">{capturing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{capturing ? "Gerando..." : "Baixar Imagem"}</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0D1117] border border-white/5 rounded-[32px] p-8 relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div><div className="flex items-center gap-3 mb-1"><h2 className="text-2xl font-bold uppercase tracking-tighter">Semana {v.week_number}</h2><span className="text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">{v.type}</span></div><p className="text-[11px] text-white/30 font-bold uppercase tracking-widest">{fmtFullDate(v.week_start)} até {fmtFullDate(v.week_end)}</p></div>
              <div className="text-right"><span className="block text-[10px] font-extrabold text-white/20 uppercase tracking-widest mb-1">Acurácia da Semana</span><span className={cn("text-3xl font-light tabular-nums", accuracy >= 95 ? "text-emerald-400" : "text-amber-400")}>{accuracy.toFixed(1)}%</span></div>
            </div>
            <div className="grid grid-cols-3 gap-4">{[{ label: "Auditadas", val: totalVal, color: "text-white/60" }, { label: "Divergências", val: totalDivs, color: "text-red-400" }, { label: "Corretas", val: totalVal - totalDivs, color: "text-emerald-400" }].map(s => (<div key={s.label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4"><span className="block text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">{s.label}</span><span className={cn("text-xl font-bold font-mono", s.color)}>{s.val}</span></div>))}</div>
          </div>
          <div className="bg-[#0D1117] border border-white/5 rounded-[32px] overflow-hidden">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]"><h3 className="text-[11px] font-extrabold uppercase tracking-widest text-white/40">Detalhamento das Divergências</h3><span className="text-[10px] font-bold bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full">{totalDivs} registros</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="border-b border-white/5 text-[9px] font-extrabold uppercase tracking-widest text-white/20"><th className="px-8 py-4">Posição</th><th className="px-8 py-4">Código</th><th className="px-8 py-4">Empresa</th><th className="px-8 py-4 text-center">Sistema</th><th className="px-8 py-4 text-center">Físico</th><th className="px-8 py-4">Status</th></tr></thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {v.divergences.map((d, i) => (
                    <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-4 text-[12px] font-mono text-white/60">{d.position}</td>
                      <td className="px-8 py-4"><div className="flex flex-col"><span className="text-[12px] font-bold text-white/80">{d.code}</span><span className="text-[10px] text-white/30 truncate max-w-[200px]">{descMap[d.code] || "—"}</span></div></td>
                      <td className="px-8 py-4 text-[11px] font-bold text-white/40">{d.company}</td>
                      <td className="px-8 py-4 text-center text-[12px] font-mono text-white/30">{d.system_qty}</td>
                      <td className="px-8 py-4 text-center text-[12px] font-mono text-white/80 font-bold">{d.physical_qty}</td>
                      <td className="px-8 py-4"><span className={cn("text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full", d.resolved ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10")}>{d.resolved ? "Resolvido" : "Pendente"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-[#0D1117] border border-white/5 rounded-[32px] p-6"><h3 className="text-[10px] font-extrabold uppercase tracking-widest text-white/20 mb-6">Divisão por Empresa</h3>
            <div className="space-y-6">
              {[ { label: "AG", val: valAg, divs: v.divergences.filter(d => d.company === "AG").length, color: "text-blue-400", bg: "bg-blue-400" }, { label: "BR", val: valBr, divs: v.divergences.filter(d => d.company === "BR").length, color: "text-emerald-400", bg: "bg-emerald-400" }].map(c => {
                const acc = c.val > 0 ? ((c.val - c.divs) / c.val) * 100 : 100;
                return (<div key={c.label} className="space-y-3"><div className="flex justify-between items-end"><span className={cn("text-sm font-black", c.color)}>{c.label}</span><span className="text-[11px] font-bold text-white/60">{acc.toFixed(1)}%</span></div><div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all duration-1000", c.bg)} style={{ width: `${acc}%` }} /></div><div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/20"><span>{c.val} auditadas</span><span>{c.divs} divergências</span></div></div>);
              })}
            </div>
          </div>
          <div className="bg-blue-600 rounded-[32px] p-6 text-white relative overflow-hidden group"><div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500"><ShieldAlert size={80} /></div><h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-60">Observações da Auditoria</h3><p className="text-sm font-medium leading-relaxed mb-6">{v.notes || "Nenhuma observação registrada para este período de auditoria."}</p><div className="flex items-center gap-3 pt-6 border-t border-white/10"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><CheckCircle2 size={14} /></div><span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Validado pelo Sistema</span></div></div>
        </div>
      </div>
    </div>
  );
}

// ─── Editar Tratativa Modal ───────────────────────────────────────────────────
function EditarTratativaModal({ group, onClose, onSaved }: { group: ConsolidatedGroup; onClose: () => void; onSaved: () => void }) {
  const [treatment, setTreatment] = useState(group.treatment);
  const [observation, setObservation] = useState(group.observation);
  const [resolved, setResolved] = useState(group.resolved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  async function handleSave() {
    setSaving(true); setError("");
    try { const ids = group.items.map(i => i.id); await supabase.from("divergences").update({ treatment, observation, resolved }).in("id", ids); onSaved(); onClose(); }
    catch (err: unknown) { setError((err as Error).message || "Erro ao salvar."); } finally { setSaving(false); }
  }
  const field = "w-full bg-[#121622] border border-white/5 rounded-2xl px-4 py-3 text-[13px] text-white/90 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/20";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0A0D14] border border-white/10 rounded-[28px] w-full max-w-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#07090F]"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><ShieldAlert size={18} className="text-blue-400" /></div><div><h3 className="text-base font-bold text-white uppercase tracking-wider">Tratativa de Divergência</h3><p className="text-[11px] text-white/40 mt-0.5 font-medium tracking-wide">Defina a ação corretiva e o status final</p></div></div><button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white/85 hover:bg-white/5 transition-colors"><X size={18} /></button></div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4"><div><span className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Posição</span><span className="text-[13px] font-mono font-bold text-white">{group.position}</span></div><div><span className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Código</span><span className="text-[13px] font-mono font-bold text-white">{group.code}</span></div><div className="col-span-2 mt-2 pt-2 border-t border-white/5"><span className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Semanas Afetadas</span><span className="text-[11px] font-semibold text-blue-400/80">{group.items.map(i => `Semana ${i.week_number} (${i.company})`).join(", ")}</span></div></div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Tratamento / Ação</label><input type="text" value={treatment} onChange={e => setTreatment(e.target.value)} placeholder="Ex: Ajuste de estoque realizado" className={field} /></div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Observações</label><input type="text" value={observation} onChange={e => setObservation(e.target.value)} placeholder="Ex: Produto foi recontado" className={field} /></div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Status</label><div className="relative"><button type="button" onClick={() => setStatusOpen(o => !o)} className="w-full bg-[#121622] border border-white/5 rounded-2xl px-4 py-3 text-[13px] outline-none flex items-center justify-between gap-3 hover:border-white/10"><div className="flex items-center gap-2.5">{resolved ? (<><span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" /><span className="text-emerald-400 font-bold">Resolvido</span></>) : (<><span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" /><span className="text-amber-400 font-bold">Pendente</span></>)}</div><ChevronDown size={14} className={cn("text-white/30 transition-transform duration-200", statusOpen && "rotate-180")} /></button>
            {statusOpen && (<div className="absolute top-full left-0 right-0 mt-1.5 bg-[#121622] border border-white/10 rounded-2xl shadow-2xl z-50"><button type="button" onClick={() => { setResolved(false); setStatusOpen(false); }} className={cn("w-full flex items-center gap-3 px-4 py-3.5 text-[13px] font-bold transition-all hover:bg-white/5", !resolved ? "bg-amber-500/10 text-amber-400" : "text-white/50")}><span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />Pendente</button><div className="h-px bg-white/5" /><button type="button" onClick={() => { setResolved(true); setStatusOpen(false); }} className={cn("w-full flex items-center gap-3 px-4 py-3.5 text-[13px] font-bold transition-all hover:bg-white/5", resolved ? "bg-emerald-500/10 text-emerald-400" : "text-white/50")}><span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />Resolvido</button></div>)}</div></div>
          {error && <p className="text-red-400 text-[12px] font-bold bg-red-500/8 border border-red-500/15 rounded-2xl px-5 py-4">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-white/5 bg-[#07090F]"><button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">Cancelar</button><button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-bold uppercase tracking-wider transition-all disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{saving ? "Salvando..." : "Salvar Tratativa"}</button></div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ValidacoesPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [selected, setSelected] = useState<WeekGroup | null>(null);
  const [weekGroups, setWeekGroups] = useState<WeekGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WeekGroup | null>(null);
  const [descMap, setDescMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"weeks" | "divergences">("weeks");
  const [editingTratativa, setEditingTratativa] = useState<ConsolidatedGroup | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAdmin(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setIsAdmin(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchDescriptions = useCallback(async () => {
    const { data } = await supabase.from("base_codigos").select("code, description");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((item: any) => { const code = item["code"]?.trim().toUpperCase(); const desc = item["description"]; if (code && desc) map[code] = desc; });
      setDescMap(map);
    }
  }, []);

  const fetchValidations = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessions } = await supabase.from("validation_sessions").select("*").order("week_start", { ascending: false });
      if (!sessions) { setWeekGroups([]); return; }
      const { data: divergences } = await supabase.from("divergences").select("*");
      const divs = divergences ?? [];
      const groupsMap: Record<string, WeekGroup> = {};
      sessions.forEach((s: ValidationSession) => {
        const key = `${s.year}-W${s.week_number}-${s.type}`;
        if (!groupsMap[key]) { groupsMap[key] = { week_number: s.week_number, year: s.year, week_start: s.week_start, week_end: s.week_end, type: s.type, notes: s.notes || undefined, sessions: [], divergences: [] }; }
        groupsMap[key].sessions.push(s); if (!groupsMap[key].notes && s.notes) groupsMap[key].notes = s.notes;
        groupsMap[key].divergences.push(...divs.filter((d: Divergence) => d.session_id === s.id));
      });
      setWeekGroups(Object.values(groupsMap).sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime()));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchValidations(); fetchDescriptions(); }, [fetchValidations, fetchDescriptions]);

  const deleteWeekGroup = async (v: WeekGroup, e: React.MouseEvent) => {
    e.stopPropagation(); if (!confirm(`Remover Semana ${v.week_number}?`)) return;
    try { const ids = v.sessions.map(s => s.id); if (ids.length > 0) await supabase.from("validation_sessions").delete().in("id", ids); fetchValidations(); }
    catch (err: unknown) { alert(`Erro: ${(err as Error).message}`); }
  };

  if (view === "detail" && selected) {
    const activeGroup = weekGroups.find(g => g.week_number === selected.week_number && g.year === selected.year) || selected;
    return <DetailView v={activeGroup} onBack={() => { setView("list"); setSelected(null); fetchValidations(); }} descMap={descMap} />;
  }

  const avgAccuracy = weekGroups.length > 0 ? weekGroups.reduce((acc, g) => {
    const valAg = g.sessions.find(s => s.company === "AG")?.validated_count ?? 0;
    const valBr = g.sessions.find(s => s.company === "BR")?.validated_count ?? 0;
    const total = valAg + valBr; const divs = g.divergences.length; return acc + (total > 0 ? ((total - divs) / total) * 100 : 100);
  }, 0) / weekGroups.length : 100;
  const allDivergences = weekGroups.reduce((acc, g) => acc + g.divergences.length, 0);

  const allDivergencesList: DivergenceWithWeek[] = [];
  weekGroups.forEach(g => g.divergences.forEach(d => allDivergencesList.push({ ...d, week_number: g.week_number, year: g.year })));
  const consolidatedMap: Record<string, ConsolidatedGroup> = {};
  allDivergencesList.forEach(d => {
    const isResolved = d.resolved ?? false; const groupKey = `${d.position?.toUpperCase().trim()}_${d.code?.toUpperCase().trim()}_${isResolved}`;
    if (!consolidatedMap[groupKey]) { consolidatedMap[groupKey] = { key: groupKey, position: d.position, code: d.code, resolved: isResolved, treatment: d.treatment ?? "", observation: d.observation ?? "", company: d.company, items: [] }; }
    consolidatedMap[groupKey].items.push(d);
  });
  const consolidatedList = Object.values(consolidatedMap).sort((a, b) => a.resolved !== b.resolved ? (a.resolved ? 1 : -1) : a.position.localeCompare(b.position));

  return (
    <>
      {showModal && <NovaValidacaoModal onClose={() => setShowModal(false)} onSaved={fetchValidations} descMap={descMap} />}
      {editingGroup && <EditarValidacaoModal group={editingGroup} onClose={() => setEditingGroup(null)} onSaved={fetchValidations} descMap={descMap} />}
      {editingTratativa && <EditarTratativaModal group={editingTratativa} onClose={() => setEditingTratativa(null)} onSaved={fetchValidations} />}

      <div className="min-h-full"><div className="w-full max-w-full px-6 md:px-10 lg:px-14 py-8 mx-auto space-y-6">
          <div className="flex items-center justify-between"><span className="text-white/60 font-bold uppercase tracking-widest text-[11px] flex items-center gap-2"><ScanBarcode size={14} className="text-blue-500 animate-pulse" /> Auditoria Geral de Picking</span><button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all"><Plus size={14} /> Nova Validação</button></div>
          {!loading && weekGroups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[#0D1117] border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"><div className="flex items-center justify-between mb-4"><span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Taxa de Acurácia</span><div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400"><Percent size={14} /></div></div><div className="flex items-baseline gap-2"><span className="text-[32px] font-light text-emerald-400 tabular-nums">{avgAccuracy.toFixed(1)}%</span><span className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest">média geral</span></div></div>
              <div className="bg-[#0D1117] border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all duration-300"><div className="flex items-center justify-between mb-4"><span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Divergências</span><div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400"><AlertTriangle size={14} /></div></div><div className="flex items-baseline gap-2"><span className="text-[32px] font-light text-red-400 tabular-nums">{allDivergences}</span><span className="text-[10px] font-bold text-red-500/50 uppercase tracking-widest">total</span></div></div>
            </div>
          )}
          <div className="bg-[#0D1117] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]"><div className="flex gap-4"><button onClick={() => setActiveTab("weeks")} className={cn("py-4 text-[11px] font-extrabold uppercase tracking-widest border-b-2 transition-all outline-none", activeTab === "weeks" ? "border-blue-500 text-blue-400" : "border-transparent text-white/40 hover:text-white/70")}>Histórico por Semana</button><button onClick={() => setActiveTab("divergences")} className={cn("py-4 text-[11px] font-extrabold uppercase tracking-widest border-b-2 transition-all outline-none", activeTab === "divergences" ? "border-blue-500 text-blue-400" : "border-transparent text-white/40 hover:text-white/70")}>Painel de Divergências</button></div></div>
            {activeTab === "weeks" ? (
              <div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr className="border-b border-white/5 bg-[#080B11]/50 text-[10px] font-bold uppercase tracking-widest text-white/30"><th className="px-6 py-4 text-left">Semana</th><th className="px-6 py-4 text-left">Período</th><th className="px-6 py-4 text-center">Acurácia</th><th className="px-6 py-4 w-24"></th></tr></thead>
                  <tbody className="divide-y divide-white/[0.03]">{weekGroups.map(v => {
                    const total = v.sessions.reduce((acc, s) => acc + s.validated_count, 0); const acc = total > 0 ? ((total - v.divergences.length) / total) * 100 : 100;
                    return (<tr key={v.week_number} onClick={() => { setSelected(v); setView("detail"); }} className="group hover:bg-white/[0.01] cursor-pointer transition-all"><td className="px-6 py-4 font-bold text-white">Semana {v.week_number}</td><td className="px-6 py-4 font-mono text-white/60">{fmtFullDate(v.week_start)}</td><td className="px-6 py-4 text-center font-mono font-bold text-emerald-400">{acc.toFixed(1)}%</td><td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}><div className="flex justify-end gap-2">
                      {/* CORREÇÃO DO LÁPIS - Apenas stopPropagation adicionado */}
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingGroup(v); }} className="p-2 rounded-xl text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"><Pencil size={13} /></button>
                      <button onClick={(e) => deleteWeekGroup(v, e)} className="p-2 rounded-xl text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"><Trash2 size={13} /></button>
                    </div></td></tr>);
                  })}</tbody></table></div>
            ) : (
              <div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr className="border-b border-white/5 bg-[#080B11]/50 text-[10px] font-bold uppercase tracking-widest text-white/30"><th className="px-4 py-4 text-left">Posição</th><th className="px-4 py-4 text-left">Código</th><th className="px-4 py-4 text-left">Tratamento</th><th className="px-4 py-4 text-center">Status</th><th className="px-4 py-4 w-12"></th></tr></thead>
                  <tbody className="divide-y divide-white/[0.03]">{consolidatedList.map(group => (<tr key={group.key} className="hover:bg-white/[0.01] cursor-pointer transition-all"><td className="px-4 py-3 font-mono text-white/60">{group.position}</td><td className="px-4 py-3 font-mono font-bold text-white/80">{group.code}</td><td className="px-4 py-3 text-[11px] text-white/40 italic">{group.treatment || "—"}</td><td className="px-4 py-3 text-center"><span className={cn("text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full", group.resolved ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/20" : "text-amber-500 bg-amber-500/5 border border-amber-500/20")}>{group.resolved ? "Resolvido" : "Pendente"}</span></td><td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}><button onClick={() => setEditingTratativa(group)} className="p-1.5 rounded-xl text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all"><Pencil size={12} /></button></td></tr>))}</tbody></table></div>
            )}
          </div>
        </div></div>
    </>
  );
}
