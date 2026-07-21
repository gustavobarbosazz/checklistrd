'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logAudit } from '@/lib/audit';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessionId] = useState(() => Math.random().toString(16).slice(2, 8).toUpperCase());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setLoading(false);
      setError('E-mail ou senha incorretos. Tente novamente.');
      logAudit({
        acao: 'Login',
        modulo: 'Autenticação',
        itemAfetado: email,
        detalhes: 'Tentativa de login falhou',
        resultado: 'Falha',
      });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('status, must_change_password')
      .eq('id', data.user.id)
      .single();

    if (profile?.status === 'inactive') {
      setLoading(false);
      setError('Usuário inativo. Contate um administrador.');
      await supabase.auth.signOut();
      return;
    }

    setLoading(false);
    setSuccess(true);
    logAudit({
      acao: 'Login',
      modulo: 'Autenticação',
      itemAfetado: email,
      detalhes: 'Login realizado com sucesso',
      resultado: 'Sucesso',
    });

    setTimeout(() => {
      router.push(profile?.must_change_password ? '/primeiro-acesso' : '/');
      router.refresh();
    }, 260);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="terminal-bg" />
      <div className="scanline" />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-[420px] rounded-xl border border-border bg-card p-7 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-lg border border-primary text-primary flex items-center justify-center shadow-[0_0_22px_rgba(23,233,182,0.35)]">
            <TerminalIcon />
          </div>
          <span className="font-mono-label text-[11.5px] text-primary font-bold">
            SISTEMA DE MALOTES
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold mb-1">Acesso ao RDChecklist</h1>
        <p className="font-mono-label normal-case text-[11.5px] text-primary mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
          terminal seguro · protocolo criptografado
        </p>

        {error && (
          <div className="font-mono text-xs mb-4 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-destructive">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">
            E-mail institucional
          </label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@instituicao.gov.br"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mb-3">
          <label className="flex justify-between items-center mb-1.5">
            <span className="font-mono-label text-[11px] text-muted-fg">Senha</span>
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="font-mono-label text-[11px] text-primary font-bold"
            >
              {showPw ? 'ocultar' : 'ver'}
            </button>
          </label>
          <input
            type={showPw ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex justify-end mb-5">
          <a href="/forgot-password" className="font-mono-label text-[11.5px] text-primary font-bold">
            esqueci a senha
          </a>
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="w-full rounded-lg py-3 font-mono-label text-[12.5px] font-bold transition disabled:opacity-70"
          style={{
            background: success ? 'var(--green)' : 'var(--primary)',
            color: 'var(--primary-fg)',
            boxShadow: '0 0 22px rgba(23,233,182,0.35)',
          }}
        >
          {success ? '✓ acesso autorizado!' : loading ? 'verificando…' : error ? 'tentar novamente' : 'entrar no sistema'}
        </button>

        <div className="font-mono-label normal-case flex justify-between items-center mt-5 pt-4 border-t border-border text-[10.5px] text-muted-fg">
          <span>ID SESSÃO: {sessionId}</span>
          <span className="flex items-center gap-1.5 text-green">
            <span className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_6px_var(--green)]" />
            ONLINE
          </span>
        </div>
      </form>
    </div>
  );
}

function TerminalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3" />
      <path d="M13 15h4" />
    </svg>
  );
}
