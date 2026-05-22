"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseAvarias } from "@/lib/supabase";
import {
  ArrowLeft, ScanBarcode, AlertTriangle, CheckCircle2, Plus,
  ChevronRight, Activity, Package, X, Trash2, Save, Loader2,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function fmtFullDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Nova Validação Modal ──────────────────────────────────────────────────────
function NovaValidacaoModal({ onClose, onSaved, descMap }: { onClose: () => void; onSaved: () => void; descMap: Record<string, string> }) {
  const today = new Date().toISOString().split("T")[0];
  const [weekNumber, setWeekNumber] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [weekStart, setWeekStart] = useState(today);
  const [weekEnd, setWeekEnd] = useState(today);
  const [notes, setNotes] = useState("");
  const [validatedCountAg, setValidatedCountAg] = useState("");
  const [validatedCountBr, setValidatedCountBr] = useState("");
  const [rows, setRows] = useState<DraftDivergence[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keyCounter, setKeyCounter] = useState(1);

  function addRow() {
    setRows(r => [...r, { key: keyCounter, record_date: today, position: "", company: "AG", code: "", description: "", system_qty: "", physical_qty: "" }]);
    setKeyCounter(k => k + 1);
  }
  function removeRow(key: number) { setRows(r => r.filter(x => x.key !== key)); }
  function updateRow(key: number, field: keyof DraftDivergence, value: string) {
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
          .insert({ session_date: weekStart, week_number: parseInt(weekNumber), year: parseInt(year), week_start: weekStart, week_end: weekEnd, company: "AG", type: "picking", validated_count: countAg, notes: notes || null })
          .select().single();
        if (errAg || !valAg) throw new Error(`Erro sessão AG: ${errAg?.message}`);
        sessionAgId = valAg.id;
      }

      const hasBrDivs = rows.some(r => r.company === "BR");
      if (countBr > 0 || hasBrDivs) {
        const { data: valBr, error: errBr } = await supabase.from("validation_sessions")
          .insert({ session_date: weekStart, week_number: parseInt(weekNumber), year: parseInt(year), week_start: weekStart, week_end: weekEnd, company: "BR", type: "picking", validated_count: countBr, notes: notes || null })
          .select().single();
        if (errBr || !valBr) throw new Error(`Erro sessão BR: ${errBr?.message}`);
        sessionBrId = valBr.id;
      }

      if (rows.length > 0) {
        const toInsert = rows.map(r => {
          const sId = r.company === "AG" ? sessionAgId : sessionBrId;
          if (!sId) throw new Error(`Divergência ${r.company} sem qtd. validada.`);
          return { session_id: sId, session_date: r.record_date, position: r.position.toUpperCase().trim(), company: r.company, code: r.code.trim(), description: r.description.trim() || null, system_qty: parseInt(r.system_qty) || 0, physical_qty: parseInt(r.physical_qty) || 0, type: "picking" };
        });
        const { error: divErr } = await supabase.from("divergences").insert(toInsert);
        if (divErr) throw new Error(`Erro divergências: ${divErr.message}`);
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Erro desconhecido.");
    } finally { setSaving(false); }
  }

  const field = "w-full bg-[#0D1117] border border-white/8 rounded-lg px-3 py-2 text-[13px] text-white/90 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0D1117] border border-white/8 rounded-2xl w-full max-w-5xl my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <ScanBarcode size={15} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Nova Validação de Picking</p>
              <p className="text-[11px] text-white/40 mt-0.5">Registre o período e as divergências encontradas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Semana */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Nº Semana", value: weekNumber, set: setWeekNumber, type: "number", placeholder: "21" },
              { label: "Ano", value: year, set: setYear, type: "number", placeholder: "2026" },
              { label: "Data Início", value: weekStart, set: setWeekStart, type: "date", placeholder: "" },
              { label: "Data Fim", value: weekEnd, set: setWeekEnd, type: "date", placeholder: "" },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1.5">{f.label}</label>
                <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} className={field} />
              </div>
            ))}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1.5">Observações (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Contagem nas prateleiras da AG" className={field} />
          </div>

          {/* Posições Auditadas */}
          <div className="bg-[#090D14] border border-white/6 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={13} className="text-white/30" />
              <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Posições Auditadas no WMS</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wider text-emerald-400/70 mb-1.5">Total AG</label>
                <input type="number" value={validatedCountAg} onChange={e => setValidatedCountAg(e.target.value)} placeholder="Ex: 102" className={field} />
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wider text-blue-400/70 mb-1.5">Total BR</label>
                <input type="number" value={validatedCountBr} onChange={e => setValidatedCountBr(e.target.value)} placeholder="Ex: 84" className={field} />
              </div>
            </div>
          </div>

          {/* Divergências */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-red-400/70" />
                <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Divergências Detectadas</span>
              </div>
              <span className="text-[11px] text-white/30">{rows.length} registro{rows.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="border border-white/6 rounded-xl overflow-hidden">
              <div className="grid bg-[#090D14] border-b border-white/6 px-3 py-2.5 text-[10px] font-medium uppercase tracking-wider text-white/30"
                style={{ gridTemplateColumns: "105px 135px 80px 100px 1fr 75px 75px 36px" }}>
                {["Data", "Posição", "Empresa", "Código", "Descrição", "Sistema", "Físico", ""].map(h => (
                  <span key={h}>{h}</span>
                ))}
              </div>

              <div className="max-h-60 overflow-y-auto">
                {rows.map(row => (
                  <div key={row.key} className="grid items-center px-3 py-2 border-b border-white/5 hover:bg-white/[0.02] gap-1.5"
                    style={{ gridTemplateColumns: "105px 135px 80px 100px 1fr 75px 75px 36px" }}>
                    <input type="date" value={row.record_date} onChange={e => updateRow(row.key, "record_date", e.target.value)} className={cn(field, "text-[11px]")} />
                    <input type="text" value={row.position} placeholder="PK30002A" onChange={e => updateRow(row.key, "position", e.target.value)} className={cn(field, "text-[11px] font-mono uppercase")} />
                    <select value={row.company} onChange={e => updateRow(row.key, "company", e.target.value as Company)} className={cn(field, "text-[11px]")}>
                      <option value="AG">AG</option>
                      <option value="BR">BR</option>
                    </select>
                    <input
                      type="text"
                      value={row.code}
                      placeholder="3798-01"
                      onChange={e => {
                        const code = e.target.value;
                        updateRow(row.key, "code", code);
                        if (descMap && descMap[code]) {
                          updateRow(row.key, "description", descMap[code]);
                        }
                      }}
                      className={cn(field, "text-[11px] font-mono")}
                    />
                    <input type="text" value={row.description} placeholder="Automático ou manual" onChange={e => updateRow(row.key, "description", e.target.value)} className={cn(field, "text-[11px]")} />
                    <input type="number" value={row.system_qty} placeholder="0" onChange={e => updateRow(row.key, "system_qty", e.target.value)} className={cn(field, "text-[11px] text-center")} />
                    <input type="number" value={row.physical_qty} placeholder="0" onChange={e => updateRow(row.key, "physical_qty", e.target.value)} className={cn(field, "text-[11px] text-center")} />
                    <button onClick={() => removeRow(row.key)} className="flex items-center justify-center w-8 h-8 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {rows.length === 0 && (
                  <div className="py-8 text-center text-[11px] text-white/25 flex flex-col items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500/30" />
                    Sem divergências — acurácia 100%
                  </div>
                )}
              </div>

              <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] text-white/30 hover:text-blue-400 hover:bg-blue-500/5 transition-colors border-t border-white/5">
                <Plus size={12} /> Adicionar Divergência
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-[12px] bg-red-500/8 border border-red-500/15 rounded-lg px-4 py-3">{error}</p>}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/8">
          <span className="text-[11px] text-white/30">{rows.length} divergências</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-[12px] text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? "Salvando..." : "Salvar Validação"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────
function DetailView({ v, onBack, descMap }: { v: WeekGroup; onBack: () => void; descMap: Record<string, string> }) {
  const agSession = v.sessions.find(s => s.company === "AG");
  const brSession = v.sessions.find(s => s.company === "BR");
  const validatedAg = agSession?.validated_count ?? 0;
  const validatedBr = brSession?.validated_count ?? 0;
  const validatedTotal = validatedAg + validatedBr;
  const agDivs = v.divergences.filter(d => d.company === "AG");
  const brDivs = v.divergences.filter(d => d.company === "BR");
  const agAcc = validatedAg > 0 ? ((validatedAg - agDivs.length) / validatedAg) * 100 : 100;
  const brAcc = validatedBr > 0 ? ((validatedBr - brDivs.length) / validatedBr) * 100 : 100;
  const totalAcc = validatedTotal > 0 ? ((validatedTotal - v.divergences.length) / validatedTotal) * 100 : 100;
  const totalSys = v.divergences.reduce((s, r) => s + r.system_qty, 0);
  const totalFis = v.divergences.reduce((s, r) => s + r.physical_qty, 0);
  const totalDiff = totalFis - totalSys;

  const DivRow = ({ r }: { r: Divergence }) => {
    const diff = r.physical_qty - r.system_qty;
    const isFalta = diff < 0;
    const desc = r.description || descMap[r.code] || "";
    return (
      <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
        <td className="px-5 py-3.5">
          <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider", isFalta ? "text-red-400" : "text-amber-400")}>
            <span className={cn("w-1.5 h-1.5 rounded-full", isFalta ? "bg-red-500" : "bg-amber-500")} />
            {isFalta ? "FALTA" : "SOBRA"}
          </span>
        </td>
        <td className="px-5 py-3.5 font-mono text-[12px] text-white/50">{r.position}</td>
        <td className="px-5 py-3.5 font-mono text-[12px] text-white/80 font-medium">{r.code}</td>
        <td className="px-5 py-3.5 text-[12px] text-white/45 max-w-[260px] truncate">{desc || <span className="text-white/20">—</span>}</td>
        <td className="px-5 py-3.5 text-[12px] text-white/60 text-right tabular-nums">{r.system_qty}</td>
        <td className="px-5 py-3.5 text-[12px] text-white/60 text-right tabular-nums">{r.physical_qty}</td>
        <td className={cn("px-5 py-3.5 text-[12px] font-semibold text-right tabular-nums", isFalta ? "text-red-400" : "text-amber-400")}>
          {diff > 0 ? `+${diff}` : diff}
        </td>
      </tr>
    );
  };

  return (
    <div className="w-full max-w-full px-6 md:px-10 lg:px-14 py-8 mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-white/35 hover:text-white/70 transition-colors text-[11px] font-medium uppercase tracking-wider">
        <ArrowLeft size={13} /> Voltar para semanas
      </button>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest">G300 · Auditoria de Picking</p>
          <h2 className="text-[18px] font-semibold text-white flex items-center gap-2 mt-1.5">
            <ScanBarcode size={16} className="text-blue-400" />
            Validação Picking — Semana {v.week_number}
          </h2>
          {v.notes && <p className="text-[12px] text-white/35 mt-1">{v.notes}</p>}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-blue-400/60 font-medium uppercase tracking-widest">Semana {v.week_number} · {v.year}</p>
          <p className="text-[14px] font-semibold text-white/80 mt-1">{fmtDate(v.week_start)} — {fmtDate(v.week_end)}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Empresa AG", count: validatedAg, divs: agDivs.length, acc: agAcc, accentColor: "text-emerald-400", barColor: "bg-emerald-500" },
          { label: "Empresa BR", count: validatedBr, divs: brDivs.length, acc: brAcc, accentColor: "text-blue-400", barColor: "bg-blue-500" },
          { label: "Total Geral", count: validatedTotal, divs: v.divergences.length, acc: totalAcc, accentColor: "text-white/60", barColor: "bg-white/40" },
        ].map(c => (
          <div key={c.label} className="bg-[#0D1117] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={cn("text-[10px] font-semibold uppercase tracking-wider", c.accentColor)}>{c.label}</span>
              {c.divs > 0 && (
                <span className="text-[10px] text-red-400 border border-red-500/20 bg-red-500/8 px-2 py-0.5 rounded font-medium">
                  {c.divs} div.
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-[32px] font-light text-white tabular-nums">{c.count}</span>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">posições</span>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider mb-1.5">
                <span className="text-white/30">Acurácia</span>
                <span className="text-emerald-400">{c.acc.toFixed(2)}%</span>
              </div>
              <div className="w-full h-[2px] bg-white/6 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-emerald-500" style={{ width: `${c.acc}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divergences Table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={13} className="text-red-400/70" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400/80">Divergências de Picking</span>
        </div>

        <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/8 bg-[#090D14]">
                {["Status", "Posição", "Código", "Descrição", "Sistema", "Físico", "Diferença"].map(h => (
                  <th key={h} className={cn("px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-white/35 text-left",
                    (h === "Sistema" || h === "Físico" || h === "Diferença") && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agDivs.length > 0 && (
                <>
                  <tr className="bg-emerald-500/[0.03]">
                    <td colSpan={7} className="px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/60 border-b border-white/5">
                      Empresa: AG
                    </td>
                  </tr>
                  {agDivs.map(r => <DivRow key={r.id} r={r} />)}
                </>
              )}
              {brDivs.length > 0 && (
                <>
                  <tr className="bg-blue-500/[0.03]">
                    <td colSpan={7} className="px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-blue-400/60 border-b border-white/5 border-t border-white/5">
                      Empresa: BR
                    </td>
                  </tr>
                  {brDivs.map(r => <DivRow key={r.id} r={r} />)}
                </>
              )}
              {v.divergences.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-[11px] text-white/25">
                    ✓ Nenhuma divergência registrada nesta semana
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {v.divergences.length > 0 && (
            <div className="border-t border-white/8 px-6 py-3.5 flex items-center justify-end gap-8 text-[11px] text-white/40">
              <span>Total Sistema: <span className="text-white/80 font-semibold ml-1 tabular-nums">{totalSys}</span></span>
              <span>Total Físico: <span className="text-white/80 font-semibold ml-1 tabular-nums">{totalFis}</span></span>
              <span className="flex items-center gap-2">
                Diferença:
                <span className={cn("font-semibold border px-2.5 py-0.5 rounded tabular-nums text-[11px]",
                  totalDiff < 0 ? "text-red-400 border-red-500/20 bg-red-500/8" :
                  totalDiff > 0 ? "text-amber-400 border-amber-500/20 bg-amber-500/8" :
                  "text-white/50 border-white/10 bg-white/5")}>
                  {totalDiff > 0 ? `+${totalDiff}` : totalDiff}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PickingValidacaoPage() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "detail">("list");
  const [selected, setSelected] = useState<WeekGroup | null>(null);
  const [weekGroups, setWeekGroups] = useState<WeekGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [descMap, setDescMap] = useState<Record<string, string>>({});

  const fetchDescriptions = useCallback(async () => {
    const { data } = await supabaseAvarias.from("base_codigos").select("Código, Descrição");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((item: any) => {
        const code = item["Código"];
        const desc = item["Descrição"];
        if (code && desc) {
          map[code] = desc;
        }
      });
      setDescMap(map);
    }
  }, []);

  const fetchValidations = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessions, error: sessErr } = await supabase.from("validation_sessions").select("*").eq("type", "picking").order("week_start", { ascending: false });
      if (sessErr) throw sessErr;
      if (!sessions) { setWeekGroups([]); return; }

      const { data: divergences, error: divErr } = await supabase.from("divergences").select("*").eq("type", "picking");
      if (divErr) throw divErr;
      const divs = divergences ?? [];

      const groupsMap: Record<string, WeekGroup> = {};
      sessions.forEach((s: ValidationSession) => {
        const key = `${s.year}-W${s.week_number}`;
        if (!groupsMap[key]) {
          groupsMap[key] = { week_number: s.week_number, year: s.year, week_start: s.week_start, week_end: s.week_end, notes: s.notes || undefined, sessions: [], divergences: [] };
        }
        groupsMap[key].sessions.push(s);
        if (!groupsMap[key].notes && s.notes) groupsMap[key].notes = s.notes;
        groupsMap[key].divergences.push(...divs.filter((d: Divergence) => d.session_id === s.id));
      });

      setWeekGroups(Object.values(groupsMap).sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime()));
    } catch (err: unknown) {
      console.error("Erro ao buscar dados:", err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchValidations(); fetchDescriptions(); }, [fetchValidations, fetchDescriptions]);

  const deleteWeekGroup = async (v: WeekGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remover Semana ${v.week_number}?`)) return;
    try {
      const ids = v.sessions.map(s => s.id);
      if (ids.length > 0) { const { error } = await supabase.from("validation_sessions").delete().in("id", ids); if (error) throw error; }
      fetchValidations();
    } catch (err: unknown) { alert(`Erro: ${(err as Error).message}`); }
  };

  if (view === "detail" && selected) {
    const activeGroup = weekGroups.find(g => g.week_number === selected.week_number && g.year === selected.year) || selected;
    return <DetailView v={activeGroup} onBack={() => { setView("list"); setSelected(null); fetchValidations(); }} descMap={descMap} />;
  }

  const allValidated = weekGroups.reduce((acc, g) => acc + (g.sessions.find(s => s.company === "AG")?.validated_count ?? 0) + (g.sessions.find(s => s.company === "BR")?.validated_count ?? 0), 0);
  const allDivergences = weekGroups.reduce((acc, g) => acc + g.divergences.length, 0);
  const overallAccuracy = allValidated > 0 ? ((allValidated - allDivergences) / allValidated) * 100 : 100;

  return (
    <>
      {showModal && <NovaValidacaoModal onClose={() => setShowModal(false)} onSaved={fetchValidations} descMap={descMap} />}

      <div className="min-h-full">
        <div className="w-full max-w-full px-6 md:px-10 lg:px-14 py-8 mx-auto space-y-6">

          {/* Breadcrumb + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px]">
              <button onClick={() => router.push("/dashboard/validacoes")} className="flex items-center gap-1.5 text-white/35 hover:text-white/70 transition-colors font-medium">
                <ArrowLeft size={13} /> Validações
              </button>
              <span className="text-white/15">/</span>
              <span className="text-white/60 font-medium flex items-center gap-1.5">
                <ScanBarcode size={12} className="text-blue-400" /> Picking PK
              </span>
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium px-4 py-2 rounded-lg transition-colors">
              <Plus size={13} /> Nova Validação
            </button>
          </div>

          {/* Overview Stats */}
          {!loading && weekGroups.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Auditadas", value: allValidated, icon: Package, color: "text-white/80" },
                { label: "Divergências", value: allDivergences, icon: AlertTriangle, color: allDivergences > 0 ? "text-red-400" : "text-white/50" },
                { label: "Acurácia Geral", value: `${overallAccuracy.toFixed(2)}%`, icon: Activity, color: "text-emerald-400" },
              ].map(s => (
                <div key={s.label} className="bg-[#0D1117] border border-white/8 rounded-xl px-5 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl border border-white/8 flex items-center justify-center shrink-0">
                    <s.icon size={15} className={s.color} />
                  </div>
                  <div>
                    <p className={cn("text-[22px] font-light tabular-nums", s.color)}>{s.value}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/30 mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Main Table */}
          <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold text-white/80">Resumo das Validações Semanais</h2>
                <p className="text-[11px] text-white/40 mt-1">Validação semanal das posições PK — confronto entre quantidade do sistema e contagem física.</p>
              </div>
              <span className="text-[11px] text-white/25">{weekGroups.length} semanas</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-blue-500/50 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : weekGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <ScanBarcode size={30} className="text-white/15" />
                <p className="text-[12px] text-white/30">Nenhuma validação registrada</p>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium px-4 py-2 rounded-lg transition-colors mt-1">
                  <Plus size={12} /> Iniciar primeira validação
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/6 bg-[#090D14]">
                      <th className="px-6 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-white/30 w-40">Data</th>
                      <th className="px-6 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-white/30">Semana</th>
                      <th className="px-6 py-3 text-center text-[10px] font-medium uppercase tracking-wider text-white/30 w-28">AG</th>
                      <th className="px-6 py-3 text-center text-[10px] font-medium uppercase tracking-wider text-white/30 w-28">BR</th>
                      <th className="px-6 py-3 text-center text-[10px] font-medium uppercase tracking-wider text-white/30 w-32">Divergências</th>
                      <th className="px-6 py-3 text-center text-[10px] font-medium uppercase tracking-wider text-white/30 w-28">Acurácia</th>
                      <th className="px-6 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekGroups.map(v => {
                      const key = `${v.year}-W${v.week_number}`;
                      const valAg = v.sessions.find(s => s.company === "AG")?.validated_count ?? 0;
                      const valBr = v.sessions.find(s => s.company === "BR")?.validated_count ?? 0;
                      const total = valAg + valBr;
                      const divs = v.divergences.length;
                      const acc = total > 0 ? ((total - divs) / total) * 100 : 100;

                      return (
                        <tr key={key} onClick={() => { setSelected(v); setView("detail"); }}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer">

                          {/* Data */}
                          <td className="px-6 py-4">
                            <span className="text-[13px] font-medium text-white/70 tabular-nums">{fmtFullDate(v.week_start)}</span>
                          </td>

                          {/* Semana — uma linha só, sem subtext */}
                          <td className="px-6 py-4">
                            <span className="text-[13px] font-semibold text-white/80">Semana {v.week_number}</span>
                            {v.notes && <span className="text-[11px] text-white/25 ml-2">· {v.notes}</span>}
                          </td>



                          {/* AG */}
                          <td className="px-6 py-4 text-center">
                            <span className={cn("text-[13px] tabular-nums", valAg > 0 ? "font-medium text-white/75" : "text-white/20")}>
                              {valAg > 0 ? valAg : "—"}
                            </span>
                          </td>

                          {/* BR */}
                          <td className="px-6 py-4 text-center">
                            <span className={cn("text-[13px] tabular-nums", valBr > 0 ? "font-medium text-white/75" : "text-white/20")}>
                              {valBr > 0 ? valBr : "—"}
                            </span>
                          </td>

                          {/* Divergências */}
                          <td className="px-6 py-4 text-center">
                            {divs > 0 ? (
                              <span className="text-red-400 font-semibold text-[13px] tabular-nums">{divs}</span>
                            ) : (
                              <span className="text-[13px] text-white/20 tabular-nums">0</span>
                            )}
                          </td>

                          {/* Acurácia */}
                          <td className="px-6 py-4 text-center">
                            <span className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                              {acc.toFixed(2)}%
                            </span>
                          </td>

                          {/* Ações */}
                          <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={e => deleteWeekGroup(v, e)} className="p-1.5 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 size={13} />
                              </button>
                              <ChevronRight size={14} className="text-white/20" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
