"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search, RefreshCw, Loader2, Plus, Pencil, Trash2, X,
  FileSpreadsheet, Share2, Download, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface QuarantineItem {
  id: number;
  created_at: string;
  code: string;
  quantity: number;
  company: string;
  observation: string;
  resolved: boolean;
}

type FormData = Omit<QuarantineItem, "id" | "created_at">;

const EMPTY_FORM: FormData = {
  code: "",
  quantity: 1,
  company: "BR",
  observation: "",
  resolved: false,
};

/* ─── Modal de Editar / Adicionar ───────────────────────────────── */
function Modal({
  title, onClose, onSubmit, submitting, form, setForm,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop com animação */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose} 
      />
      
      {/* Modal com animação melhorada */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-[#0D1117] to-[#0A0E13] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header com gradiente */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent">
          <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-110"
          >
            <X size={14} />
          </button>
        </div>

        {/* Conteúdo com scroll suave */}
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Código */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Código</label>
            <input 
              value={form.code} 
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Ex: 2555-03"
              className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200" 
            />
          </div>

          {/* Quantidade e Empresa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quantidade</label>
              <input 
                type="number" 
                min={0} 
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200" 
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Empresa</label>
              <div className="flex bg-white/[0.02] border border-white/10 rounded-xl p-1 gap-1">
                {(["BR", "AG"] as const).map((c) => (
                  <button 
                    key={c} 
                    type="button" 
                    onClick={() => setForm({ ...form, company: c })}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-200 transform hover:scale-105",
                      form.company === c
                        ? c === "AG" 
                          ? "bg-blue-500/30 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/20"
                          : "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/20"
                        : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.05]"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Observação */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Observação</label>
            <textarea 
              rows={3} 
              value={form.observation}
              onChange={(e) => setForm({ ...form, observation: e.target.value })}
              placeholder="Descreva o motivo da quarentena..."
              className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 resize-none leading-relaxed" 
            />
          </div>

          {/* Toggle Resolvido */}
          <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/10 px-4 py-3 hover:bg-white/[0.04] transition-colors duration-200">
            <span className="text-xs text-gray-400 font-medium">Marcar como resolvido</span>
            <button 
              type="button" 
              onClick={() => setForm({ ...form, resolved: !form.resolved })}
              className={cn(
                "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full p-0.5 transition-all duration-300 ease-in-out focus:outline-none",
                form.resolved 
                  ? "bg-emerald-500/80 shadow-lg shadow-emerald-500/30" 
                  : "bg-[#1e293b] border border-white/10"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-all duration-300 ease-in-out shadow-sm",
                form.resolved ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>

        {/* Footer com botões */}
        <div className="px-6 pb-5 flex gap-3 border-t border-white/5 bg-gradient-to-r from-white/[0.01] to-transparent">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-400 border border-white/10 hover:bg-white/5 hover:text-white transition-all duration-200 hover:scale-105"
          >
            Cancelar
          </button>
          <button 
            onClick={onSubmit} 
            disabled={submitting || !form.code.trim()}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-500/30 to-blue-600/20 hover:from-blue-500/40 hover:to-blue-600/30 border border-blue-500/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 disabled:hover:scale-100"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            {submitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Confirm Delete ────────────────────────────────────────────── */
function ConfirmDelete({ item, onClose, onConfirm, submitting }: {
  item: QuarantineItem; onClose: () => void; onConfirm: () => void; submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose} 
      />
      <div className="relative z-10 w-full max-w-sm bg-gradient-to-br from-[#0D1117] to-[#0A0E13] border border-red-500/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="px-6 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 animate-pulse">
              <AlertCircle size={16} className="text-red-400" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">Remover item</p>
              <p className="text-xs text-gray-500 mt-0.5">Esta ação não pode ser desfeita.</p>
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-red-500/20 px-4 py-3">
            <p className="text-xs font-mono text-white/80 font-semibold">{item.code}</p>
            {item.observation && <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{item.observation}</p>}
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3 border-t border-white/5">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-400 border border-white/10 hover:bg-white/5 hover:text-white transition-all duration-200 hover:scale-105"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2 hover:scale-105 disabled:hover:scale-100"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            {submitting ? "Removendo..." : "Remover"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Share Card (rendered off-screen for capture) ──────────────── */
function ShareCard({
  cardRef, items, descMap,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  items: QuarantineItem[];
  descMap: Record<string, string>;
}) {
  const pending  = items.filter((i) => !i.resolved);
  const now      = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const groups = [
    {
      label: "BR",
      color: "#34d399",
      bg: "rgba(16,185,129,0.06)",
      border: "rgba(16,185,129,0.15)",
      items: pending.filter((i) => (i.company ?? "").toUpperCase() === "BR").sort((a, b) => (a.code ?? "").localeCompare(b.code ?? "")),
    },
    {
      label: "AG",
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.06)",
      border: "rgba(96,165,250,0.15)",
      items: pending.filter((i) => (i.company ?? "").toUpperCase() === "AG").sort((a, b) => (a.code ?? "").localeCompare(b.code ?? "")),
    },
  ].filter((g) => g.items.length > 0);

  const badgeStyle = (color: string, bg: string, border: string) => ({
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    color: color,
    display: "inline-block" as const,
  });

  return (
    <div
      ref={cardRef}
      style={{ fontFamily: "'Inter', sans-serif", width: "100%", maxWidth: 700, background: "#080C12", padding: "36px 40px", borderRadius: 20 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>
              Quarentena
            </span>
            <span style={badgeStyle("#fbbf24", "rgba(245,158,11,0.12)", "rgba(245,158,11,0.2)")}>
              G300
            </span>
          </div>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            Situação atual · {now}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total em Quarentena", value: items.length, color: "#e5e7eb" },
        ].map((s) => (
          <div key={s.label} style={{
            flex: 1, background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: s.color, letterSpacing: -1 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Groups (BR, AG) */}
      {groups.map((group, groupIdx) => (
        <div key={group.label} style={{ marginBottom: 24, marginTop: groupIdx > 0 ? 32 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={badgeStyle(group.color, group.bg, group.border)}>
              {group.label}
            </span>
            <span style={{ fontSize: 10, color: "#4b5563" }}>
              {group.items.length} {group.items.length === 1 ? "item" : "itens"}
            </span>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "100px 1fr 44px",
              padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              {["Código", "Observação", "Qtd."].map((h) => (
                <span key={h} style={{ fontSize: 9, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: 1 }}>{h}</span>
              ))}
            </div>
            {/* Rows */}
            {group.items.map((item, i) => (
              <div key={item.id} style={{
                display: "grid", gridTemplateColumns: "100px 1fr 44px",
                padding: "10px 16px",
                borderBottom: i < group.items.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#e5e7eb" }}>
                  {item.code}
                </span>
                <span style={{
                  fontSize: 10, color: "#9ca3af",
                  paddingRight: 12,
                  wordBreak: "break-word",
                  lineHeight: 1.5,
                }}>
                  {item.observation || descMap[item.code?.trim().toUpperCase()] || "—"}
                </span>
                <span style={{ fontSize: 10, color: "#d1d5db" }}>{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{ marginTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, color: "#374151" }}>Gerado automaticamente pelo sistema</span>
        <span style={{ fontSize: 9, color: "#374151" }}>Armazém G300</span>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function QuarentenaPage() {
  const [items, setItems]                 = useState<QuarantineItem[]>([]);
  const [descMap, setDescMap]             = useState<Record<string, string>>({});
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [companyFilter, setCompanyFilter] = useState("Todas");
  const [statusFilter, setStatusFilter]   = useState("Todos");
  const [isAdmin, setIsAdmin]             = useState(false);
  const [updatingId, setUpdatingId]       = useState<number | null>(null);

  // CRUD modals
  const [addOpen, setAddOpen]             = useState(false);
  const [editItem, setEditItem]           = useState<QuarantineItem | null>(null);
  const [deleteItem, setDeleteItem]       = useState<QuarantineItem | null>(null);
  const [formData, setFormData]           = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting]       = useState(false);

  // Share
  const [shareOpen, setShareOpen]         = useState(false);
  const [capturing, setCapturing]         = useState(false);
  const shareCardRef                      = useRef<HTMLDivElement>(null);

  /* ── Auth ──────────────────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAdmin(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setIsAdmin(!!s));
    return () => subscription.unsubscribe();
  }, []);

  /* ── Data fetch ─────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: quarantine }, { data: codes }] = await Promise.all([
      supabase.from("quarantine").select("*").order("created_at", { ascending: false }),
      supabase.from("base_codigos").select("code, description"),
    ]);
    if (quarantine) setItems(quarantine as QuarantineItem[]);
    if (codes) {
      const map: Record<string, string> = {};
      (codes as { code: string; description: string }[]).forEach((c) => {
        if (c.code) map[c.code.trim().toUpperCase()] = c.description;
      });
      setDescMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Derived stats ──────────────────────────────────────────────── */
  const totalItems  = items.length;
  const pending     = items.filter((i) => !i.resolved);
  const resolvedCnt = items.filter((i) =>  i.resolved).length;

  /* ── Sorted & Filtered rows ─────────────────────────────────────── */
  const processedItems = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const c = (item.code || "").trim().toUpperCase();
      counts[c] = (counts[c] || 0) + 1;
    });
    const filtered = items.filter((item) => {
      const desc = descMap[item.code?.trim().toUpperCase()] ?? "";
      const q = search.toLowerCase();
      const matchSearch =
        item.code?.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        (item.observation ?? "").toLowerCase().includes(q);
      const matchCompany =
        companyFilter === "Todas" ||
        (item.company ?? "").toUpperCase() === companyFilter.toUpperCase();
      const matchStatus =
        statusFilter === "Todos" ||
        (statusFilter === "Pendente" && !item.resolved) ||
        (statusFilter === "Resolvido" && item.resolved);
      return matchSearch && matchCompany && matchStatus;
    });
    return filtered
      .map((item) => ({ ...item, isDuplicate: counts[(item.code || "").trim().toUpperCase()] > 1 }))
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [items, search, companyFilter, statusFilter, descMap]);

  /* ── Toggle resolved ────────────────────────────────────────────── */
  async function toggleResolved(item: QuarantineItem) {
    if (!isAdmin) return;
    setUpdatingId(item.id);
    await supabase.from("quarantine").update({ resolved: !item.resolved }).eq("id", item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, resolved: !item.resolved } : i)));
    setUpdatingId(null);
  }

  /* ── Export Excel ───────────────────────────────────────────────── */
  function handleExport() {
    const rows = processedItems.map((item) => ({
      Código:      item.code ?? "",
      Descrição:   descMap[item.code?.trim().toUpperCase()] ?? "",
      Quantidade:  item.quantity ?? 0,
      Empresa:     item.company ?? "",
      Observação:  item.observation ?? "",
      Resolvido:   item.resolved ? "Sim" : "Não",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quarentena");
    const now = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `quarentena_${now}.xlsx`);
  }

  /* ── Share capture ──────────────────────────────────────────────── */
  async function handleCapture() {
    if (!shareCardRef.current) return;
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: "#080C12",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `quarentena_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setCapturing(false);
    }
  }

  /* ── CRUD helpers ───────────────────────────────────────────────── */
  function openAdd() { setFormData(EMPTY_FORM); setAddOpen(true); }
  function openEdit(item: QuarantineItem) {
    setFormData({ code: item.code, quantity: item.quantity, company: item.company, observation: item.observation, resolved: item.resolved });
    setEditItem(item);
  }
  async function handleAdd() {
    if (!formData.code.trim()) return;
    setSubmitting(true);
    const { data } = await supabase.from("quarantine")
      .insert([{ ...formData, code: formData.code.trim().toUpperCase() }]).select().single();
    if (data) setItems((prev) => [data as QuarantineItem, ...prev]);
    setSubmitting(false); setAddOpen(false);
  }
  async function handleEdit() {
    if (!editItem || !formData.code.trim()) return;
    setSubmitting(true);
    const { data } = await supabase.from("quarantine")
      .update({ ...formData, code: formData.code.trim().toUpperCase() }).eq("id", editItem.id).select().single();
    if (data) setItems((prev) => prev.map((i) => (i.id === editItem.id ? (data as QuarantineItem) : i)));
    setSubmitting(false); setEditItem(null);
  }
  async function handleDelete() {
    if (!deleteItem) return;
    setSubmitting(true);
    await supabase.from("quarantine").delete().eq("id", deleteItem.id);
    setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
    setSubmitting(false); setDeleteItem(null);
  }

  const colSpanTotal = isAdmin ? 7 : 6;

  /* ── UI ─────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Share Card (hidden, off-screen) ── */}
      <div style={{ position: "fixed", left: -9999, top: 0, zIndex: -1, width: 700 }}>
        <ShareCard cardRef={shareCardRef} items={items} descMap={descMap} />
      </div>

      {/* ── Share Modal ── */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
            onClick={() => setShareOpen(false)} 
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-gradient-to-br from-[#0D1117] to-[#0A0E13] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 bg-gradient-to-r from-white/[0.03] to-transparent">
              <div className="flex items-center gap-2">
                <Share2 size={14} className="text-blue-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Compartilhar situação</h2>
              </div>
              <button 
                onClick={() => setShareOpen(false)} 
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-110"
              >
                <X size={14} />
              </button>
            </div>

            {/* Preview */}
            <div className="p-6 bg-[#050709] flex-1 overflow-y-auto flex justify-center items-start min-h-0">
              <div className="w-full max-w-[580px] flex justify-center">
                <ShareCard cardRef={{ current: null }} items={items} descMap={descMap} />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-3 border-t border-white/5 flex gap-3 shrink-0">
              <button 
                onClick={() => setShareOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-400 border border-white/10 hover:bg-white/5 hover:text-white transition-all duration-200 hover:scale-105"
              >
                Fechar
              </button>
              <button 
                onClick={handleCapture} 
                disabled={capturing}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-500/30 to-blue-600/20 hover:from-blue-500/40 hover:to-blue-600/30 border border-blue-500/30 transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2 hover:scale-105 disabled:hover:scale-100"
              >
                {capturing ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                {capturing ? "Capturando..." : "Baixar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CRUD Modals ── */}
      {addOpen && (
        <Modal title="Adicionar item" form={formData} setForm={setFormData}
          submitting={submitting} onClose={() => setAddOpen(false)} onSubmit={handleAdd} />
      )}
      {editItem && (
        <Modal title={`Editar · ${editItem.code}`} form={formData} setForm={setFormData}
          submitting={submitting} onClose={() => setEditItem(null)} onSubmit={handleEdit} />
      )}
      {deleteItem && (
        <ConfirmDelete item={deleteItem} submitting={submitting}
          onClose={() => setDeleteItem(null)} onConfirm={handleDelete} />
      )}

      <div className="h-full flex flex-col gap-6 p-1 animate-in fade-in duration-500">

        {/* ═══ HEADER ═════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between border-b border-white/5 pb-5 animate-in slide-in-from-top-2 duration-500">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Quarentena
            </h1>
            <p className="text-xs text-gray-500 mt-1.5">Produtos em restrição operacional · Armazém G300</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Compartilhar — visível para todos */}
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 text-xs font-semibold transition-all duration-200 hover:scale-105"
            >
              <Share2 size={13} />
              Compartilhar
            </button>

            {isAdmin && (
              <>
                {/* Exportar Excel */}
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-xs font-semibold transition-all duration-200 hover:scale-105"
                >
                  <FileSpreadsheet size={13} />
                  Exportar
                </button>

                {/* Adicionar */}
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/30 text-blue-300 hover:text-blue-200 hover:from-blue-500/30 hover:to-blue-600/20 text-xs font-semibold transition-all duration-200 hover:scale-105"
                >
                  <Plus size={13} />
                  Adicionar
                </button>
              </>
            )}

            <button 
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.05] text-xs font-semibold transition-all duration-200 hover:scale-105"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>

        {/* ═══ STAT CARDS ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Itens", value: totalItems, color: "text-white", icon: AlertCircle, delay: "delay-0" },
            { label: "Pendentes", value: pending.length, color: "text-amber-400", icon: Clock, delay: "delay-100" },
            { label: "Resolvidos", value: resolvedCnt, color: "text-emerald-400", icon: CheckCircle2, delay: "delay-200" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div 
                key={s.label} 
                className={cn(
                  "bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-white/20 hover:scale-105 animate-in fade-in zoom-in-95",
                  s.delay
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</span>
                  <Icon size={14} className={cn("text-gray-600", s.color)} />
                </div>
                <div className={cn("text-3xl font-bold tracking-tight", s.color)}>
                  {loading ? <span className="text-gray-400">—</span> : s.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ FILTERS ════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-4 flex-wrap animate-in slide-in-from-bottom-2 duration-500">
          <div className="relative flex-1 min-w-[280px] group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors duration-200" size={14} />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, descrição ou observação..."
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.04] placeholder:text-gray-600 transition-all duration-200" 
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-white/[0.02] border border-white/10 rounded-xl p-1 gap-1">
              {(["Todas", "BR", "AG"] as const).map((c) => (
                <button 
                  key={c} 
                  onClick={() => setCompanyFilter(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 transform hover:scale-105",
                    companyFilter === c 
                      ? "bg-gradient-to-r from-blue-500/30 to-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/20" 
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]"
                  )}
                >
                  {c === "Todas" ? "Empresa" : c}
                </button>
              ))}
            </div>
            <div className="flex bg-white/[0.02] border border-white/10 rounded-xl p-1 gap-1">
              {(["Todos", "Pendente", "Resolvido"] as const).map((s) => (
                <button 
                  key={s} 
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 transform hover:scale-105",
                    statusFilter === s 
                      ? "bg-gradient-to-r from-emerald-500/30 to-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-lg shadow-emerald-500/20" 
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ TABLE ══════════════════════════════════════════════════ */}
        <div className="flex-1 bg-gradient-to-br from-white/[0.02] to-white/[0.01] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0 animate-in fade-in duration-500">
          <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full border-separate border-spacing-0 table-fixed">
              <colgroup>
                <col style={{ width: isAdmin ? "7%"  : "8%"  }} />
                <col style={{ width: isAdmin ? "24%" : "28%" }} />
                <col style={{ width: "5%"  }} />
                <col style={{ width: "5%"  }} />
                <col style={{ width: isAdmin ? "42%" : "46%" }} />
                <col style={{ width: "8%"  }} />
                {isAdmin && <col style={{ width: "9%" }} />}
              </colgroup>
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-white/[0.03] to-white/[0.01]">
                <tr className="border-b border-white/10">
                  {["Código", "Descrição do Produto", "Qtd.", "Tipo", "Observações", "Resolvido", ...(isAdmin ? ["Ações"] : [])].map((h) => (
                    <th 
                      key={h}
                      className={cn(
                        "text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/10 whitespace-nowrap",
                        h === "Qtd." ? "px-2 py-3" : "px-4 py-3",
                        (h === "Resolvido" || h === "Ações") && "text-center"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={colSpanTotal} className="px-4 py-4.5 border-b border-white/[0.02]">
                        <div className="h-2.5 bg-white/5 rounded-full" style={{ width: `${50 + (i * 9) % 40}%` }} />
                      </td>
                    </tr>
                  ))
                ) : processedItems.length === 0 ? (
                  <tr>
                    <td colSpan={colSpanTotal} className="py-24 text-center">
                      <p className="text-xs text-gray-500">Nenhum item em quarentena encontrado</p>
                    </td>
                  </tr>
                ) : (
                  processedItems.map((item, idx) => {
                    const desc       = descMap[item.code?.trim().toUpperCase()] ?? "—";
                    const isAG       = (item.company ?? "").toUpperCase() === "AG";
                    const isUpdating = updatingId === item.id;
                    return (
                      <tr 
                        key={item.id}
                        className={cn(
                          "group transition-all duration-200 border-b border-white/[0.02] animate-in fade-in slide-in-from-left-2",
                          item.resolved 
                            ? "opacity-40 hover:opacity-60 bg-white/[0.01]" 
                            : "hover:bg-white/[0.04] hover:border-white/10"
                        )}
                        style={{ animationDelay: `${idx * 25}ms` }}
                      >
                        {/* Código */}
                        <td className={cn(
                          "px-4 py-3.5 border-b border-white/[0.02] text-xs tracking-wider font-semibold transition-colors duration-200",
                          item.isDuplicate ? "text-red-400 bg-red-950/20" : "text-white/90"
                        )}>
                          {item.code ?? "—"}
                        </td>
                        {/* Descrição */}
                        <td className="px-4 py-3.5 border-b border-white/[0.02] text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                          <span className="line-clamp-2 leading-relaxed">{desc}</span>
                        </td>
                        {/* Quantidade */}
                        <td className="px-2 py-3.5 border-b border-white/[0.02] text-xs text-white/90 text-center whitespace-nowrap font-semibold">
                          {(item.quantity ?? 0).toLocaleString("pt-BR")}
                        </td>
                        {/* Tipo */}
                        <td className="px-4 py-3.5 border-b border-white/[0.02] text-xs">
                          <span className={cn(
                            "px-2 py-0.5 rounded border text-[9px] uppercase font-bold transition-all duration-200",
                            isAG 
                              ? "bg-blue-500/15 border-blue-500/30 text-blue-400 group-hover:bg-blue-500/25 group-hover:border-blue-500/40" 
                              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500/25 group-hover:border-emerald-500/40"
                          )}>
                            {item.company ?? "BR"}
                          </span>
                        </td>
                        {/* Observações */}
                        <td className="px-4 py-3.5 border-b border-white/[0.02] text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                          <span className="leading-relaxed block">{item.observation ?? "—"}</span>
                        </td>
                        {/* Resolvido */}
                        <td className="px-4 py-3.5 border-b border-white/[0.02]">
                          <div className="flex items-center justify-center">
                            <button 
                              onClick={() => toggleResolved(item)} 
                              disabled={!isAdmin || isUpdating}
                              className={cn(
                                "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full p-0.5 transition-all duration-300 ease-in-out focus:outline-none transform hover:scale-110",
                                item.resolved 
                                  ? "bg-emerald-500/80 shadow-lg shadow-emerald-500/30" 
                                  : "bg-[#1e293b] border border-white/10 hover:border-white/20",
                                (!isAdmin || isUpdating) && "cursor-not-allowed opacity-50 hover:scale-100"
                              )}
                            >
                              <span className={cn(
                                "pointer-events-none inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-all duration-300 ease-in-out shadow-sm",
                                item.resolved ? "translate-x-5" : "translate-x-0"
                              )}>
                                {isUpdating && <Loader2 size={8} className="animate-spin text-gray-400" />}
                              </span>
                            </button>
                          </div>
                        </td>
                        {/* Ações */}
                        {isAdmin && (
                          <td className="px-3 py-3.5 border-b border-white/[0.02]">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                              <button 
                                onClick={() => openEdit(item)} 
                                title="Editar"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/15 transition-all duration-200 transform hover:scale-110"
                              >
                                <Pencil size={11} />
                              </button>
                              <button 
                                onClick={() => setDeleteItem(item)} 
                                title="Remover"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/15 transition-all duration-200 transform hover:scale-110"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-white/10 bg-gradient-to-r from-white/[0.01] to-transparent flex items-center justify-between shrink-0">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">
              {processedItems.length} {processedItems.length === 1 ? "registro" : "registros"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
