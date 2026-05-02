"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Lock, 
  X, 
  AtSign, 
  LogIn 
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
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#05070a] font-inter">
      <div className="w-full max-w-[460px] relative animate-in zoom-in-95 duration-700">
        {/* Glow Effect Background */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Card Petroleum Luxe */}
        <div className="bg-[#121b28] border border-[#1e293b] rounded-[2.5rem] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
          {/* Logo/Icon Header */}
          <div className="mb-12">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-8 shadow-xl shadow-blue-600/20">
              <Lock size={32} className="text-white" />
            </div>
            <h2 className="text-4xl font-display font-bold text-white mb-3 tracking-tight">
              Área Restrita
            </h2>
            <p className="text-slate-500 text-sm font-medium">Autenticação obrigatória para acesso ao painel administrativo.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            {/* E-mail */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">
                E-mail Corporativo
              </label>
              <div className="relative group">
                <AtSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@g300.com.br"
                  className="w-full pl-14 pr-6 py-4.5 rounded-2xl border border-white/5 bg-black/20 text-sm outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-slate-700 font-medium shadow-inner"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">
                Senha de Acesso
              </label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-14 pr-14 py-4.5 rounded-2xl border border-white/5 bg-black/20 text-sm outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-slate-700 font-medium shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-3 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[11px] font-bold text-rose-400 animate-in slide-in-from-top-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse" />
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-5 rounded-2xl text-[13px] font-bold uppercase tracking-[0.1em] text-white flex items-center justify-center gap-3 transition-all shadow-xl mt-4",
                loading 
                  ? "bg-slate-800 cursor-not-allowed opacity-50" 
                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 active:scale-[0.98]"
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <div className="flex items-center gap-3">
                  Acessar Painel
                  <LogIn size={20} />
                </div>
              )}
            </button>
          </form>

          {/* Footer inside card */}
          <div className="mt-16 text-center border-t border-white/5 pt-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-700">
              Security Protocol G300-ADM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
