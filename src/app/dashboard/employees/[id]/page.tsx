"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, 
  User, 
  Calendar, 
  MessageSquare, 
  AlertTriangle, 
  Award, 
  Briefcase,
  MapPin,
  Clock,
  Plus,
  Zap,
  X,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

import { AbsenceManager } from "@/components/employees/AbsenceManager"
import { ObservationManager } from "@/components/employees/ObservationManager"
import { SuspensionManager } from "@/components/employees/SuspensionManager"
import { SkillManager } from "@/components/employees/SkillManager"

type TabType = "resumo" | "absences" | "observations" | "suspensions" | "skills"

interface EmployeeProcess {
  id: number
  process_name: string
  description: string
  status: string
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [employee, setEmployee] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabType>("resumo")
  const [processes, setProcesses] = useState<EmployeeProcess[]>([])
  const [loadingProcesses, setLoadingProcesses] = useState(true)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [newProcess, setNewProcess] = useState({ process_name: "", status: "Ativo" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchEmployee() {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_id", params.id)
        .single()
      if (data) setEmployee(data)
    }
    fetchEmployee()
  }, [params.id])

  useEffect(() => {
    if (!params.id) return
    fetchProcesses()
  }, [params.id])

  async function fetchProcesses() {
    setLoadingProcesses(true)
    const { data } = await supabase
      .from("employee_processes")
      .select("id, process_name, description, status")
      .eq("employee_id", params.id)
      .order("process_name", { ascending: true })
    if (data) setProcesses(data)
    setLoadingProcesses(false)
  }

  async function handleAddProcess() {
    if (!newProcess.process_name.trim()) return
    setSaving(true)
    await supabase.from("employee_processes").insert({
      employee_id: Number(params.id),
      process_name: newProcess.process_name.trim(),
      status: newProcess.status,
    })
    await fetchProcesses()
    setNewProcess({ process_name: "", status: "Ativo" })
    setShowProcessModal(false)
    setSaving(false)
  }

  async function handleDeleteProcess(id: number) {
    await supabase.from("employee_processes").delete().eq("id", id)
    setProcesses(prev => prev.filter(p => p.id !== id))
  }

  if (!employee) return (
    <div className="p-20 text-center text-slate-500 font-medium italic animate-pulse">
      Carregando registro...
    </div>
  )

  const tabs = [
    { id: "resumo", label: "Resumo", icon: User },
    { id: "absences", label: "Faltas", icon: Calendar },
    { id: "suspensions", label: "Suspensões", icon: AlertTriangle },
    { id: "skills", label: "Habilidades", icon: Award },
    { id: "observations", label: "Observações", icon: MessageSquare },
  ]

  const statusColors: Record<string, string> = {
    "Ativo": "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    "Treinamento": "bg-blue-500/10 border-blue-500/20 text-blue-400",
    "Inativo": "bg-slate-500/10 border-white/10 text-slate-500",
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Header: Voltar + Card de Perfil */}
      <div className="flex flex-col gap-8">
        <button 
          onClick={() => router.push("/dashboard/employees")}
          className="flex items-center gap-3 text-slate-500 hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest group w-fit"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform text-blue-500" />
          Voltar para Listagem
        </button>

        <div className="pro-card p-10 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none" />
          
          <div className="w-32 h-32 rounded-[2.5rem] bg-[#1a2538] border border-white/10 flex items-center justify-center text-5xl font-display font-bold text-white shadow-2xl relative z-10 shadow-blue-500/10">
            {employee.name?.[0]}
          </div>
          <div className="flex-1 text-center md:text-left relative z-10">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-5">
              <h1 className="text-4xl font-display text-white tracking-tight">{employee.name}</h1>
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",
                employee.status?.toLowerCase() === 'ativo' 
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                  : "bg-rose-500/5 border-rose-500/20 text-rose-400"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", employee.status?.toLowerCase() === 'ativo' ? "bg-emerald-400" : "bg-rose-400")} />
                {employee.status}
              </div>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-8 text-slate-400">
              <Meta icon={Briefcase} value={employee.job_title} />
              <Meta icon={MapPin} value={employee.company} />
              <Meta icon={Clock} value={employee.Shift} />
            </div>
          </div>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#121b28] border border-[#1e293b] rounded-[24px] w-fit shadow-xl shadow-black/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-[18px] text-[10px] font-bold uppercase tracking-wider transition-all",
              activeTab === tab.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                : "text-slate-500 hover:text-white hover:bg-white/5"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Área de Conteúdo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="pro-card p-12 min-h-[520px]"
        >
          {/* ── ABA RESUMO ── */}
          {activeTab === "resumo" && (
            <div className="space-y-14">
              {/* Dados Contratuais */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-10 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                  Dados Contratuais e Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                  <InfoField label="Matrícula" value={`#${employee.employee_id}`} isMono />
                  <InfoField label="Data de Admissão" value={employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('pt-BR') : '—'} />
                  <InfoField label="Gênero / Sexo" value={employee.sex || "Não informado"} />
                  <InfoField label="Data de Nascimento" value={employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('pt-BR') : "—"} />
                </div>
              </div>

              {/* Divisor */}
              <div className="border-t border-white/5" />

              {/* Processos Operacionais */}
              <div>
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                    Processos Operacionais
                    <span className="text-slate-700 font-normal">({processes.length})</span>
                  </h3>
                  <button
                    onClick={() => setShowProcessModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group"
                  >
                    <Plus size={14} className="text-slate-400 group-hover:text-white" />
                    <span className="text-[9px] font-bold text-slate-400 group-hover:text-white uppercase tracking-widest">Vincular</span>
                  </button>
                </div>

                {loadingProcesses ? (
                  <div className="flex items-center gap-3 text-slate-600 text-sm animate-pulse">
                    <Loader2 size={16} className="animate-spin" />
                    Carregando processos...
                  </div>
                ) : processes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-20 gap-3">
                    <Zap size={36} className="text-slate-500" />
                    <p className="text-[11px] text-slate-500 uppercase tracking-widest">Nenhum processo vinculado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {processes.map((proc) => (
                      <div
                        key={proc.id}
                        className="p-5 bg-[#05070a]/60 border border-white/5 rounded-2xl flex items-center justify-between gap-4 group hover:border-blue-500/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                            <Zap size={18} />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-white leading-tight">{proc.process_name}</p>
                            <span className={cn(
                              "text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest mt-1.5 inline-block",
                              statusColors[proc.status] ?? statusColors["Inativo"]
                            )}>
                              {proc.status}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteProcess(proc.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-600 hover:text-rose-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "absences" && <AbsenceManager employeeId={employee.employee_id} />}
          {activeTab === "suspensions" && <SuspensionManager employeeId={employee.employee_id} />}
          {activeTab === "skills" && <SkillManager employeeId={employee.employee_id} />}
          {activeTab === "observations" && <ObservationManager employeeId={employee.employee_id} />}
        </motion.div>
      </AnimatePresence>

      {/* Modal: Vincular Processo */}
      <AnimatePresence>
        {showProcessModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowProcessModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="bg-[#121b28] border border-[#1e293b] rounded-[2rem] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-display text-white tracking-tight">Vincular Processo</h2>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Novo processo para este colaborador</p>
                  </div>
                  <button onClick={() => setShowProcessModal(false)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nome do Processo</label>
                    <input
                      type="text"
                      placeholder="Ex: Picking, Recebimento, Expedição..."
                      className="w-full bg-[#05070a] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 transition-all"
                      value={newProcess.process_name}
                      onChange={(e) => setNewProcess(prev => ({ ...prev, process_name: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleAddProcess()}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
                    <select
                      className="w-full bg-[#05070a] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                      value={newProcess.status}
                      onChange={(e) => setNewProcess(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option>Ativo</option>
                      <option>Treinamento</option>
                      <option>Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setShowProcessModal(false)}
                    className="flex-1 py-3 rounded-xl border border-white/5 text-slate-400 hover:text-white hover:bg-white/5 text-[11px] font-bold uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddProcess}
                    disabled={saving || !newProcess.process_name.trim()}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {saving ? "Salvando..." : "Vincular"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function Meta({ icon: Icon, value }: any) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={16} className="text-blue-500/40" />
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{value}</span>
    </div>
  )
}

function InfoField({ label, value, isMono }: any) {
  return (
    <div className="space-y-3 group">
      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-600 group-hover:text-slate-400 transition-colors">{label}</p>
      <p className={cn(
        "text-xl font-semibold text-white tracking-tight",
        isMono && "font-mono text-blue-400"
      )}>{value}</p>
    </div>
  )
}
