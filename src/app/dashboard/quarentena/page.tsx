"use client";

import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShieldAlert, Package, CheckCircle2, Clock,
  Search, RefreshCw, Loader2, MapPin,
  Boxes, ChevronDown, ChevronUp, Building2,
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
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});

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

  /* ── Filtered rows ─────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    return items.filter((item) => {
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
  }, [items, search, companyFilter, statusFilter, descMap]);

  /* ── Grouped rows by code ──────────────────────────────────────── */
  const groupedItems = useMemo(() => {
    const groups: Record<string, {
      code: string;
      description: string;
      items: QuarantineItem[];
      totalQty: number;
      pendingCount: number;
    }> = {};

    filtered.forEach((item) => {
      const codeKey = (item.code || "").trim().toUpperCase();
      if (!groups[codeKey]) {
        groups[codeKey] = {
          code: item.code || "—",
          description: descMap[codeKey] || "—",
          items: [],
          totalQty: 0,
          pendingCount: 0,
        };
      }
      groups[codeKey].items.push(item);
      groups[codeKey].totalQty += item.quantity || 0;
      if (!item.resolved) {
        groups[codeKey].pendingCount += 1;
      }
    });

    return Object.values(groups);
  }, [filtered, descMap]);

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

  const toggleGroup = (code: string) => {
    setExpandedCodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

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
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                <X size={14} />
              </button>
            )}
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
                <th className="w-12 p-0 border-b border-white/5" />
                {["Código", "Descrição do Produto", "Qtd. Total", "Status Geral"].map((h) => (
                  <th key={h}
                      className="px-5 py-4 text-left text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] border-b border-white/5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-5 py-4 border-b border-white/[0.02]">
                      <div className="h-2 bg-white/5 rounded-full" style={{ width: `${60 + (i * 7) % 35}%` }} />
                    </td>
                  </tr>
                ))
              ) : groupedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-28 text-center">
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
                groupedItems.map((group) => {
                  const isExpanded = !!expandedCodes[group.code];
                  const hasMultiple = group.items.length > 1;
                  const isAllResolved = group.pendingCount === 0;

                  return (
                    <Fragment key={group.code}>
                      {/* Parent Row */}
                      <tr
                        onClick={() => toggleGroup(group.code)}
                        className={cn(
                          "group transition-all duration-200 cursor-pointer border-b border-white/[0.025]",
                          isAllResolved ? "opacity-50 hover:opacity-80" : "hover:bg-amber-500/[0.01]"
                        )}
                      >
                        {/* Expand Chevron Icon */}
                        <td className="px-4 py-4 text-center border-b border-white/[0.025]">
                          <div className="text-gray-500 group-hover:text-amber-400 transition-colors flex items-center justify-center">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </td>

                        {/* Código */}
                        <td className="px-5 py-4 border-b border-white/[0.025]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[13px] font-black text-amber-400/80 group-hover:text-amber-400 transition-colors tracking-wider">
                              {group.code}
                            </span>
                            {hasMultiple && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-[8px] font-black text-amber-400 tracking-wider">
                                {group.items.length} ITENS IGUAIS
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Descrição */}
                        <td className="px-5 py-4 border-b border-white/[0.025] max-w-[340px]">
                          <span className="text-[11px] text-gray-400 group-hover:text-white/80 transition-colors line-clamp-1 leading-relaxed">
                            {group.description}
                          </span>
                        </td>

                        {/* Qtd. Total */}
                        <td className="px-5 py-4 border-b border-white/[0.025]">
                          <div className="flex items-baseline gap-1">
                            <span className={cn(
                              "text-[20px] font-light tabular-nums tracking-tight leading-none",
                              isAllResolved ? "text-gray-600" : "text-white"
                            )}>
                              {group.totalQty.toLocaleString("pt-BR")}
                            </span>
                            <span className="text-[9px] text-gray-700 font-bold uppercase">un</span>
                          </div>
                        </td>

                        {/* Status Geral */}
                        <td className="px-5 py-4 border-b border-white/[0.025]">
                          {isAllResolved ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                              <CheckCircle2 size={10} /> Resolvido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[9px] font-black text-amber-400 uppercase tracking-wider">
                              <Clock size={10} className="animate-pulse" /> {group.pendingCount} Pendente{group.pendingCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Nested Details Row (when expanded) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-8 py-3 bg-[#080B10]/40 border-b border-white/[0.02]">
                            <div className="rounded-2xl border border-white/5 bg-[#090D14]/90 overflow-hidden shadow-inner p-1">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-white/5">
                                    <th className="px-4 py-2.5 text-[9px] font-black text-gray-600 uppercase tracking-widest">Empresa</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-gray-600 uppercase tracking-widest">Observações</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-gray-600 uppercase tracking-widest text-right">Qtd.</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-gray-600 uppercase tracking-widest text-center">Resolvido?</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.items.map((item) => {
                                    const isUpdating = updatingId === item.id;
                                    return (
                                      <tr key={item.id} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors">
                                        <td className="px-4 py-3">
                                          <span className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider",
                                            item.company?.toUpperCase() === "AG"
                                              ? "bg-purple-500/10 border-purple-500/25 text-purple-400"
                                              : "bg-blue-500/10 border-blue-500/25 text-blue-400"
                                          )}>
                                            <Building2 size={8} />
                                            {item.company || "BR"}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-[10px] text-gray-500 italic max-w-md truncate">
                                          {item.observations || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <div className="inline-flex items-baseline gap-0.5 justify-end">
                                            <span className="text-[14px] font-bold tabular-nums text-white/90">
                                              {item.quantity.toLocaleString("pt-BR")}
                                            </span>
                                            <span className="text-[8px] text-gray-700 font-bold uppercase">un</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
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
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-6 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between shrink-0">
          <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">
            {filtered.length} de {totalItems} registros · {pending.length} pendente{pending.length !== 1 ? "s" : ""}
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
