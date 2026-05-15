"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, PackageSearch } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Empresa = "AG" | "BR";
type StatusDivergencia = "Falta" | "Sobra";

interface Divergencia {
  status: StatusDivergencia;
  posicao: string;
  codigo: string;
  descricao: string;
  sistema: number;
  fisico: number;
  empresa: Empresa;
}

interface EmpresaStats {
  validadas: number;
  divergencias: number;
  acuracia: number;
}

// ─── Dados (substitua por fetch da sua API) ───────────────────────────────────

const statsData: Record<Empresa, EmpresaStats> = {
  AG: { validadas: 102, divergencias: 3, acuracia: 97.06 },
  BR: { validadas: 84,  divergencias: 1, acuracia: 98.81 },
};

const divergenciasData: Divergencia[] = [
  { empresa: "AG", status: "Falta", posicao: "PK30002A0120", codigo: "5774-02", descricao: "MICRO-ONDAS MO-02-34-B 220V/60HZ",  sistema: 23, fisico: 22 },
  { empresa: "AG", status: "Falta", posicao: "PKCHAO",       codigo: "5617-03", descricao: "MICRO-ONDAS MO-02-34-W 127V/60HZ",  sistema: 2,  fisico: 0  },
  { empresa: "AG", status: "Sobra", posicao: "PKCHAO",       codigo: "4899-01", descricao: "BOOMBOX AWS-BBS-01-B BIVOLT",        sistema: 9,  fisico: 11 },
  { empresa: "BR", status: "Falta", posicao: "PK30002A0012", codigo: "3798-01", descricao: "VENT 40CM NVT-40-8P-B 127V/60HZ",   sistema: 1,  fisico: 0  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatCard({
  label,
  validadas,
  divergencias,
  acuracia,
  highlighted,
  delay = 0,
}: {
  label: string;
  validadas: number;
  divergencias: number;
  acuracia: number;
  highlighted?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "flex-1 min-w-[200px] rounded-[2rem] p-6 border transition-all relative overflow-hidden group",
        highlighted
          ? "bg-blue-600/10 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.12)]"
          : "bg-[#0D1528] border-white/5 hover:border-white/10 shadow-xl"
      )}
    >
      {/* Glow bg */}
      <div className={cn(
        "absolute top-0 right-0 w-40 h-40 blur-[80px] rounded-full pointer-events-none -mr-16 -mt-16",
        highlighted ? "bg-blue-500/10" : "bg-white/[0.02]"
      )} />

      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 mb-4 relative z-10">
        {label}
      </p>

      <div className="flex items-end gap-3 relative z-10">
        <span className="text-4xl font-black text-white tracking-tighter leading-none">
          {validadas}
        </span>
        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">
          validadas
        </span>
        <span className={cn(
          "ml-auto text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border",
          divergencias > 0
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        )}>
          {divergencias} diverg.
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 relative z-10">
        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(acuracia, 100)}%` }}
            transition={{ duration: 1.2, delay: delay + 0.3, ease: "circOut" }}
            className={cn("h-full rounded-full", highlighted ? "bg-blue-500" : "bg-emerald-500")}
          />
        </div>
        <span className={cn(
          "text-[11px] font-black",
          highlighted ? "text-blue-400" : "text-emerald-400"
        )}>
          {acuracia.toFixed(2)}%
        </span>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: StatusDivergencia }) {
  const isFalta = status === "Falta";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
      isFalta
        ? "bg-red-500/10 border-red-500/20 text-red-400"
        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
    )}>
      {isFalta
        ? <AlertTriangle size={10} />
        : <CheckCircle2 size={10} />
      }
      {status}
    </span>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function PickingPage() {
  const hoje = new Date();
  const semana = getWeekNumber(hoje);
  const [divergencias] = useState<Divergencia[]>(divergenciasData);
  const [stats] = useState(statsData);

  const empresas: Empresa[] = ["AG", "BR"];

  const totalValidadas    = stats.AG.validadas + stats.BR.validadas;
  const totalDivergencias = stats.AG.divergencias + stats.BR.divergencias;
  const totalAcuracia     = (stats.AG.acuracia + stats.BR.acuracia) / 2;
  const totalSistema      = divergencias.reduce((s, d) => s + d.sistema, 0);
  const totalFisico       = divergencias.reduce((s, d) => s + d.fisico, 0);
  const totalDif          = totalFisico - totalSistema;

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden custom-scrollbar overflow-y-auto pr-2">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between px-1 mt-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <PackageSearch className="text-blue-500" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none uppercase">
              Validação Picking
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Semana {semana} · {formatDate(hoje)} · G300
            </p>
          </div>
        </div>

        <div className="flex bg-[#0D1528] border border-white/5 p-1 rounded-xl">
          <div className="flex items-center gap-2 px-3">
            <Activity size={12} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">
              Sistema Conectado
            </span>
          </div>
        </div>
      </div>

      {/* ── Cards de Estatísticas ────────────────────────────────────────────── */}
      <div className="px-1">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-blue-500" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Validação Picking G300
          </h2>
        </div>

        <div className="flex gap-4 flex-wrap">
          {empresas.map((emp, i) => (
            <StatCard
              key={emp}
              label={emp}
              validadas={stats[emp].validadas}
              divergencias={stats[emp].divergencias}
              acuracia={stats[emp].acuracia}
              delay={i * 0.1}
            />
          ))}
          <StatCard
            label="Total Geral"
            validadas={totalValidadas}
            divergencias={totalDivergencias}
            acuracia={totalAcuracia}
            highlighted
            delay={0.2}
          />
        </div>
      </div>

      {/* ── Tabela de Divergências ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="px-1 pb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={14} className="text-yellow-500" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Divergências de Picking
          </h2>
        </div>

        <div className="bg-[#0D1528] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                {["Status", "Posição", "Código", "Descrição", "Sistema", "Físico", "Diferença"].map((col) => (
                  <th
                    key={col}
                    className={cn(
                      "px-5 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600",
                      ["Sistema", "Físico", "Diferença"].includes(col) ? "text-right" : "text-left"
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map((emp) => {
                const rows = divergencias.filter((d) => d.empresa === emp);
                if (!rows.length) return null;
                return (
                  <>
                    <tr key={`g-${emp}`}>
                      <td
                        colSpan={7}
                        className="px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-gray-600 bg-white/[0.02] border-y border-white/[0.03]"
                      >
                        Empresa: {emp}
                      </td>
                    </tr>
                    {rows.map((d, i) => {
                      const diff = d.fisico - d.sistema;
                      return (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.05 }}
                          className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                        >
                          <td className="px-5 py-4">
                            <StatusBadge status={d.status} />
                          </td>
                          <td className="px-5 py-4 font-mono text-[10px] text-gray-400 group-hover:text-gray-300 transition-colors">
                            {d.posicao}
                          </td>
                          <td className="px-5 py-4 text-gray-400 group-hover:text-gray-300 transition-colors">
                            {d.codigo}
                          </td>
                          <td className="px-5 py-4 text-gray-300 max-w-[240px] truncate">
                            {d.descricao}
                          </td>
                          <td className="px-5 py-4 text-right font-black text-white">{d.sistema}</td>
                          <td className="px-5 py-4 text-right font-black text-white">{d.fisico}</td>
                          <td className={cn(
                            "px-5 py-4 text-right font-black",
                            diff < 0 ? "text-red-400" : diff > 0 ? "text-emerald-400" : "text-gray-400"
                          )}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td colSpan={4} />
                <td className="px-5 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Total: {totalSistema}
                </td>
                <td className="px-5 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Total: {totalFisico}
                </td>
                <td className={cn(
                  "px-5 py-4 text-right text-[11px] font-black uppercase tracking-widest",
                  totalDif < 0 ? "text-red-400" : totalDif > 0 ? "text-emerald-400" : "text-gray-400"
                )}>
                  {totalDif > 0 ? `+${totalDif}` : totalDif}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
