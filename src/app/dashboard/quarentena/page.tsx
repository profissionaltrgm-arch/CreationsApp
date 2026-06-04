"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, RefreshCw, Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

/* ─── Modal Component ───────────────────────────────────────────── */
function Modal({
  title,
  onClose,
  onSubmit,
  submitting,
  form,
  setForm,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#0D1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Código */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Código</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Ex: 2555-03"
              className="bg-[#080B10] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Quantidade + Empresa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Quantidade</label>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="bg-[#080B10] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Empresa</label>
              <div className="flex bg-[#080B10] border border-white/10 rounded-xl p-1 gap-1">
                {(["BR", "AG"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, company: c })}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-150",
                      form.company === c
                        ? c === "AG"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/20"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                        : "text-gray-600 hover:text-gray-400"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Observação */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Observação</label>
            <textarea
              rows={3}
              value={form.observation}
              onChange={(e) => setForm({ ...form, observation: e.target.value })}
              placeholder="Descreva o motivo da quarentena..."
              className="bg-[#080B10] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Resolvido */}
          <div className="flex items-center justify-between rounded-xl bg-[#080B10] border border-white/5 px-4 py-3">
            <span className="text-xs text-gray-400 font-light">Marcar como resolvido</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, resolved: !form.resolved })}
              className={cn(
                "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none",
                form.resolved ? "bg-emerald-500/80" : "bg-[#1e293b] border border-white/5"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm",
                  form.resolved ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-400 border border-white/10 hover:bg-white/5 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !form.code.trim()}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Confirm Delete Modal ──────────────────────────────────────── */
function ConfirmDelete({
  item,
  onClose,
  onConfirm,
  submitting,
}: {
  item: QuarantineItem;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-[#0D1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20">
              <Trash2 size={15} className="text-red-400" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Remover item</p>
              <p className="text-xs text-gray-500 mt-0.5">Esta ação não pode ser desfeita.</p>
            </div>
          </div>
          <div className="rounded-xl bg-[#080B10] border border-white/5 px-4 py-3">
            <p className="text-xs font-mono text-white/80">{item.code}</p>
            {item.observation && (
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed line-clamp-2">{item.observation}</p>
            )}
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-400 border border-white/10 hover:bg-white/5 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function QuarentenaPage() {
  const [items, setItems]                   = useState<QuarantineItem[]>([]);
  const [descMap, setDescMap]               = useState<Record<string, string>>({});
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [companyFilter, setCompanyFilter]   = useState("Todas");
  const [statusFilter, setStatusFilter]     = useState("Todos");
  const [isAdmin, setIsAdmin]               = useState(false);
  const [updatingId, setUpdatingId]         = useState<number | null>(null);

  // Modal state
  const [addOpen, setAddOpen]               = useState(false);
  const [editItem, setEditItem]             = useState<QuarantineItem | null>(null);
  const [deleteItem, setDeleteItem]         = useState<QuarantineItem | null>(null);
  const [formData, setFormData]             = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting]         = useState(false);

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

  /* ── Sorted & Filtered rows with duplicates check ───────────────── */
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
      .map((item) => ({
        ...item,
        isDuplicate: counts[(item.code || "").trim().toUpperCase()] > 1,
      }))
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [items, search, companyFilter, statusFilter, descMap]);

  /* ── Toggle resolved ────────────────────────────────────────────── */
  async function toggleResolved(item: QuarantineItem) {
    if (!isAdmin) return;
    setUpdatingId(item.id);
    await supabase.from("quarantine").update({ resolved: !item.resolved }).eq("id", item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, resolved: !i.resolved } : i)));
    setUpdatingId(null);
  }

  /* ── CRUD helpers ───────────────────────────────────────────────── */
  function openAdd() {
    setFormData(EMPTY_FORM);
    setAddOpen(true);
  }

  function openEdit(item: QuarantineItem) {
    setFormData({
      code: item.code,
      quantity: item.quantity,
      company: item.company,
      observation: item.observation,
      resolved: item.resolved,
    });
    setEditItem(item);
  }

  async function handleAdd() {
    if (!formData.code.trim()) return;
    setSubmitting(true);
    const { data } = await supabase
      .from("quarantine")
      .insert([{ ...formData, code: formData.code.trim().toUpperCase() }])
      .select()
      .single();
    if (data) setItems((prev) => [data as QuarantineItem, ...prev]);
    setSubmitting(false);
    setAddOpen(false);
  }

  async function handleEdit() {
    if (!editItem || !formData.code.trim()) return;
    setSubmitting(true);
    const { data } = await supabase
      .from("quarantine")
      .update({ ...formData, code: formData.code.trim().toUpperCase() })
      .eq("id", editItem.id)
      .select()
      .single();
    if (data) setItems((prev) => prev.map((i) => (i.id === editItem.id ? (data as QuarantineItem) : i)));
    setSubmitting(false);
    setEditItem(null);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setSubmitting(true);
    await supabase.from("quarantine").delete().eq("id", deleteItem.id);
    setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
    setSubmitting(false);
    setDeleteItem(null);
  }

  /* ── Column count ───────────────────────────────────────────────── */
  const colSpanTotal = isAdmin ? 7 : 6;

  /* ── UI ─────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Modals ── */}
      {addOpen && (
        <Modal
          title="Adicionar item"
          form={formData}
          setForm={setFormData}
          submitting={submitting}
          onClose={() => setAddOpen(false)}
          onSubmit={handleAdd}
        />
      )}
      {editItem && (
        <Modal
          title={`Editar · ${editItem.code}`}
          form={formData}
          setForm={setFormData}
          submitting={submitting}
          onClose={() => setEditItem(null)}
          onSubmit={handleEdit}
        />
      )}
      {deleteItem && (
        <ConfirmDelete
          item={deleteItem}
          submitting={submitting}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleDelete}
        />
      )}

      <div className="h-full flex flex-col gap-6 p-1 animate-in fade-in duration-300">

        {/* ═══ HEADER ═════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between border-b border-white/5 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Quarentena
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                AJ
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Produtos em restrição operacional · Armazém G300
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.08] text-xs font-semibold transition-all"
              >
                <Plus size={13} />
                Adicionar
              </button>
            )}
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.05] text-xs font-semibold transition-all"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>

        {/* ═══ STAT CARDS ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Itens", value: totalItems, color: "text-white" },
            { label: "Pendentes",   value: pending.length, color: "text-amber-500" },
            { label: "Resolvidos",  value: resolvedCnt,    color: "text-emerald-500" },
          ].map((s) => (
            <div key={s.label} className="bg-[#0D1117] border border-white/5 rounded-xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</span>
              <div className={cn("text-2xl font-semibold mt-1 tracking-tight", s.color)}>
                {loading ? "—" : s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ FILTERS ════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, descrição ou observação..."
              className="w-full bg-[#0D1117] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-white/20 placeholder:text-gray-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Company filter */}
            <div className="flex bg-[#0D1117] border border-white/5 rounded-xl p-1 gap-1">
              {(["Todas", "BR", "AG"] as const).map((c) => (
                <button key={c} onClick={() => setCompanyFilter(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                    companyFilter === c
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-300"
                  )}>
                  {c === "Todas" ? "Empresa" : c}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex bg-[#0D1117] border border-white/5 rounded-xl p-1 gap-1">
              {(["Todos", "Pendente", "Resolvido"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                    statusFilter === s
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-300"
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ TABLE ══════════════════════════════════════════════════ */}
        <div className="flex-1 bg-[#0D1117] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0">
          <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full border-separate border-spacing-0 table-fixed">
              <colgroup>
                <col style={{ width: isAdmin ? "7%"  : "8%"  }} /> {/* Código */}
                <col style={{ width: isAdmin ? "24%" : "28%" }} /> {/* Descrição */}
                <col style={{ width: "5%"  }} />                   {/* Qtd. */}
                <col style={{ width: "5%"  }} />                   {/* Tipo */}
                <col style={{ width: isAdmin ? "42%" : "46%" }} /> {/* Obs. */}
                <col style={{ width: "8%"  }} />                   {/* Resolvido */}
                {isAdmin && <col style={{ width: "9%" }} />}        {/* Ações */}
              </colgroup>

              <thead className="sticky top-0 z-10 bg-[#0D1117]">
                <tr className="border-b border-white/5">
                  {["Código", "Descrição do Produto", "Qtd.", "Tipo", "Observações", "Resolvido", ...(isAdmin ? ["Ações"] : [])].map((h) => (
                    <th key={h}
                        className={cn(
                          "text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 whitespace-nowrap",
                          h === "Qtd." ? "px-2 py-3" : "px-4 py-3",
                          (h === "Resolvido" || h === "Ações") && "text-center"
                        )}>
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
                  processedItems.map((item) => {
                    const desc      = descMap[item.code?.trim().toUpperCase()] ?? "—";
                    const isAG      = (item.company ?? "").toUpperCase() === "AG";
                    const isUpdating = updatingId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "group transition-all duration-150 border-b border-white/[0.02]",
                          item.resolved
                            ? "opacity-35 hover:opacity-50"
                            : "hover:bg-white/[0.01]"
                        )}
                      >
                        {/* Código */}
                        <td className={cn(
                          "px-4 py-3.5 border-b border-white/[0.02] text-xs tracking-wider text-white/90",
                          item.isDuplicate && "text-red-400 bg-red-950/20"
                        )}>
                          {item.code ?? "—"}
                        </td>

                        {/* Descrição */}
                        <td className="px-4 py-3.5 border-b border-white/[0.02] text-xs text-gray-400">
                          <span className="line-clamp-2 leading-relaxed">{desc}</span>
                        </td>

                        {/* Quantidade */}
                        <td className="px-2 py-3.5 border-b border-white/[0.02] text-xs text-white/90 text-center whitespace-nowrap">
                          {(item.quantity ?? 0).toLocaleString("pt-BR")}
                        </td>

                        {/* Tipo / Empresa */}
                        <td className="px-4 py-3.5 border-b border-white/[0.02] text-xs">
                          <span className={cn(
                            "px-2 py-0.5 rounded border text-[9px] uppercase",
                            isAG
                              ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          )}>
                            {item.company ?? "BR"}
                          </span>
                        </td>

                        {/* Observações */}
                        <td className="px-4 py-3.5 border-b border-white/[0.02] text-xs text-gray-400">
                          <span className="leading-relaxed block">{item.observation ?? "—"}</span>
                        </td>

                        {/* Resolvido? */}
                        <td className="px-4 py-3.5 border-b border-white/[0.02]">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => toggleResolved(item)}
                              disabled={!isAdmin || isUpdating}
                              className={cn(
                                "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none",
                                item.resolved ? "bg-emerald-500/80" : "bg-[#1e293b] border border-white/5",
                                (!isAdmin || isUpdating) && "cursor-not-allowed opacity-50"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm",
                                  item.resolved ? "translate-x-5" : "translate-x-0"
                                )}
                              >
                                {isUpdating && <Loader2 size={8} className="animate-spin text-gray-400" />}
                              </span>
                            </button>
                          </div>
                        </td>

                        {/* Ações (admin only) */}
                        {isAdmin && (
                          <td className="px-3 py-3.5 border-b border-white/[0.02]">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <button
                                onClick={() => openEdit(item)}
                                title="Editar"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                onClick={() => setDeleteItem(item)}
                                title="Remover"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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

          {/* Table footer */}
          <div className="px-4 py-3 border-t border-white/5 bg-black/10 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">
              {processedItems.length} registros
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
