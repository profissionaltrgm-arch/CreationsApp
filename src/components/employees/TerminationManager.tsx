"use client"

import React, { useState } from "react"
import { supabase } from "@/lib/supabase"
import { UserX, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function TerminationManager({ employeeId, employeeName, onStatusChange }: { 
  employeeId: number, 
  employeeName: string,
  onStatusChange: () => void 
}) {
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [type, setType] = useState<'voluntary' | 'involuntary'>('involuntary')
  const [reason, setReason] = useState("")
  const [confirmed, setConfirmed] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) return
    
    setLoading(true)
    
    // 1. Insert into terminations
    const { error: termError } = await supabase
      .from("terminations")
      .insert([{
        employee_id: employeeId,
        termination_date: date,
        type,
        reason,
        rehire_eligible: true
      }])

    if (termError) {
      setLoading(false)
      return
    }

    // 2. Update employee status
    const { error: empError } = await supabase
      .from("employees")
      .update({ status: "Desligado" })
      .eq("employee_id", employeeId)

    setLoading(false)
    if (!empError) {
      onStatusChange()
      alert("Colaborador desligado com sucesso.")
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 animate-in fade-in duration-700">
      <div className="text-center mb-12">
        <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-rose-500/20 shadow-2xl shadow-rose-600/10">
          <UserX size={48} />
        </div>
        <h3 className="text-3xl font-display text-white tracking-tighter uppercase">Desligamento de Colaborador</h3>
        <p className="text-slate-500 font-bold text-[10px] mt-4 uppercase tracking-[0.3em]">
          Iniciando processo para: <span className="text-white">{employeeName}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/5 rounded-[3rem] p-12 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[100px] -mr-32 -mt-32" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 ml-1">Data de Desligamento</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-black/20 text-sm font-bold outline-none focus:border-rose-500/50 transition-all text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 ml-1">Tipo de Rescisão</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-black/20 text-sm font-bold outline-none focus:border-rose-500/50 transition-all text-white cursor-pointer"
            >
              <option value="involuntary">Involuntária (Demissão)</option>
              <option value="voluntary">Voluntária (Pedido)</option>
            </select>
          </div>
        </div>

        <div className="relative z-10 space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 ml-1">Motivo Detalhado</label>
          <textarea 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo do desligamento detalhadamente..."
            className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-black/20 text-sm font-medium outline-none min-h-[140px] focus:border-rose-500/50 transition-all text-white resize-none placeholder:text-slate-700"
            required
          />
        </div>

        <div className="relative z-10 p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex gap-4">
          <AlertTriangle className="text-rose-600 shrink-0" size={24} />
          <div className="space-y-3">
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Aviso de Segurança</p>
            <p className="text-xs text-rose-400/80 font-medium leading-relaxed">
              Esta ação alterará o status do colaborador para <span className="text-white font-bold">DESLIGADO</span>. Ele será removido imediatamente de todas as listagens ativas do G300.
            </p>
            <label className="flex items-center gap-3 cursor-pointer mt-4 group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-white/10 bg-black/40 text-rose-600 focus:ring-rose-500/50 focus:ring-offset-0 transition-all cursor-pointer"
                />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-rose-400 transition-colors">Estou ciente e desejo prosseguir</span>
            </label>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={!confirmed || loading}
          className={cn(
            "relative z-10 w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-2xl",
            confirmed && !loading 
              ? "bg-rose-600 text-white shadow-rose-600/30 hover:bg-rose-500" 
              : "bg-white/5 text-slate-700 border border-white/5 cursor-not-allowed"
          )}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              Finalizar Desligamento
              <UserX size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
