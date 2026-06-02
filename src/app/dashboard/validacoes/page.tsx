"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseAvarias } from "@/lib/supabase";
import {
  ArrowLeft, ScanBarcode, AlertTriangle, CheckCircle2, Plus,
  ChevronRight, X, Trash2, Save, Loader2,
  Building2, Percent, ShieldAlert
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
}

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

  useEffect(() => {
    if (weekStart) {
      setWeekNumber(getWeekNumber(weekStart).toString());
      setYear(weekStart.split("-")[0]);
    }
  }, [weekStart]);

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
          if (!sId) throw new Error(`Divergência ${r.company} sem qtd. validada.`);
          return { session_id: sId, session_date: r.record_date, position: r.position.toUpperCase().trim(), company: r.company, code: r.code.trim(), description: r.description.trim() || null, system_qty: parseInt(r.system_qty) || 0, physical_qty: parseInt(r.physical_qty) || 0, type: validationType };
        });
        const { error: divErr } = await supabase.from("divergences").insert(toInsert);
        if (divErr) throw new Error(`Erro divergências: ${divErr.message}`);
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Erro desconhecido.");
    } finally { setSaving(false); }
  }

  const field = "w-full bg-[#121622] border border-white/5 rounded-2xl px-4 py-3 text-[13px] text-white/90 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0A0D14] border border-white/10 rounded-[28px] w-full max-w-5xl my-8 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
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
          {/* Período */}
          <div>
            <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest block mb-3">Informações do Período</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Nº Semana", value: weekNumber, set: setWeekNumber, type: "number", placeholder: "21" },
                { label: "Ano", value: year, set: setYear, type: "number", placeholder: "2026" },
                { label: "Data Início", value: weekStart, set: setWeekStart, type: "date", placeholder: "" },
                { label: "Data Fim", value: weekEnd, set: setWeekEnd, type: "date", placeholder: "" },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} className={field} />
                </div>
              ))}
            </div>
          </div>

          {/* Configurações */}
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

          {/* Posições Auditadas */}
          <div className="bg-[#0E121C] border border-white/5 rounded-2xl p-5 shadow-inner">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={14} className="text-white/30" />
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Posições Auditadas</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-2">Total AG</label>
                <input type="number" value={validatedCountAg} onChange={e => setValidatedCountAg(e.target.value)} placeholder="Ex: 102" className={cn(field, "border-emerald-500/10 focus:border-emerald-500/30 text-emerald-300 font-semibold")} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-blue-400/80 mb-2">Total BR</label>
                <input type="number" value={validatedCountBr} onChange={e => setValidatedCountBr(e.target.value)} placeholder="Ex: 84" className={cn(field, "border-blue-500/10 focus:border-blue-500/30 text-blue-300 font-semibold")} />
              </div>
            </div>
          </div>

          {/* Divergências */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Divergências Detectadas</span>
              </div>
              <span className="text-[11px] text-white/30 font-bold bg-white/5 px-2.5 py-1 rounded-full">{rows.length} registro{rows.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#07090F]">
              <div className="grid bg-[#0E121C] border-b border-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30"
                style={{ gridTemplateColumns: "115px 125px 85px 105px 1fr 75px 75px 44px" }}>
                {["Data", "Posição", "Empresa", "Código", "Descrição", "Sistema", "Físico", ""].map(h => (
                  <span key={h} className={cn((h === "Sistema" || h === "Físico") && "text-center")}>{h}</span>
                ))}
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-white/[0.03]">
                {rows.map(row => (
                  <div key={row.key} className="grid items-center px-4 py-3 hover:bg-white/[0.01] gap-2"
                    style={{ gridTemplateColumns: "115px 125px 85px 105px 1fr 75px 75px 44px" }}>
                    <input type="date" value={row.record_date} onChange={e => updateRow(row.key, "record_date", e.target.value)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl")} />
                    <input type="text" value={row.position} placeholder="PK30002A" onChange={e => updateRow(row.key, "position", e.target.value)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl font-mono uppercase text-white/80")} />
                    <select value={row.company} onChange={e => updateRow(row.key, "company", e.target.value as Company)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl")}>
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
                        const cleanCode = code.trim().toUpperCase();
                        if (descMap && descMap[cleanCode]) {
                          updateRow(row.key, "description", descMap[cleanCode]);
                        }
                      }}
                      className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl font-mono text-white/80")}
                    />
                    <input type="text" value={row.description} placeholder="Descrição automática" onChange={e => updateRow(row.key, "description", e.target.value)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl text-white/80")} />
                    <input type="number" value={row.system_qty} placeholder="0" onChange={e => updateRow(row.key, "system_qty", e.target.value)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl text-center font-mono")} />
                    <input type="number" value={row.physical_qty} placeholder="0" onChange={e => updateRow(row.key, "physical_qty", e.target.value)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl text-center font-mono")} />
                    <div className="flex justify-end">
                      <button onClick={() => removeRow(row.key)} className="flex items-center justify-center w-8 h-8 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {rows.length === 0 && (
                  <div className="py-12 text-center text-[12px] text-white/20 flex flex-col items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-500/30" />
                    <div className="leading-tight">
                      <p className="font-bold text-white/40 uppercase tracking-widest text-[10px]">Acurácia de 100%</p>
                      <p className="text-[11px] text-white/20 mt-1">Nenhuma divergência registrada até o momento</p>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/35 hover:text-blue-400 hover:bg-blue-500/5 transition-all border-t border-white/5">
                <Plus size={14} /> Adicionar Divergência
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-[12px] font-bold bg-red-500/8 border border-red-500/15 rounded-2xl px-5 py-4">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-white/5 bg-[#07090F]">
          <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">{rows.length} divergências</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] text-white text-[12px] font-bold uppercase tracking-wider transition-all disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Salvando..." : "Salvar Validação"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Editar Validação Modal ────────────────────────────────────────────────────
function EditarValidacaoModal({ group, onClose, onSaved, descMap }: {
  group: WeekGroup;
  onClose: () => void;
  onSaved: () => void;
  descMap: Record<string, string>;
}) {
  const agSession = group.sessions.find(s => s.company === "AG");
  const brSession = group.sessions.find(s => s.company === "BR");

  const [weekNumber, setWeekNumber] = useState(group.week_number.toString());
  const [year, setYear] = useState(group.year.toString());
  const [weekStart, setWeekStart] = useState(group.week_start);
  const [weekEnd, setWeekEnd] = useState(group.week_end);
  const [notes, setNotes] = useState(group.notes ?? "");
  const [validatedCountAg, setValidatedCountAg] = useState((agSession?.validated_count ?? "").toString());
  const [validatedCountBr, setValidatedCountBr] = useState((brSession?.validated_count ?? "").toString());
  const [rows, setRows] = useState<DraftDivergence[]>(
    group.divergences.map((d, i) => ({
      key: i + 1,
      record_date: d.session_date ?? group.week_start,
      position: d.position,
      company: d.company,
      code: d.code,
      description: d.description ?? "",
      system_qty: d.system_qty.toString(),
      physical_qty: d.physical_qty.toString(),
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keyCounter, setKeyCounter] = useState(group.divergences.length + 1);

  useEffect(() => {
    if (weekStart) {
      setWeekNumber(getWeekNumber(weekStart).toString());
      setYear(weekStart.split("-")[0]);
    }
  }, [weekStart]);

  function addRow() {
    const today = new Date().toISOString().split("T")[0];
    setRows(r => [...r, { key: keyCounter, record_date: today, position: "", company: "AG", code: "", description: "", system_qty: "", physical_qty: "" }]);
    setKeyCounter(k => k + 1);
  }
  function removeRow(key: number) { setRows(r => r.filter(x => x.key !== key)); }
  function updateRow(key: number, field: keyof DraftDivergence, value: string) {
    setRows(r => r.map(x => x.key === key ? { ...x, [field]: value } : x));
  }

  async function handleSave() {
    if (!weekStart || !weekEnd) { setError("Preencha data início e fim."); return; }
    const countAg = parseInt(validatedCountAg) || 0;
    const countBr = parseInt(validatedCountBr) || 0;
    if (countAg === 0 && countBr === 0) { setError("Informe posições validadas para ao menos uma empresa."); return; }
    if (rows.some(r => !r.position || !r.code)) { setError("Preencha Posição e Código para todas as divergências."); return; }

    setSaving(true); setError("");
    try {
      // 1. Atualiza ou cria sessões
      let sessionAgId: string | null = agSession?.id ?? null;
      let sessionBrId: string | null = brSession?.id ?? null;

      const basePayload = {
        week_number: parseInt(weekNumber),
        year: parseInt(year),
        week_start: weekStart,
        week_end: weekEnd,
        notes: notes || null,
      };

      if (agSession) {
        const { error: e } = await supabase.from("validation_sessions")
          .update({ ...basePayload, validated_count: countAg })
          .eq("id", agSession.id);
        if (e) throw new Error(`Erro update AG: ${e.message}`);
      } else if (countAg > 0 || rows.some(r => r.company === "AG")) {
        const { data, error: e } = await supabase.from("validation_sessions")
          .insert({ ...basePayload, session_date: weekStart, company: "AG", type: group.type, validated_count: countAg })
          .select().single();
        if (e || !data) throw new Error(`Erro sessão AG: ${e?.message}`);
        sessionAgId = data.id;
      }

      if (brSession) {
        const { error: e } = await supabase.from("validation_sessions")
          .update({ ...basePayload, validated_count: countBr })
          .eq("id", brSession.id);
        if (e) throw new Error(`Erro update BR: ${e.message}`);
      } else if (countBr > 0 || rows.some(r => r.company === "BR")) {
        const { data, error: e } = await supabase.from("validation_sessions")
          .insert({ ...basePayload, session_date: weekStart, company: "BR", type: group.type, validated_count: countBr })
          .select().single();
        if (e || !data) throw new Error(`Erro sessão BR: ${e?.message}`);
        sessionBrId = data.id;
      }

      // 2. Apaga divergências antigas e reinsere
      const sessionIds = group.sessions.map(s => s.id);
      if (sessionIds.length > 0) {
        const { error: delErr } = await supabase.from("divergences").delete().in("session_id", sessionIds);
        if (delErr) throw new Error(`Erro delete divergências: ${delErr.message}`);
      }

      if (rows.length > 0) {
        const toInsert = rows.map(r => {
          const sId = r.company === "AG" ? sessionAgId : sessionBrId;
          if (!sId) throw new Error(`Divergência ${r.company} sem sessão correspondente.`);
          return {
            session_id: sId,
            session_date: r.record_date,
            position: r.position.toUpperCase().trim(),
            company: r.company,
            code: r.code.trim(),
            description: r.description.trim() || null,
            system_qty: parseInt(r.system_qty) || 0,
            physical_qty: parseInt(r.physical_qty) || 0,
            type: group.type,
          };
        });
        const { error: insErr } = await supabase.from("divergences").insert(toInsert);
        if (insErr) throw new Error(`Erro inserir divergências: ${insErr.message}`);
      }

      onSaved(); onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Erro desconhecido.");
    } finally { setSaving(false); }
  }

  const field = "w-full bg-[#121622] border border-white/5 rounded-2xl px-4 py-3 text-[13px] text-white/90 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0A0D14] border border-white/10 rounded-[28px] w-full max-w-5xl my-8 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#07090F]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Pencil size={18} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Editar Validação — Semana {group.week_number}</h3>
              <p className="text-[11px] text-white/40 mt-0.5 font-medium tracking-wide">Tipo: <span className="text-amber-400/80 font-bold uppercase">{group.type}</span> · Alterações substituem os dados anteriores</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white/85 hover:bg-white/5 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-8 space-y-6">
          {/* Período */}
          <div>
            <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest block mb-3">Informações do Período</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Nº Semana", value: weekNumber, set: setWeekNumber, type: "number" },
                { label: "Ano", value: year, set: setYear, type: "number" },
                { label: "Data Início", value: weekStart, set: setWeekStart, type: "date" },
                { label: "Data Fim", value: weekEnd, set: setWeekEnd, type: "date" },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} className={field} />
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Observações (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Contagem nas prateleiras da AG" className={field} />
          </div>

          {/* Posições Auditadas */}
          <div className="bg-[#0E121C] border border-white/5 rounded-2xl p-5">
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

          {/* Divergências */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Divergências</span>
              </div>
              <span className="text-[11px] text-white/30 font-bold bg-white/5 px-2.5 py-1 rounded-full">{rows.length} registro{rows.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#07090F]">
              <div className="grid bg-[#0E121C] border-b border-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30"
                style={{ gridTemplateColumns: "115px 125px 85px 105px 1fr 75px 75px 44px" }}>
                {["Data", "Posição", "Empresa", "Código", "Descrição", "Sistema", "Físico", ""].map(h => (
                  <span key={h} className={cn((h === "Sistema" || h === "Físico") && "text-center")}>{h}</span>
                ))}
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-white/[0.03]">
                {rows.map(row => (
                  <div key={row.key} className="grid items-center px-4 py-3 hover:bg-white/[0.01] gap-2"
                    style={{ gridTemplateColumns: "115px 125px 85px 105px 1fr 75px 75px 44px" }}>
                    <input type="date" value={row.record_date} onChange={e => updateRow(row.key, "record_date", e.target.value)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl")} />
                    <input type="text" value={row.position} onChange={e => updateRow(row.key, "position", e.target.value)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl font-mono uppercase text-white/80")} />
                    <select value={row.company} onChange={e => updateRow(row.key, "company", e.target.value as Company)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl")}>
                      <option value="AG">AG</option>
                      <option value="BR">BR</option>
                    </select>
                    <input type="text" value={row.code} onChange={e => {
                      const code = e.target.value;
                      updateRow(row.key, "code", code);
                      const clean = code.trim().toUpperCase();
                      if (descMap[clean]) updateRow(row.key, "description", descMap[clean]);
                    }} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl font-mono text-white/80")} />
                    <input type="text" value={row.description} onChange={e => updateRow(row.key, "description", e.target.value)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl text-white/80")} />
                    <input type="number" value={row.system_qty} onChange={e => updateRow(row.key, "system_qty", e.target.value)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl text-center font-mono")} />
                    <input type="number" value={row.physical_qty} onChange={e => updateRow(row.key, "physical_qty", e.target.value)} className={cn(field, "text-[12px] px-2 py-1.5 rounded-xl text-center font-mono")} />
                    <div className="flex justify-end">
                      <button onClick={() => removeRow(row.key)} className="flex items-center justify-center w-8 h-8 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {rows.length === 0 && (
                  <div className="py-12 text-center text-[12px] text-white/20 flex flex-col items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-500/30" />
                    <p className="font-bold text-white/40 uppercase tracking-widest text-[10px]">Nenhuma divergência</p>
                  </div>
                )}
              </div>

              <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/35 hover:text-amber-400 hover:bg-amber-500/5 transition-all border-t border-white/5">
                <Plus size={14} /> Adicionar Divergência
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-[12px] font-bold bg-red-500/8 border border-red-500/15 rounded-2xl px-5 py-4">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-white/5 bg-[#07090F]">
          <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">{rows.length} divergências</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[12px] font-bold uppercase tracking-wider transition-all disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Salvando..." : "Salvar Alterações"}
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
    const desc = r.description || descMap[r.code?.trim().toUpperCase()] || descMap[r.code] || "";
    return (
      <tr className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.01] transition-colors">
        <td className="px-6 py-4 font-mono text-[12px] text-white/50">{r.position}</td>
        <td className="px-6 py-4 font-mono text-[12px] text-white/80 font-bold">{r.code}</td>
        <td className="px-6 py-4 text-[12px] text-white/45 max-w-[260px] truncate">{desc || <span className="text-white/20">—</span>}</td>
        <td className="px-6 py-4 text-[12px] text-white/60 text-right tabular-nums font-mono">{r.system_qty}</td>
        <td className="px-6 py-4 text-[12px] text-white/60 text-right tabular-nums font-mono">{r.physical_qty}</td>
        <td className={cn("px-6 py-4 text-[12px] font-extrabold text-right tabular-nums font-mono", isFalta ? "text-red-400" : "text-amber-400")}>
          {diff > 0 ? `+${diff}` : diff}
        </td>
      </tr>
    );
  };

  return (
    <div className="w-full max-w-full px-6 md:px-10 lg:px-14 py-8 mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-white/35 hover:text-white/70 transition-colors text-[10px] font-bold uppercase tracking-widest">
        <ArrowLeft size={13} /> Voltar para semanas
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest">G300 · Auditoria de {v.type === "inventario" ? "Inventário" : v.type === "avaria" ? "Avaria" : "Picking"}</p>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5 mt-2">
            <ScanBarcode size={20} className="text-blue-400" />
            Validação {v.type === "inventario" ? "Inventário" : v.type === "avaria" ? "Avaria" : "Picking"} — Semana {v.week_number}
          </h2>
          {v.notes && <p className="text-[12px] text-white/35 mt-1.5 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 inline-block">{v.notes}</p>}
        </div>
        <div className="text-left md:text-right shrink-0">
          <p className="text-[10px] text-blue-400/60 font-bold uppercase tracking-widest">Semana {v.week_number} · {v.year}</p>
          <p className="text-[14px] font-bold text-white/80 mt-1 bg-white/5 border border-white/5 px-4 py-1.5 rounded-full inline-block tabular-nums">{fmtDate(v.week_start)} — {fmtDate(v.week_end)}</p>
        </div>
      </div>

      {/* Stats Cards Premium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Empresa AG", count: validatedAg, divs: agDivs.length, acc: agAcc, bgIcon: "bg-emerald-500/10", accentColor: "text-emerald-400", barColor: "bg-emerald-500", barGlow: "shadow-[0_0_10px_rgba(16,185,129,0.4)]" },
          { label: "Empresa BR", count: validatedBr, divs: brDivs.length, acc: brAcc, bgIcon: "bg-blue-500/10", accentColor: "text-blue-400", barColor: "bg-blue-500", barGlow: "shadow-[0_0_10px_rgba(59,130,246,0.4)]" },
          { label: "Total Geral", count: validatedTotal, divs: v.divergences.length, acc: totalAcc, bgIcon: "bg-white/5", accentColor: "text-white/60", barColor: "bg-white/40", barGlow: "" },
        ].map(c => (
          <div key={c.label} className="bg-[#0D1117] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-2xl group-hover:bg-white/[0.02] transition-all" />
            <div className="flex items-center justify-between mb-4">
              <span className={cn("text-[10px] font-extrabold uppercase tracking-widest", c.accentColor)}>{c.label}</span>
              {c.divs > 0 ? (
                <span className="text-[10px] font-bold text-red-400 border border-red-500/20 bg-red-500/8 px-2.5 py-0.5 rounded-full">
                  {c.divs} divergências
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-0.5 rounded-full">
                  Sem divs
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-[32px] font-light text-white tabular-nums tracking-tight">{c.count}</span>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">posições</span>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                <span className="text-white/30">Acurácia</span>
                <span className={cn(c.acc >= 90 ? "text-emerald-400" : c.acc >= 75 ? "text-amber-400" : "text-red-400")}>{c.acc.toFixed(2)}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-700", c.barColor, c.barGlow)} style={{ width: `${c.acc}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divergences Table */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={14} className="text-red-400 animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-red-400">Tabela de Divergências Encontradas</span>
        </div>

        <div className="bg-[#0D1117] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-[#080B11]">
                  {["Posição", "Código", "Descrição", "Sistema", "Físico", "Diferença"].map(h => (
                    <th key={h} className={cn("px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/35 text-left",
                      (h === "Sistema" || h === "Físico" || h === "Diferença") && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agDivs.length > 0 && (
                  <>
                    <tr className="bg-emerald-500/[0.02]">
                      <td colSpan={6} className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 border-b border-white/5 border-t border-white/5">
                        Divisão: Empresa AG
                      </td>
                    </tr>
                    {agDivs.map(r => <DivRow key={r.id} r={r} />)}
                  </>
                )}
                {brDivs.length > 0 && (
                  <>
                    <tr className="bg-blue-500/[0.02]">
                      <td colSpan={6} className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-blue-400 border-b border-white/5 border-t border-white/5">
                        Divisão: Empresa BR
                      </td>
                    </tr>
                    {brDivs.map(r => <DivRow key={r.id} r={r} />)}
                  </>
                )}
                {v.divergences.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-[12px] text-white/20 font-bold uppercase tracking-wider">
                      ✓ Acurácia absoluta de 100% · Sem divergências
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {v.divergences.length > 0 && (
            <div className="border-t border-white/5 bg-[#080B11] px-6 py-5 flex flex-wrap items-center justify-end gap-x-8 gap-y-3 text-[11px] font-bold uppercase tracking-widest text-white/40">
              <span>Total Sistema: <span className="text-white/80 font-mono ml-1.5 tabular-nums text-[12px]">{totalSys}</span></span>
              <span>Total Físico: <span className="text-white/80 font-mono ml-1.5 tabular-nums text-[12px]">{totalFis}</span></span>
              <span className="flex items-center gap-3">
                Diferença Geral:
                <span className={cn("font-bold font-mono px-3 py-1 rounded-full tabular-nums text-[12px] tracking-normal",
                  totalDiff < 0 ? "text-red-400 border border-red-500/20 bg-red-500/10" :
                  totalDiff > 0 ? "text-amber-400 border border-amber-500/20 bg-amber-500/10" :
                  "text-white/50 border border-white/10 bg-white/5")}>
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
export default function ValidacoesPage() {
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
        const code = item["Código"]?.trim().toUpperCase();
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
      const { data: sessions, error: sessErr } = await supabase.from("validation_sessions").select("*").order("week_start", { ascending: false });
      if (sessErr) throw sessErr;
      if (!sessions) { setWeekGroups([]); return; }

      const { data: divergences, error: divErr } = await supabase.from("divergences").select("*");
      if (divErr) throw divErr;
      const divs = divergences ?? [];

      const groupsMap: Record<string, WeekGroup> = {};
      sessions.forEach((s: ValidationSession) => {
        const key = `${s.year}-W${s.week_number}-${s.type}`;
        if (!groupsMap[key]) {
          groupsMap[key] = { week_number: s.week_number, year: s.year, week_start: s.week_start, week_end: s.week_end, type: s.type, notes: s.notes || undefined, sessions: [], divergences: [] };
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

  const allDivergences = weekGroups.reduce((acc, g) => acc + g.divergences.length, 0);

  // Média das acurácias individuais de cada validação (não acumulado)
  const avgAccuracy = weekGroups.length > 0
    ? weekGroups.reduce((acc, g) => {
        const valAg = g.sessions.find(s => s.company === "AG")?.validated_count ?? 0;
        const valBr = g.sessions.find(s => s.company === "BR")?.validated_count ?? 0;
        const total = valAg + valBr;
        const divs = g.divergences.length;
        return acc + (total > 0 ? ((total - divs) / total) * 100 : 100);
      }, 0) / weekGroups.length
    : 100;

  // Acurácia por empresa (média das acurácias individuais de cada empresa)
  const allAgValidated = weekGroups.reduce((acc, g) => acc + (g.sessions.find(s => s.company === "AG")?.validated_count ?? 0), 0);
  const allBrValidated = weekGroups.reduce((acc, g) => acc + (g.sessions.find(s => s.company === "BR")?.validated_count ?? 0), 0);
  const allAgDivsCount = weekGroups.reduce((acc, g) => acc + g.divergences.filter(d => d.company === "AG").length, 0);
  const allBrDivsCount = weekGroups.reduce((acc, g) => acc + g.divergences.filter(d => d.company === "BR").length, 0);

  const overallAgAccuracy = allAgValidated > 0 ? ((allAgValidated - allAgDivsCount) / allAgValidated) * 100 : 100;
  const overallBrAccuracy = allBrValidated > 0 ? ((allBrValidated - allBrDivsCount) / allBrValidated) * 100 : 100;

  // Calculo Ponto Crítico (Quem tem menor acurácia ou mais erros)
  const isAgCritical = overallAgAccuracy < overallBrAccuracy;
  const criticalPoint = isAgCritical ? "Empresa AG" : "Empresa BR";
  const criticalAcc = isAgCritical ? overallAgAccuracy : overallBrAccuracy;

  // Posições mais afetadas por divergências no painel lateral (pois as posições são fixas)
  const positionDivMap: Record<string, number> = {};
  weekGroups.forEach(g => {
    g.divergences.forEach(d => {
      const pos = d.position?.toUpperCase().trim();
      if (pos) {
        positionDivMap[pos] = (positionDivMap[pos] || 0) + 1;
      }
    });
  });
  const topDivergentPositions = Object.entries(positionDivMap)
    .map(([position, qty]) => ({ position, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);

  return (
    <>
      {showModal && <NovaValidacaoModal onClose={() => setShowModal(false)} onSaved={fetchValidations} descMap={descMap} />}

      <div className="min-h-full">
        <div className="w-full max-w-full px-6 md:px-10 lg:px-14 py-8 mx-auto space-y-6">

          {/* Breadcrumb + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white/60 font-bold uppercase tracking-widest text-[11px] flex items-center gap-2">
                <ScanBarcode size={14} className="text-blue-500 animate-pulse" /> Auditoria Geral de Picking
              </span>
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] text-white text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all">
              <Plus size={14} /> Nova Validação
            </button>
          </div>

          {/* Overview Stats */}
          {!loading && weekGroups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Acurácia Média */}
              <div className="bg-[#0D1117] border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Taxa de Acurácia</span>
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                    <Percent size={14} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-light text-emerald-400 tabular-nums tracking-tight">{avgAccuracy.toFixed(1)}%</span>
                  <span className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest">média geral</span>
                </div>
              </div>

              {/* Card 2: Divergências */}
              <div className="bg-[#0D1117] border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Divergências</span>
                  <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]">
                    <AlertTriangle size={14} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-light text-red-400 tabular-nums tracking-tight">{allDivergences}</span>
                  <span className="text-[10px] font-bold text-red-500/50 uppercase tracking-widest">total</span>
                </div>
              </div>

              {/* Card 3: Ponto Crítico (Glowing Gold) */}
              <div className="bg-[#0D1117] border border-amber-500/20 rounded-2xl p-5 shadow-[0_0_20px_rgba(245,158,11,0.05)] relative overflow-hidden hover:border-amber-500/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.02] rounded-full blur-2xl" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500/80">Ponto Crítico</span>
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                    <ShieldAlert size={15} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-extrabold text-white uppercase tracking-wider">{criticalPoint}</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Acurácia: {criticalAcc.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            <div className="space-y-6 lg:col-span-1">
              
              <div className="bg-[#0D1117] border border-white/5 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-extrabold text-white uppercase tracking-widest">Acurácia por Empresa</h3>
                  <span className="text-[9px] font-bold text-white/35 uppercase tracking-widest">2 Unidades</span>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#080B11]/50 border border-white/5 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Empresa AG</span>
                      <span className="text-[11px] font-extrabold text-emerald-400">{overallAgAccuracy.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${overallAgAccuracy}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/30">
                       <span>Acurácia média AG</span>
                       <span>{overallAgAccuracy.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="bg-[#080B11]/50 border border-white/5 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Empresa BR</span>
                      <span className="text-[11px] font-extrabold text-blue-400">{overallBrAccuracy.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]" style={{ width: `${overallBrAccuracy}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/30">
                      <span>Acurácia média BR</span>
                      <span>{overallBrAccuracy.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Posições Mais Afetadas */}
              {topDivergentPositions.length > 0 && (
                <div className="bg-[#0D1117] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                  <div>
                    <h3 className="text-[11px] font-extrabold text-white uppercase tracking-widest text-red-400">Posições Mais Afetadas</h3>
                    <p className="text-[9px] text-white/35 font-bold uppercase tracking-wider mt-0.5">Locais com mais Divergências</p>
                  </div>
                  <div className="space-y-2">
                    {topDivergentPositions.map((item, idx) => (
                      <div key={item.position} className="flex items-center justify-between bg-[#080B11]/60 border border-white/[0.03] rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-extrabold font-mono">
                            {idx + 1}
                          </div>
                          <span className="text-[11px] font-mono font-bold text-white/80 uppercase">{item.position}</span>
                        </div>
                        <span className="text-[10px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/10 px-2.5 py-0.5 rounded-full tabular-nums">
                          {item.qty} ocorrências
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* LADO DIREITO: Tabela de Histórico (2/3) */}
            <div className="lg:col-span-2">
              <div className="bg-[#0D1117] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 bg-[#080B11]/30 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[12px] font-extrabold text-white uppercase tracking-widest">Histórico das Validações</h2>
                    <p className="text-[11px] text-white/35 font-medium mt-1">Clique em uma linha para ver o detalhamento completo.</p>
                  </div>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{weekGroups.length} semanas</span>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : weekGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                      <ScanBarcode size={24} className="text-white/20" />
                    </div>
                    <p className="text-[12px] text-white/30 font-bold uppercase tracking-widest">Nenhuma auditoria registrada</p>
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all">
                      <Plus size={14} /> Registrar Auditoria
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-[#080B11]/50">
                          <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-white/30">Semana</th>
                          <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-white/30">Período</th>
                          <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-white/30">Tipo</th>
                          <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">AG</th>
                          <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">BR</th>
                          <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">Acurácia</th>
                          <th className="px-6 py-4 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {weekGroups.map(v => {
                          const key = `${v.year}-W${v.week_number}-${v.type}`;
                          const valAg = v.sessions.find(s => s.company === "AG")?.validated_count ?? 0;
                          const valBr = v.sessions.find(s => s.company === "BR")?.validated_count ?? 0;
                          const total = valAg + valBr;
                          const divs = v.divergences.length;
                          const acc = total > 0 ? ((total - divs) / total) * 100 : 100;

                          return (
                            <tr key={key} onClick={() => { setSelected(v); setView("detail"); }}
                              className="group hover:bg-white/[0.01] transition-all cursor-pointer">

                              {/* Semana */}
                              <td className="px-6 py-4.5">
                                <div className="flex flex-col">
                                  <span className="text-[13px] font-bold text-white group-hover:text-blue-400 transition-colors">Semana {v.week_number}</span>
                                  {v.notes ? (
                                    <span className="text-[10px] text-white/25 truncate max-w-[120px] font-semibold mt-0.5">{v.notes}</span>
                                  ) : (
                                    <span className="text-[10px] text-white/10 uppercase tracking-wider font-extrabold mt-0.5">Sem OBS</span>
                                  )}
                                </div>
                              </td>

                              {/* Período */}
                              <td className="px-6 py-4.5">
                                <span className="text-[12px] font-bold text-white/60 font-mono tabular-nums">{fmtFullDate(v.week_start)}</span>
                              </td>

                              {/* Tipo */}
                              <td className="px-6 py-4.5">
                                <span className={cn(
                                  "text-[10px] font-extrabold uppercase tracking-widest border px-2.5 py-1 rounded-full",
                                  v.type === "picking"
                                    ? "text-blue-400 bg-blue-500/5 border-blue-500/10"
                                    : v.type === "avaria"
                                    ? "text-amber-400 bg-amber-500/5 border-amber-500/10"
                                    : "text-purple-400 bg-purple-500/5 border-purple-500/10"
                                )}>
                                  {v.type === "picking" ? "Picking" : v.type === "avaria" ? "Avaria" : "Inventário"}
                                </span>
                              </td>

                              {/* AG */}
                              <td className="px-6 py-4.5 text-center">
                                <span className={cn("text-[12px] font-bold font-mono tabular-nums", valAg > 0 ? "text-white/80" : "text-white/10")}>
                                  {valAg > 0 ? valAg : "—"}
                                </span>
                              </td>

                              {/* BR */}
                              <td className="px-6 py-4.5 text-center">
                                <span className={cn("text-[12px] font-bold font-mono tabular-nums", valBr > 0 ? "text-white/80" : "text-white/10")}>
                                  {valBr > 0 ? valBr : "—"}
                                </span>
                              </td>

                              {/* Acurácia + Badge Estilo Relatório Recebimento */}
                              <td className="px-6 py-4.5 text-center">
                                <div className="flex items-center justify-center gap-3">
                                  <span className={cn(
                                    "text-[12px] font-extrabold font-mono tabular-nums",
                                    acc >= 90 ? "text-emerald-400" : acc >= 75 ? "text-amber-400" : "text-red-400"
                                  )}>
                                    {acc.toFixed(1)}%
                                  </span>
                                  {divs > 0 ? (
                                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-red-400 border border-red-500/20 bg-red-500/5 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-inner shrink-0">
                                      <AlertTriangle size={8} /> {divs} divs
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-inner shrink-0">
                                      <CheckCircle2 size={8} /> 100%
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Ações */}
                              <td className="px-6 py-4.5 text-right" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-3">
                                  <button onClick={e => deleteWeekGroup(v, e)} className="p-2 rounded-xl text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all">
                                    <Trash2 size={13} />
                                  </button>
                                  <ChevronRight size={16} className="text-white/10 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
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

        </div>
      </div>
    </>
  );
}
