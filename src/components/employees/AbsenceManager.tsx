"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Calendar, Trash2, ChevronDown, Pencil, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

const ABSENCE_TYPES = [
  "Falta Justificada",
  "Falta Injustificada",
  "Falta Abonada",
  "Falta Parcial",
  "Atraso",
  "Saída Antecipada",
  "Suspensão",
  "Afastamento"
];

const COMMON_REASONS = [
  "Não mencionado",
  "Atestado médico",
  "Consulta médica",
  "Atestado de comparecimento",
  "Acompanhamento de dependente",
  "Acompanhamento médico",
  "Falecimento familiar",
  "Casamento",
  "Nascimento de filho",
  "Problemas pessoais",
  "Transporte",
  "Acidente",
  "Convocação judicial",
  "Doação de sangue",
  "Alistamento militar",
  "Exame médico",
  "Internação",
  "Cirurgia",
  "Emergência familiar",
  "Convocação eleitoral",
  "Comparecimento em audiência",
  "Licença maternidade",
  "Licença paternidade",
  "Acidente de trabalho",
  "Acidente de trajeto",
  "Problemas climáticos graves",
  "Folga Compensatória",
  "Outros"
];

const TREATMENTS = ["Descontar", "Banco de horas"];

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  type: "Falta Injustificada",
  reason: "Não mencionado",
  treatment: "Descontar"
};

export function AbsenceManager({ employeeId }: { employeeId: number }) {
  const [absences, setAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customReason, setCustomReason] = useState("");

  // Estado de edição
  const [editingAbsence, setEditingAbsence] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editReasonOpen, setEditReasonOpen] = useState(false);
  const [editCustomReason, setEditCustomReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAbsences = async () => {
    const { data } = await supabase
      .from("absences")
      .select("*")
      .eq("employee_id", employeeId)
      .order("date", { ascending: false });
    if (data) setAbsences(data);
    setLoading(false);
  };

  useEffect(() => { fetchAbsences(); }, [employeeId]);

  const handleAdd = async () => {
    if (!form.date || !form.type) return;
    const finalReason = form.reason === "Outros" ? customReason : form.reason;
    const { error } = await supabase.from("absences").insert([{
      employee_id: employeeId,
      date: form.date,
      type: form.type,
      reason: finalReason || "Outros",
      treatment: form.treatment
    }]);
    if (!error) {
      setForm(EMPTY_FORM);
      setCustomReason("");
      setIsAdding(false);
      fetchAbsences();
    }
  };

  const deleteAbsence = async (id: number) => {
    await supabase.from("absences").delete().eq("id", id);
    fetchAbsences();
  };

  const openEdit = (abs: any) => {
    setEditingAbsence(abs);
    setEditForm({
      date: abs.date,
      type: abs.type,
      reason: abs.reason || "Não mencionado",
      treatment: abs.treatment || "Descontar"
    });
    setEditCustomReason("");
  };

  const handleSaveEdit = async () => {
    if (!editingAbsence) return;
    setSaving(true);
    const finalReason = editForm.reason === "Outros" ? editCustomReason : editForm.reason;
    await supabase.from("absences").update({
      date: editForm.date,
      type: editForm.type,
      reason: finalReason || editForm.reason,
      treatment: editForm.treatment
    }).eq("id", editingAbsence.id);
    await fetchAbsences();
    setEditingAbsence(null);
    setSaving(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display text-white tracking-tight">Histórico de Ausências</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Registros de Frequência e Pontualidade</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all flex items-center gap-3",
            isAdding
              ? "bg-white/5 text-slate-500 border border-white/5 hover:text-white"
              : "bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98]"
          )}
        >
          {isAdding ? "Cancelar" : <><Plus size={16} /> Registrar Ocorrência</>}
        </button>
      </div>

      {/* Formulário de Adição */}
      {isAdding && (
        <div className="flex flex-col xl:flex-row gap-px bg-[#1e293b] border border-[#1e293b] rounded-[2.5rem] overflow-hidden animate-in fade-in duration-500 shadow-2xl">
          <div className="flex-1 bg-[#121b28] p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 ml-1 block">Data do Evento</label>
                  <input
                    type="date"
                    className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-blue-500/50 transition-all font-semibold text-sm shadow-inner"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-6">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 ml-1 block">Classificação</label>
                  <div className="grid grid-cols-1 gap-2">
                    {ABSENCE_TYPES.map((type) => (
                      <button key={type} onClick={() => setForm({ ...form, type })}
                        className={cn("flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all border",
                          form.type === type ? "bg-blue-600/10 border-blue-500/40 text-blue-400 shadow-lg" : "bg-black/20 border-white/5 text-slate-600 hover:text-slate-400 hover:bg-black/30"
                        )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", form.type === type ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-slate-800")} />
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-12">
                <div className="space-y-6 relative">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 ml-1 block">Motivo / Causa Raiz</label>
                  <div className="relative">
                    <button onClick={() => setIsReasonOpen(!isReasonOpen)}
                      className={cn("w-full bg-black/20 border rounded-2xl px-6 py-5 text-left text-white focus:outline-none transition-all font-semibold text-xs flex items-center justify-between shadow-inner",
                        isReasonOpen ? "border-blue-500/50" : "border-white/5 hover:border-white/10"
                      )}>
                      <span className={cn(form.reason === "Não mencionado" ? "text-slate-700" : "text-white")}>{form.reason}</span>
                      <ChevronDown size={14} className={cn("text-slate-600 transition-transform duration-300", isReasonOpen && "rotate-180")} />
                    </button>
                    {isReasonOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsReasonOpen(false)} />
                        <div className="absolute left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="p-2 space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {COMMON_REASONS.map((r) => (
                              <button key={r} onClick={() => { setForm({ ...form, reason: r }); setIsReasonOpen(false); }}
                                className={cn("w-full text-left px-4 py-3.5 rounded-xl text-[12px] transition-all flex items-center justify-between",
                                  form.reason === r ? "bg-blue-600/20 text-blue-400 font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}>
                                {r}
                                {form.reason === r && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {form.reason === "Outros" && (
                    <input type="text" placeholder="Especifique o motivo..."
                      className="w-full bg-transparent border-b border-blue-500/30 py-3 text-white focus:outline-none focus:border-blue-500 transition-all font-semibold text-xs mt-4 animate-in slide-in-from-top-2"
                      value={customReason} onChange={(e) => setCustomReason(e.target.value)} autoFocus />
                  )}
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 ml-1 block">Ação Administrativa</label>
                  <div className="grid grid-cols-2 gap-4">
                    {TREATMENTS.map((t) => (
                      <button key={t} onClick={() => setForm({ ...form, treatment: t })}
                        className={cn("flex flex-col items-start gap-4 p-6 rounded-2xl border transition-all relative overflow-hidden",
                          form.treatment === t ? "bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5" : "bg-black/20 border-white/5 hover:border-white/10"
                        )}>
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", form.treatment === t ? "border-blue-500 bg-blue-500/20" : "border-slate-800")}>
                          {form.treatment === t && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", form.treatment === t ? "text-white" : "text-slate-600")}>{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleAdd}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] mt-4">
                  Confirmar Ocorrência
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Ausências */}
      {!isAdding && (
        <div className="bg-[#121b28] border border-[#1e293b] rounded-[2.5rem] overflow-hidden min-h-[440px] shadow-2xl">
          {loading ? (
            <div className="py-32 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-slate-600" />
            </div>
          ) : absences.length === 0 ? (
            <div className="py-40 flex flex-col items-center justify-center text-center px-10">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5 shadow-inner">
                <Calendar size={40} className="text-slate-800" />
              </div>
              <h4 className="text-white font-display text-xl mb-4 tracking-tight">Sem Histórico de Ausências</h4>
              <p className="text-slate-500 text-[12px] max-w-xs leading-relaxed font-medium">Este colaborador mantém uma frequência impecável. Nenhum registro de falta ou atraso foi encontrado.</p>
              <button onClick={() => setIsAdding(true)}
                className="mt-12 px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 hover:text-white hover:border-white/20 transition-all shadow-lg">
                Registrar Ocorrência Manual
              </button>
            </div>
          ) : (
            <div className="p-12">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
                <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Log de Ocorrências Auditadas</h3>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sincronizado</span>
                </div>
              </div>

              <div className="space-y-px">
                {absences.map((abs) => (
                  <div key={abs.id} className="group flex items-center gap-10 py-4 px-6 hover:bg-[#1a2538] transition-all rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="w-24 flex flex-col relative z-10">
                      <span className="text-[11px] font-mono text-blue-500/80 font-medium">
                        {new Date(abs.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </span>
                      <span className="text-[9px] text-slate-700 font-bold uppercase mt-1 tracking-widest">
                        {new Date(abs.date).toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center gap-8 relative z-10">
                      <div className={cn("w-1 h-5 rounded-full", abs.type.includes("Injustificada") || abs.type.includes("Suspensão") ? "bg-rose-500" : "bg-blue-500")} />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-slate-200 tracking-tight">{abs.type}</span>
                          <span className="text-[8px] font-bold bg-white/5 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-[0.1em] border border-white/5">{abs.treatment}</span>
                        </div>
                        <span className="text-[10px] text-slate-600 font-medium mt-1.5 uppercase tracking-widest">{abs.reason || "Não mencionado"}</span>
                      </div>
                    </div>

                    {/* Botões Editar / Deletar */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                      <button
                        onClick={() => openEdit(abs)}
                        className="p-2.5 text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteAbsence(abs.id)}
                        className="p-2.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Edição */}
      <AnimatePresence>
        {editingAbsence && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setEditingAbsence(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-[#121b28] border border-[#1e293b] rounded-[2rem] p-8 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-display text-white tracking-tight">Editar Ausência</h2>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Atualize os dados da ocorrência</p>
                  </div>
                  <button onClick={() => setEditingAbsence(null)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Coluna Esquerda */}
                  <div className="space-y-8">
                    {/* Data */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">Data do Evento</label>
                      <input type="date"
                        className="modal-input"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      />
                    </div>

                    {/* Tipo */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">Classificação</label>
                      <div className="space-y-1.5">
                        {ABSENCE_TYPES.map((type) => (
                          <button key={type} onClick={() => setEditForm({ ...editForm, type })}
                            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border",
                              editForm.type === type ? "bg-blue-600/10 border-blue-500/40 text-blue-400" : "bg-black/20 border-white/5 text-slate-600 hover:text-slate-400"
                            )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", editForm.type === type ? "bg-blue-500" : "bg-slate-800")} />
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Coluna Direita */}
                  <div className="space-y-8">
                    {/* Motivo */}
                    <div className="space-y-2 relative">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">Motivo</label>
                      <button onClick={() => setEditReasonOpen(!editReasonOpen)}
                        className={cn("w-full bg-[#05070a] border rounded-xl px-4 py-3 text-left text-sm flex items-center justify-between transition-all",
                          editReasonOpen ? "border-blue-500/50" : "border-[#1e293b] hover:border-white/10"
                        )}>
                        <span className={editForm.reason === "Não mencionado" ? "text-slate-600" : "text-white"}>{editForm.reason}</span>
                        <ChevronDown size={14} className={cn("text-slate-600 transition-transform", editReasonOpen && "rotate-180")} />
                      </button>
                      {editReasonOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setEditReasonOpen(false)} />
                          <div className="absolute left-0 right-0 mt-1 bg-[#1a2538] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                            <div className="p-2 space-y-0.5 max-h-[250px] overflow-y-auto custom-scrollbar">
                              {COMMON_REASONS.map((r) => (
                                <button key={r} onClick={() => { setEditForm({ ...editForm, reason: r }); setEditReasonOpen(false); }}
                                  className={cn("w-full text-left px-4 py-3 rounded-xl text-[12px] transition-all flex items-center justify-between",
                                    editForm.reason === r ? "bg-blue-600/20 text-blue-400 font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"
                                  )}>
                                  {r}
                                  {editForm.reason === r && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      {editForm.reason === "Outros" && (
                        <input type="text" placeholder="Especifique..."
                          className="modal-input mt-2"
                          value={editCustomReason} onChange={(e) => setEditCustomReason(e.target.value)} />
                      )}
                    </div>

                    {/* Tratamento */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">Ação Administrativa</label>
                      <div className="grid grid-cols-2 gap-3">
                        {TREATMENTS.map((t) => (
                          <button key={t} onClick={() => setEditForm({ ...editForm, treatment: t })}
                            className={cn("flex items-center gap-3 px-4 py-4 rounded-xl border transition-all",
                              editForm.treatment === t ? "bg-blue-600/10 border-blue-500/40 text-blue-400" : "bg-black/20 border-white/5 text-slate-600 hover:text-slate-400"
                            )}>
                            <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center",
                              editForm.treatment === t ? "border-blue-500" : "border-slate-700")}>
                              {editForm.treatment === t && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">{t}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões do Modal */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-white/5">
                  <button onClick={() => setEditingAbsence(null)}
                    className="flex-1 py-3 rounded-xl border border-white/5 text-slate-400 hover:text-white hover:bg-white/5 text-[11px] font-bold uppercase tracking-widest transition-all">
                    Cancelar
                  </button>
                  <button onClick={handleSaveEdit} disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
