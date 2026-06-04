"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShieldAlert, Package, CheckCircle2, Clock,
  Search, RefreshCw, Loader2, MapPin,
  Boxes, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuarantineItem {
  id: number;
  created_at: string;
  code: string;
  quantity: number;
  company: string;
  observations: string;
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
  const [now, setNow]                    = useState(new Date());

  /* ── Auth ─────────────────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAdmin(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setIsAdmin(!!s));
    return () => subscription.unsubscribe();
  }, []);

  /* ── Live clock ────────────────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
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
    // Count global occurrences of each code in items list to mark duplicate codes
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
        (item.observations ?? "").toLowerCase().includes(q);
      const matchCompany =
        companyFilter === "Todas" ||
        (item.company ?? "").toUpperCase() === companyFilter.toUpperCase();
      const matchStatus =
        statusFilter === "Todos" ||
        (statusFilter === "Pendente" && !item.resolved) ||
        (statusFilter === "Resolvido" && item.resolved);
      return matchSearch && matchCompany && matchStatus;
    });

    // Map duplicate flag and sort alphabetically by code so duplicates are grouped together
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
    <div className="h-full flex flex-col gap-5 animate-in fade-in duration-500">

      {/* ═══ HERO HEADER ══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 shadow-[0_0_80px_rgba(245,158,11,0.07)]"
           style={{ background: "linear-gradient(135deg,#0D0900 0%,#110C02 50%,#09090F 100%)" }}>

        {/* ambient glows */}
        <div className="absolute -top-16 left-1/3 w-80 h-56 bg-amber-500/8 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-orange-600/5 blur-[60px] rounded-full pointer-events-none" />
        {/* grid texture */}
        <div className="absolute inset-0 opacity-[0.025]"
             style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative p-6">
          {/* Top bar */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-4">
              {/* Icon badge */}
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.2)]">
                  <ShieldAlert className="text-amber-400" size={27} />
                </div>
                {pending.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 border-2 border-[#0D0900] flex items-center justify-center text-[8px] font-black text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                    {pending.length > 9 ? "9+" : pending.length}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-black tracking-tight text-white">Quarentena</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[9px] font-black text-amber-400 uppercase tracking-widest">
                    <MapPin size={8} /> Posição AJ
                  </span>
                  {pending.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[9px] font-black text-red-400 uppercase tracking-widest animate-pulse">
                      <Clock size={8} /> {pending.length} pendente{pending.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-amber-500/50 font-bold uppercase tracking-widest">
                  Produtos em restrição operacional · Armazém G300
                </p>
              </div>
            </div>

            {/* Right: clock + refresh */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[18px] font-black text-white/80 tabular-nums tracking-tight leading-none">
                  {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
                <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mt-0.5">
                  {now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                </p>
              </div>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.025] text-gray-500 hover:text-amber-400 hover:border-amber-500/25 text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                Atualizar
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Total Itens", value: totalItems, icon: Boxes, color: "text-blue-400", glow: "shadow-[0_0_12px_rgba(59,130,246,0.12)]", border: "border-blue-500/15" },
              { label: "Pendentes", value: pending.length, icon: Clock, color: "text-amber-400", glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]", border: "border-amber-500/20" },
              { label: "Resolvidos", value: resolvedCnt, icon: CheckCircle2, color: "text-emerald-400", glow: "shadow-[0_0_12px_rgba(16,185,129,0.12)]", border: "border-emerald-500/15" },
            ].map((s) => (
              <div key={s.label}
                   className={cn("bg-black/25 border rounded-2xl p-4 backdrop-blur-sm transition-all hover:bg-black/35", s.border, s.glow)}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em]">{s.label}</span>
                  <s.icon size={14} className={s.color} />
                </div>
                <span className={cn("text-3xl font-light tabular-nums tracking-tight", s.color)}>
                  {loading ? "—" : s.value.toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ FILTERS ═══════════════════════════════════════════════ */}
      <div className="flex items-end gap-4 flex-wrap">
        {/* Search */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[240px]">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Pesquisar</span>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-amber-500 transition-colors" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="BUSCAR POR CÓDIGO, DESCRIÇÃO OU OBSERVAÇÃO..."
              className="w-full bg-[#0D1117] border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-[11px] font-bold text-white uppercase tracking-widest focus:outline-none focus:border-amber-500/30 transition-all placeholder:text-gray-700 animate-none"
            />
          </div>
        </div>

        {/* Company filter */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Filtrar por Empresa</span>
          <div className="flex bg-[#0D1117] border border-white/5 rounded-2xl p-1 gap-1">
            {(["Todas", "BR", "AG"] as const).map((c) => (
              <button key={c} onClick={() => setCompanyFilter(c)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200",
                  companyFilter === c
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                    : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.02]"
                )}>
                {c === "Todas" ? "Empresa" : c}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Filtrar por Status</span>
          <div className="flex bg-[#0D1117] border border-white/5 rounded-2xl p-1 gap-1">
            {(["Todos", "Pendente", "Resolvido"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200",
                  statusFilter === s
                    ? s === "Pendente"
                      ? "bg-red-500/15 text-red-400 border border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                      : s === "Resolvido"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                      : "bg-white/10 text-white border border-white/20"
                    : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.02]"
                )}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TABLE ═════════════════════════════════════════════════ */}
      <div className="flex-1 bg-[#0D1117] border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl min-h-0">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-[#0D1117]/95 backdrop-blur-xl">
              <tr>
                <th className="w-0 p-0 border-b border-white/5" />
                {["Código", "Descrição do Produto", "Quantidade", "Tipo", "Observações", "Resolvido?"].map((h) => (
                  <th key={h}
                      className={cn(
                        "px-5 py-4 text-left text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] border-b border-white/5 whitespace-nowrap",
                        h === "Resolvido?" && "text-center"
                      )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-5 py-4 border-b border-white/[0.02]">
                      <div className="h-2 bg-white/5 rounded-full" style={{ width: `${60 + (i * 7) % 35}%` }} />
                    </td>
                  </tr>
                ))
              ) : processedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-28 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center mx-auto mb-4">
                      <Package size={28} className="text-amber-500/20" />
                    </div>
                    <p className="text-[11px] text-gray-700 font-black uppercase tracking-[0.3em]">
                      Nenhum item em quarentena
                    </p>
                    <p className="text-[9px] text-gray-800 font-bold uppercase tracking-widest mt-1">
                      {search ? "Tente outro termo de busca" : "Posição AJ limpa"}
                    </p>
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
                        "group transition-all duration-200 border-b border-white/[0.025]",
                        item.resolved
                          ? "opacity-40 hover:opacity-60"
                          : "hover:bg-amber-500/[0.01]"
                      )}
                    >
                      {/* Left accent bar */}
                      <td className="relative p-0 w-0 border-b border-white/[0.025]">
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-[3px] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top rounded-r",
                          item.resolved
                            ? "bg-emerald-500"
                            : "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                        )} />
                      </td>

                      {/* Código */}
                      <td className={cn(
                        "px-5 py-3.5 border-b border-white/[0.025] transition-colors",
                        item.isDuplicate && "bg-red-500/[0.05]"
                      )}>
                        <span className={cn(
                          "font-mono text-[13px] font-black tracking-wider",
                          item.isDuplicate
                            ? "text-red-400"
                            : "text-amber-400/80 group-hover:text-amber-400 transition-colors"
                        )}>
                          {item.code ?? "—"}
                        </span>
                      </td>

                      {/* Descrição */}
                      <td className="px-5 py-3.5 border-b border-white/[0.025] max-w-[280px]">
                        <span className="text-[11px] text-gray-400 group-hover:text-white/80 transition-colors line-clamp-2 leading-relaxed">
                          {desc}
                        </span>
                      </td>

                      {/* Quantidade */}
                      <td className="px-5 py-3.5 border-b border-white/[0.025]">
                        <div className="flex items-baseline gap-1">
                          <span className={cn(
                            "text-[20px] font-light tabular-nums tracking-tight leading-none",
                            item.resolved ? "text-gray-600" : "text-white"
                          )}>
                            {(item.quantity ?? 0).toLocaleString("pt-BR")}
                          </span>
                          <span className="text-[9px] text-gray-700 font-bold uppercase">un</span>
                        </div>
                      </td>

                      {/* Tipo / Empresa */}
                      <td className="px-5 py-3.5 border-b border-white/[0.025]">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider",
                          isAG
                            ? "bg-purple-500/10 border-purple-500/25 text-purple-400"
                            : "bg-blue-500/10 border-blue-500/25 text-blue-400"
                        )}>
                          <Building2 size={8} />
                          {item.company ?? "BR"}
                        </span>
                      </td>

                      {/* Observações */}
                      <td className="px-5 py-3.5 border-b border-white/[0.025] max-w-[340px]">
                        <span className="text-[11px] text-gray-500 group-hover:text-gray-300 transition-colors leading-relaxed block">
                          {item.observations ?? "—"}
                        </span>
                      </td>

                      {/* Resolvido? */}
                      <td className="px-5 py-3.5 border-b border-white/[0.025]">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => toggleResolved(item)}
                            disabled={!isAdmin || isUpdating}
                            className={cn(
                              "relative inline-flex h-5 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              item.resolved ? "bg-emerald-500" : "bg-red-500",
                              (!isAdmin || isUpdating) && "cursor-not-allowed opacity-50"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white text-[8px] font-black shadow transition duration-200 ease-in-out",
                                item.resolved ? "translate-x-6 text-emerald-600" : "translate-x-0 text-red-600"
                              )}
                            >
                              {isUpdating ? (
                                <Loader2 size={8} className="animate-spin" />
                              ) : item.resolved ? (
                                "S"
                              ) : (
                                "N"
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
        <div className="px-6 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between shrink-0">
          <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">
            {processedItems.length} de {totalItems} registros · {pending.length} pendente{pending.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
            <span className="text-[9px] font-black text-amber-500/30 uppercase tracking-[0.3em]">
              Posição AJ · G300
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
