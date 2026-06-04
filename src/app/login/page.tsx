"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Lock, 
  AtSign, 
  LogIn,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Credenciais inválidas. Verifique seu acesso.");
      setLoading(false);
    } else {
      router.push("/dashboard/validacoes");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#05070a] font-inter relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Back Button */}
      <button 
        onClick={() => router.push("/dashboard/validacoes")}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest bg-white/[0.02] border border-white/5 hover:border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md"
      >
        <ArrowLeft size={14} /> Voltar ao Painel
      </button>

      <div className="w-full max-w-[440px] relative animate-in zoom-in-95 duration-500">
        {/* Card Oil/Dark Premium */}
        <div className="bg-[#0B0E14]/90 border border-white/5 rounded-[2.5rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-xl">
          {/* Logo/Icon Header */}
          <div className="mb-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20 border border-blue-500/20">
              <Lock size={26} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Área Restrita
            </h2>
            <p className="text-slate-500 text-xs font-medium max-w-[280px] mx-auto leading-relaxed">
              Faça login para gerenciar dados, liberar cadastros e permissões de escrita.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* E-mail */}
            <div className="space-y-2">
              <label className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">
                E-mail Corporativo
              </label>
              <div className="relative group">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@g300.com.br"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/5 bg-[#121620]/60 text-sm outline-none focus:border-blue-500/30 transition-all text-white placeholder:text-slate-700 font-medium shadow-inner"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <label className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">
                Senha de Acesso
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-white/5 bg-[#121620]/60 text-sm outline-none focus:border-blue-500/30 transition-all text-white placeholder:text-slate-700 font-medium shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 animate-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse shrink-0" />
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-4 rounded-2xl text-[11px] font-bold uppercase tracking-[0.15em] text-white flex items-center justify-center gap-2.5 transition-all shadow-xl mt-2",
                loading 
                  ? "bg-slate-800 cursor-not-allowed opacity-50" 
                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 active:scale-[0.99]"
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  Acessar Painel
                  <LogIn size={16} />
                </>
              )}
            </button>
          </form>

          {/* Public Access Link */}
          <div className="mt-6 text-center">
            <button 
              onClick={() => router.push("/dashboard/validacoes")}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors"
            >
              Continuar em modo de leitura
            </button>
          </div>

          {/* Footer inside card */}
          <div className="mt-8 text-center border-t border-white/[0.04] pt-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-700">
              G300 • Security Protocol
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
