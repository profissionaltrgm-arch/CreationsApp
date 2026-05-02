"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, Award, Trash2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Skill = {
  id: number
  skill_name: string
  level: 'basic' | 'intermediate' | 'advanced'
  certified: boolean
  created_at: string
}

export function SkillManager({ employeeId }: { employeeId: number }) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  
  // Form state
  const [skillName, setSkillName] = useState("")
  const [level, setLevel] = useState<'basic' | 'intermediate' | 'advanced'>('basic')
  const [certified, setCertified] = useState(false)

  useEffect(() => {
    fetchSkills()
  }, [employeeId])

  async function fetchSkills() {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })

    if (data) setSkills(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!skillName.trim()) return

    const { error } = await supabase
      .from("skills")
      .insert([{
        employee_id: employeeId,
        skill_name: skillName,
        level,
        certified
      }])

    if (!error) {
      setIsAdding(false)
      setSkillName("")
      fetchSkills()
    }
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display text-white mb-2 tracking-tight">Habilidades e Certificações</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Qualificações Técnicas Auditadas</p>
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
          {isAdding ? "Cancelar" : <><Plus size={16} /> Adicionar Qualificação</>}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-10 bg-[#121b28] border border-[#1e293b] rounded-[2.5rem] space-y-8 animate-in fade-in shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Nome da Competência</label>
              <input 
                type="text" 
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="Ex: Operador de Empilhadeira N3"
                className="w-full px-6 py-4.5 rounded-2xl border border-white/5 bg-black/20 text-sm font-semibold outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-slate-800 shadow-inner"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Nível de Proficiência</label>
              <div className="grid grid-cols-3 gap-2">
                {['basic', 'intermediate', 'advanced'].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv as any)}
                    className={cn(
                      "py-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                      level === lv 
                        ? "bg-blue-600/10 border-blue-500/40 text-blue-400 shadow-lg" 
                        : "bg-black/20 border-white/5 text-slate-600 hover:text-slate-400"
                    )}
                  >
                    {lv === 'basic' ? 'Básico' : lv === 'intermediate' ? 'Médio' : 'Pro'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 relative z-10 bg-black/20 p-5 rounded-2xl border border-white/5 shadow-inner">
            <div 
              onClick={() => setCertified(!certified)}
              className={cn(
                "w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer transition-all",
                certified ? "bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]" : "bg-slate-900 border-white/10"
              )}
            >
              {certified && <CheckCircle2 size={14} className="text-white" />}
            </div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] cursor-pointer select-none">Possui Certificação / Diploma Formal</label>
          </div>
          
          <button type="submit" className="relative z-10 w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]">
            Vincular Competência
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full py-24 text-center text-slate-600 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Consultando Matriz de Versatilidade...</div>
        ) : skills.length === 0 ? (
          <div className="col-span-full py-24 border border-dashed border-white/5 rounded-[40px] text-center bg-white/[0.01]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5">
              <Award size={32} className="text-slate-800" />
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Sem competências registradas</p>
          </div>
        ) : (
          skills.map((skill) => (
            <div key={skill.id} className="p-8 bg-[#121b28] border border-[#1e293b] rounded-[2.5rem] flex items-center justify-between hover:bg-[#1a2538] transition-all group relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-2xl flex items-center justify-center relative shadow-lg group-hover:scale-110 transition-transform">
                  <Award size={28} />
                  {skill.certified && (
                    <div className="absolute -top-2 -right-2 bg-blue-600 rounded-full p-1 border-2 border-[#121b28] shadow-xl">
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-lg font-bold text-white tracking-tight mb-3">{skill.skill_name}</p>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg border",
                      skill.level === 'advanced' 
                        ? "bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-lg" 
                        : "bg-white/[0.02] text-slate-500 border-white/10"
                    )}>
                      {skill.level === 'basic' ? 'Nível Básico' : skill.level === 'intermediate' ? 'Nível Médio' : 'Nível Avançado'}
                    </span>
                    {skill.certified && <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/10">Certificado</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
