'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logAudit } from '@/lib/audit';
import type { Profile } from '@/types/database';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', roles: ['user', 'admin', 'owner'] },
  { label: 'Checklists', href: '/checklists', roles: ['user', 'admin', 'owner'] },
  { label: 'Capas de Malote', href: '/capas', roles: ['user', 'admin', 'owner'] },
  { label: 'Relatórios', href: '/relatorios', roles: ['user', 'admin', 'owner'] },
  { label: 'Usuários', href: '/usuarios', roles: ['admin', 'owner'] },
  { label: 'Configurações', href: '/admin', roles: ['admin', 'owner'] },
  { label: 'Central de Auditoria', href: '/audit', roles: ['owner'] },
];

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const role = profile?.role ?? 'user';

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Lê o tema já aplicado pelo script inline em layout.tsx (evita "piscar").
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('rdc-theme', next);
    } catch {
      // localStorage indisponível (modo privado, etc.) — tema só não persiste entre sessões.
    }
  }

  async function handleLogout() {
    logAudit({
      acao: 'Logout realizado',
      modulo: 'Autenticação',
      itemAfetado: profile?.email ?? '',
      detalhes: 'Logout',
      resultado: 'Sucesso',
    });
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-60 flex flex-col border-r border-border bg-card relative z-10 flex-shrink-0">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg border border-primary text-primary flex items-center justify-center shadow-[0_0_16px_rgba(23,233,182,0.3)]">
          <TerminalIcon />
        </div>
        <span className="font-display font-bold">RDChecklist</span>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 mx-2 my-0.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary/15 text-primary border border-primary/25'
                  : 'text-muted-fg hover:bg-muted hover:text-fg'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-fg hover:bg-muted hover:text-fg mb-1"
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
        </button>
        {['admin', 'owner'].includes(role) && (
          <Link
            href="/historico"
            className="block px-3 py-2 rounded-lg text-sm text-muted-fg hover:bg-muted hover:text-fg mb-1"
          >
            Histórico de Registros
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-fg hover:bg-muted hover:text-fg"
        >
          Sair
        </button>
        <div className="mt-2 p-2.5 bg-muted rounded-lg flex gap-2 items-center">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-fg flex items-center justify-center text-xs font-bold flex-shrink-0">
            {(profile?.full_name ?? profile?.email ?? '?')[0]?.toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold truncate">{profile?.full_name ?? '—'}</div>
            <div className="font-mono text-[10.5px] text-muted-fg truncate">{profile?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TerminalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3" />
      <path d="M13 15h4" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
  );
}
