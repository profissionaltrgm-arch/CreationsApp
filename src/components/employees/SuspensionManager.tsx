"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, AlertTriangle, Trash2, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

type Suspension = {
  id: number
  start_date: string
  end_date: string
  days: number
  reason: string
  created_at: string
}

export function SuspensionManager({ employeeId }: { employeeId: number }) {
  const [suspensions, setSuspensions] = useState<Suspension[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  
  // Form state
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [days, setDays] = useState(1)
  const [reason, setReason] = useState("")

  useEffect(() => {
    fetchSuspensions()
  }, [employeeId])

  async function fetchSuspensions() {
    const { data, error } = await supabase
      .from("suspensions")
      .select("*")
      .eq("employee_id", employeeId)
      .order("start_date", { ascending: false })

    if (data) setSuspensions(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Calculate end date based on days (simplified)
    const end = new Date(startDate)
    end.setDate(end.getDate() + (days - 1))
    
    const { error } = await supabase
      .from("suspensions")
      .insert([{
        employee_id: employeeId,
        start_date: startDate,
        end_date: end.toISOString().split('T')[0],
        days,
        reason
      }])

    if (!error) {
      setIsAdding(false)
      setReason("")
      fetchSuspensions()
    }
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display text-white mb-2 tracking-tight">Histórico de Suspensões</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Medidas Disciplinares Auditadas</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all active:scale-[0.98]",
            isAdding 
              ? "bg-white/5 text-slate-500 border border-white/5 hover:text-white" 
              : "bg-rose-600 text-white shadow-xl shadow-rose-600/20"
          )}
        >
          {isAdding ? "Cancelar" : <><Plus size={16} /> Aplicar Suspensão</>}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-10 bg-[#121b28] border border-[#1e293b] rounded-[2.5rem] space-y-8 animate-in fade-in shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Data de Início</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-6 py-4.5 rounded-2xl border border-white/5 bg-black/20 text-sm font-semibold outline-none focus:border-rose-500/50 transition-all text-white shadow-inner"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Quantidade de Dias</label>
              <input 
                type="number" 
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                min="1"
                className="w-full px-6 py-4.5 rounded-2xl border border-white/5 bg-black/20 text-sm font-semibold outline-none focus:border-rose-500/50 transition-all text-white shadow-inner"
                required
              />
            </div>
          </div>
          
          <div className="relative z-10 space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Motivo Disciplinar</label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo disciplinar detalhadamente..."
              className="w-full px-6 py-5 rounded-2xl border border-white/5 bg-black/20 text-sm font-medium outline-none focus:border-rose-500/50 transition-all text-white min-h-[140px] resize-none placeholder:text-slate-800 shadow-inner"
              required
            />
          </div>
          
          <button type="submit" className="relative z-10 w-full py-5 bg-rose-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/20 active:scale-[0.98]">
            Efetivar Medida Disciplinar
          </button>
        </form>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="py-24 text-center text-slate-600 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizando Histórico...</div>
        ) : suspensions.length === 0 ? (
          <div className="py-24 border border-dashed border-white/5 rounded-[40px] text-center bg-white/[0.01]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5">
              <AlertTriangle size={32} className="text-slate-800" />
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Nenhum registro de suspensão</p>
          </div>
        ) : (
          suspensions.map((s) => (
            <div key={s.id} className="p-10 bg-[#121b28] border border-[#1e293b] rounded-[2.5rem] flex items-center justify-between hover:bg-[#1a2538] transition-all group relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/5 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="flex items-center gap-8 relative z-10">
                <div className="w-16 h-16 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Calendar size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <p className="text-lg font-bold text-white tracking-tight">
                      {new Date(s.start_date + "T12:00:00").toLocaleDateString('pt-BR')} — {s.days} {s.days === 1 ? 'dia' : 'dias'}
                    </p>
                    <span className="text-[9px] font-bold bg-rose-500/10 text-rose-500 px-2 py-1 rounded-lg border border-rose-500/10 uppercase tracking-widest">Efetivado</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-[500px]">
                    <span className="text-slate-600 font-bold uppercase text-[9px] tracking-widest mr-2">Motivo:</span> 
                    {s.reason}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
