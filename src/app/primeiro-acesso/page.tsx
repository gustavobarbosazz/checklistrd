'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logAudit } from '@/lib/audit';

function pwChecks(pw: string) {
  return { len: pw.length >= 8, upper: /[A-Z]/.test(pw), num: /[0-9]/.test(pw) };
}

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const c = pwChecks(pw1);
  const match = pw1.length > 0 && pw1 === pw2;
  const canSubmit = c.len && c.upper && c.num && match && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push('/login');
      return;
    }

    await supabase.auth.updateUser({ password: pw1 });
    await supabase
      .from('profiles')
      .update({ must_change_password: false, password_created: true })
      .eq('id', userData.user.id);

    logAudit({
      acao: 'Criou senha no primeiro acesso',
      modulo: 'Autenticação',
      itemAfetado: userData.user.email ?? '',
      valorAnterior: 'Sem senha',
      valorNovo: 'Senha criada',
      detalhes: 'Senha criada com sucesso',
      resultado: 'Sucesso',
    });

    setSuccess(true);
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 2500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="terminal-bg" />
      <div className="scanline" />

      {success ? (
        <div className="relative z-10 w-full max-w-[400px] rounded-xl border border-border bg-card p-7 text-center">
          <div className="w-14 h-14 rounded-full border border-green bg-green/10 text-green flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(43,226,140,0.4)]">
            <CheckIcon size={28} />
          </div>
          <h1 className="font-display text-xl font-bold mb-1">Senha criada com sucesso!</h1>
          <p className="text-muted-fg text-sm">Redirecionando para o sistema...</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="relative z-10 w-full max-w-[420px] rounded-xl border border-border bg-card p-7"
        >
          <div className="w-13 h-13 rounded-full border border-primary bg-accent text-primary flex items-center justify-center mx-auto mb-4 shadow-[0_0_22px_rgba(23,233,182,0.35)]">
            <ShieldIcon />
          </div>
          <h1 className="font-display text-xl font-bold text-center mb-1">
            Crie sua senha de acesso
          </h1>
          <p className="text-muted-fg text-sm text-center mb-5">
            Este é seu primeiro acesso ao RDChecklist.
          </p>

          <div className="mb-3">
            <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">
              Nova senha
            </label>
            <input
              type="password"
              required
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="mb-4">
            <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">
              Confirmar senha
            </label>
            <input
              type="password"
              required
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="font-mono text-[11px] flex flex-col gap-1 mb-5 text-muted-fg">
            <Check label="mínimo de 8 caracteres" ok={c.len} />
            <Check label="pelo menos 1 letra maiúscula" ok={c.upper} />
            <Check label="pelo menos 1 número" ok={c.num} />
            <Check label="senhas coincidem" ok={match} />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg py-3 font-mono-label text-[12.5px] font-bold disabled:opacity-50"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            criar senha e continuar
          </button>
        </form>
      )}
    </div>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex gap-2 items-center ${ok ? 'text-green' : ''}`}>
      <CheckIcon size={14} />
      {label}
    </div>
  );
}
function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" /><path d="M12 16h.01" />
    </svg>
  );
}
