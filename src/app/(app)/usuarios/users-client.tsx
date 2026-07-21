'use client';

import { useState, useTransition } from 'react';
import { createUser, toggleUserStatus, forcePasswordReset } from './actions';
import { logAudit } from '@/lib/audit';
import type { Profile } from '@/types/database';

export default function UsersClient({ initialUsers }: { initialUsers: Profile[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [setPasswordNow, setSetPasswordNow] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.full_name + u.email + (u.cargo ?? '') + (u.unidade ?? '')).toLowerCase().includes(q);
  });

  async function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await createUser(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        logAudit({
          acao: 'Criou',
          modulo: 'Usuários',
          itemAfetado: String(formData.get('email')),
          detalhes: setPasswordNow ? 'Usuário criado com senha definida pelo administrador' : 'Usuário convidado',
          resultado: 'Sucesso',
        });
        window.location.reload();
      }
    });
  }

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">Gerenciar Usuários</h1>
      <p className="text-muted-fg text-sm mb-5">Convide usuários corporativos e gerencie o acesso ao sistema.</p>

      <form action={handleSubmit} className="rounded-xl border border-border bg-card p-5 max-w-lg mb-6 flex flex-col gap-3">
        <h3 className="text-sm font-bold">Convidar novo usuário</h3>
        {error && (
          <div className="text-xs rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-destructive">
            {error}
          </div>
        )}
        <div>
          <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">Nome completo (opcional)</label>
          <input name="name" className="w-full rounded-lg border border-border bg-muted px-3 py-2 outline-none focus:border-primary" />
        </div>
        <div>
          <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">E-mail corporativo</label>
          <input name="email" type="email" required className="w-full rounded-lg border border-border bg-muted px-3 py-2 outline-none focus:border-primary" />
        </div>
        <div>
          <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">Nível de acesso</label>
          <select name="role" className="w-full rounded-lg border border-border bg-muted px-3 py-2 outline-none">
            <option value="user">Usuário</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input
            type="checkbox"
            name="setPasswordNow"
            checked={setPasswordNow}
            onChange={(e) => setSetPasswordNow(e.target.checked)}
            className="accent-primary"
          />
          Definir a senha agora (em vez do usuário criar no primeiro acesso)
        </label>
        {setPasswordNow && (
          <div>
            <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">Senha</label>
            <input name="password" type="password" className="w-full rounded-lg border border-border bg-muted px-3 py-2 outline-none focus:border-primary" />
          </div>
        )}
        <div className="text-[11px] text-muted-fg bg-muted rounded-lg px-3 py-2">
          {setPasswordNow
            ? 'A conta já é criada ativa, com essa senha — não passa pela tela de primeiro acesso.'
            : 'O usuário não receberá senha. No primeiro acesso, o sistema irá obrigá-lo a criar sua própria senha.'}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg py-2.5 font-mono-label text-xs font-bold disabled:opacity-60"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          {isPending ? 'criando…' : setPasswordNow ? 'criar usuário' : 'convidar usuário'}
        </button>
      </form>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, e-mail, cargo ou unidade..."
        className="w-full max-w-md rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary mb-4"
      />

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono-label text-[10.5px] text-muted-fg border-b border-border">
              <th className="p-3">Nome</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Perfil</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border">
                <td className="p-3 font-semibold">{u.full_name}</td>
                <td className="p-3 text-muted-fg text-xs">{u.email}</td>
                <td className="p-3">
                  <span className="font-mono-label text-[10.5px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                    {u.role === 'owner' ? 'Owner' : u.role === 'admin' ? 'Admin' : 'Usuário'}
                  </span>
                </td>
                <td className="p-3">
                  {u.must_change_password && (
                    <span className="font-mono-label text-[10px] px-2 py-0.5 rounded-full bg-amber/15 text-amber mr-1">
                      Aguardando senha
                    </span>
                  )}
                  {u.status === 'inactive' && (
                    <span className="font-mono-label text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                      Inativo
                    </span>
                  )}
                  {!u.must_change_password && u.status !== 'inactive' && (
                    <span className="font-mono-label text-[10px] px-2 py-0.5 rounded-full bg-green/15 text-green">Ativo</span>
                  )}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button
                    disabled={u.must_change_password}
                    onClick={() =>
                      startTransition(async () => {
                        await forcePasswordReset(u.id);
                        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, must_change_password: true } : x)));
                      })
                    }
                    className="text-xs rounded-lg border border-border px-2.5 py-1 mr-1.5 disabled:opacity-40 hover:bg-muted"
                  >
                    Forçar Troca
                  </button>
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await toggleUserStatus(u.id, u.status);
                        setUsers((prev) =>
                          prev.map((x) => (x.id === u.id ? { ...x, status: x.status === 'inactive' ? 'active' : 'inactive' } : x))
                        );
                      })
                    }
                    className="text-xs rounded-lg border border-border px-2.5 py-1 hover:bg-muted"
                  >
                    {u.status === 'inactive' ? 'Ativar' : 'Desativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
