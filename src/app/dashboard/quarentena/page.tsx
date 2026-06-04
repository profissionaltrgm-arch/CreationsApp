"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search, RefreshCw, Loader2,
} from "lucide-react";
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

export default function QuarentenaPage() {
  const [items, setItems]               = useState<QuarantineItem[]>([]);
  const [descMap, setDescMap]           = useState<Record<string, string>>({});
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [companyFilter, setCompanyFilter] = useState("Todas");
  const [statusFilter, setStatusFilter]  = useState("Todos");
  const [isAdmin, setIsAdmin]            = useState(false);
  const [updatingId, setUpdatingId]      = useState<number | null>(null);

  /* ── Auth ─────────────────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAdmin(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setIsAdmin(!!s));
    return () => subscription.unsubscribe();
  }, []);

  /* ── Data fetch ────────────────────────────────────────────────── */
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

  /* ── Derived stats ─────────────────────────────────────────────── */
  const totalItems   = items.length;
  const pending      = items.filter((i) => !i.resolved);
  const resolvedCnt  = items.filter((i) =>  i.resolved).length;

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

  /* ── Toggle resolved ───────────────────────────────────────────── */
  async function toggleResolved(item: QuarantineItem) {
    if (!isAdmin) return;
    setUpdatingId(item.id);
    await supabase
      .from("quarantine")
      .update({ resolved: !item.resolved })
      .eq("id", item.id);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, resolved: !i.resolved } : i))
    );
    setUpdatingId(null);
  }

  /* ── UI ────────────────────────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col gap-6 p-1 animate-in fade-in duration-300">

      {/* ═══ HEADER ════════════════════════════════════════════════ */}
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

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.05] text-xs font-semibold transition-all"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {/* ═══ STAT CARDS ═════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Itens", value: totalItems, color: "text-white" },
          { label: "Pendentes", value: pending.length, color: "text-amber-500" },
          { label: "Resolvidos", value: resolvedCnt, color: "text-emerald-500" },
        ].map((s) => (
          <div key={s.label} className="bg-[#0D1117] border border-white/5 rounded-xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</span>
            <div className={cn("text-2xl font-semibold mt-1 tracking-tight", s.color)}>
              {loading ? "—" : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ FILTERS ═══════════════════════════════════════════════ */}
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

      {/* ═══ TABLE ═════════════════════════════════════════════════ */}
      <div className="flex-1 bg-[#0D1117] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-[#0D1117]">
              <tr className="border-b border-white/5">
                {["Código", "Descrição do Produto", "Qtd.", "Tipo", "Observações", "Resolvido"].map((h) => (
                  <th key={h}
                      className={cn(
                        "text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 whitespace-nowrap",
                        h === "Qtd." ? "px-2 py-3" : "px-4 py-3",
                        h === "Resolvido" && "text-center"
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
                    <td colSpan={6} className="px-4 py-4.5 border-b border-white/[0.02]">
                      <div className="h-2.5 bg-white/5 rounded-full" style={{ width: `${50 + (i * 9) % 40}%` }} />
                    </td>
                  </tr>
                ))
              ) : processedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <p className="text-xs text-gray-500">Nenhum item em quarentena encontrado</p>
                  </td>
                </tr>
              ) : (
                processedItems.map((item) => {
                  const desc = descMap[item.code?.trim().toUpperCase()] ?? "—";
                  const isAG = (item.company ?? "").toUpperCase() === "AG";
                  const isUpdating = updatingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "transition-all duration-150 border-b border-white/[0.02]",
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
                      <td className="px-4 py-3.5 border-b border-white/[0.02] text-xs text-gray-400 max-w-[280px]">
                        <span className="line-clamp-2 leading-relaxed">
                          {desc}
                        </span>
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
                      <td className="px-4 py-3.5 border-b border-white/[0.02] text-xs text-gray-400 w-full">
                        <span className="leading-relaxed block">
                          {item.observation ?? "—"}
                        </span>
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
                              {isUpdating && (
                                <Loader2 size={8} className="animate-spin text-gray-400" />
                              )}
                            </span>
                          </button>
                        </div>
                      </td>
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
  );
}
