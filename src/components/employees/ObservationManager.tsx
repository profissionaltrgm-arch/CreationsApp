"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, MessageSquare, Trash2, User } from "lucide-react"
import { cn } from "@/lib/utils"

type Observation = {
  id: number
  content: string
  created_by: string
  created_at: string
}

export function ObservationManager({ employeeId }: { employeeId: number }) {
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [content, setContent] = useState("")

  useEffect(() => {
    fetchObservations()
  }, [employeeId])

  async function fetchObservations() {
    const { data, error } = await supabase
      .from("observations")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })

    if (data) setObservations(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    const { error } = await supabase
      .from("observations")
      .insert([{
        employee_id: employeeId,
        content,
        created_by: "Admin" // Simplified for now
      }])

    if (!error) {
      setIsAdding(false)
      setContent("")
      fetchObservations()
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remover esta observação?")) return
    const { error } = await supabase
      .from("observations")
      .delete()
      .eq("id", id)

    if (!error) fetchObservations()
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display text-white mb-2 tracking-tight">Observações Internas</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Registros Administrativos de Acompanhamento</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all active:scale-[0.98]",
            isAdding 
              ? "bg-white/5 text-slate-500 border border-white/5 hover:text-white" 
              : "bg-blue-600 text-white shadow-xl shadow-blue-500/20"
          )}
        >
          {isAdding ? "Cancelar" : <><Plus size={16} /> Nova Observação</>}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-10 bg-[#121b28] border border-[#1e293b] rounded-[2.5rem] space-y-8 animate-in fade-in shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 ml-1">Conteúdo da Observação</label>
            <textarea 
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva aqui informações relevantes para o prontuário do colaborador..."
              className="w-full px-7 py-6 rounded-[2rem] border border-white/5 bg-black/20 text-sm font-medium outline-none focus:border-blue-500/50 transition-all text-white min-h-[180px] resize-none placeholder:text-slate-800 shadow-inner"
              required
            />
          </div>
          <button type="submit" className="relative z-10 w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]">
            Efetivar Registro de Observação
          </button>
        </form>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="py-24 text-center text-slate-600 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizando Registros...</div>
        ) : observations.length === 0 ? (
          <div className="py-24 border border-dashed border-white/5 rounded-[40px] text-center bg-white/[0.01]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5">
              <MessageSquare size={32} className="text-slate-800" />
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Sem observações registradas</p>
          </div>
        ) : (
          observations.map((obs) => (
            <div key={obs.id} className="p-10 bg-[#121b28] border border-[#1e293b] rounded-[2.5rem] hover:bg-[#1a2538] transition-all relative group overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[120px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="flex flex-wrap items-center justify-between gap-6 mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg">
                    <User size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 block mb-0.5">Autorizado por:</span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{obs.created_by}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                  <span className="text-[10px] font-bold text-slate-500">
                    {new Date(obs.created_at).toLocaleDateString('pt-BR')} • {new Date(obs.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              
              <div className="relative z-10 pl-6 border-l-2 border-blue-500/30">
                <p className="text-[14px] font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {obs.content}
                </p>
              </div>

              <button 
                onClick={() => handleDelete(obs.id)}
                className="absolute top-6 right-8 p-3 text-slate-500 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-xl flex items-center gap-2"
              >
                <Trash2 size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">Excluir</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
