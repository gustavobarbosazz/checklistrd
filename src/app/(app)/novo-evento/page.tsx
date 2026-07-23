'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logAudit } from '@/lib/audit';
import { ROLE_TIERS, andarLabel, defaultItemsFor } from '@/lib/roleCatalog';
import { UNIDADES, getUnidade } from '@/lib/unidades';

type Selected = Record<string, boolean>; // key: `${role}|${andar}`

function roleKey(role: string, andar: string) {
  return `${role}|${andar}`;
}

export default function NovoEventoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [selected, setSelected] = useState<Selected>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const unidade = getUnidade(unidadeId);

  const selectedList = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => {
      const [role, andar] = k.split('|');
      return { role, andar };
    });

  function toggle(role: string, andar: string) {
    const key = roleKey(role, andar);
    setSelected((s) => ({ ...s, [key]: !s[key] }));
  }

  function selectAll() {
    const all: Selected = {};
    ROLE_TIERS.forEach((tier) => {
      tier.roles.forEach((role) => {
        if (tier.hasAndar) {
          (unidade?.andares ?? []).forEach((a) => (all[roleKey(role, a)] = true));
        } else {
          all[roleKey(role, 'geral')] = true;
        }
      });
    });
    setSelected(all);
  }

  async function handleGenerate() {
    if (!name || !date || !unidadeId) {
      setError('Preencha os dados do evento e selecione a unidade.');
      setStep(1);
      return;
    }
    if (selectedList.length === 0) {
      setError('Selecione ao menos um cargo.');
      setStep(2);
      return;
    }
    setSaving(true);
    setError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name,
        date,
        location: unidade?.nome ?? '',
        coordinator_email: coordinatorEmail || null,
        status: 'planning',
        created_by: user?.id,
      })
      .select()
      .single();

    if (eventError || !event) {
      setSaving(false);
      setError('Erro ao criar evento: ' + (eventError?.message ?? 'desconhecido'));
      return;
    }

    for (const { role, andar } of selectedList) {
      const category = andar === 'geral' ? 'geral' : 'por_andar';
      const maloteName = category === 'por_andar' ? `${role} - ${andarLabel(andar)}` : role;
      const items = defaultItemsFor(role);

      const { data: malote, error: maloteError } = await supabase
        .from('malotes')
        .insert({
          event_id: event.id,
          name: maloteName,
          tipo: role,
          category,
          andar,
          total_items: items.length,
          created_by: user?.id,
        })
        .select()
        .single();

      if (maloteError || !malote) continue;

      await supabase.from('malote_items').insert(
        items.map((itemName) => ({
          malote_id: malote.id,
          name: itemName,
          quantity: '1',
          created_by: user?.id,
        }))
      );
    }

    logAudit({
      acao: 'Criou',
      modulo: 'Eventos',
      itemAfetado: name,
      detalhes: `Evento criado com ${selectedList.length} malote(s) na ${unidade?.nome}`,
      resultado: 'Sucesso',
    });

    router.push(`/evento/${event.id}`);
    router.refresh();
  }

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-1">Novo Evento</h1>
      <p className="text-muted-fg text-sm mb-6">Crie um evento em 3 etapas.</p>

      <Stepper step={step} />

      <div className="rounded-xl border border-border bg-card p-6 mt-5">
        {error && (
          <div className="font-mono text-xs mb-4 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-destructive">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Field label="Nome do evento" value={name} onChange={setName} placeholder="Ex: Aplicação de Provas — Concurso 2026.2" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Data" type="date" value={date} onChange={setDate} />
              <div>
                <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">Unidade</label>
                <select
                  value={unidadeId}
                  onChange={(e) => {
                    setUnidadeId(e.target.value);
                    setSelected({}); // troca de unidade reseta a seleção de cargos/andares
                  }}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary"
                >
                  <option value="">Selecione a unidade...</option>
                  {UNIDADES.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Field label="E-mail do coordenador" type="email" value={coordinatorEmail} onChange={setCoordinatorEmail} />
            {unidade && (
              <div className="text-xs text-muted-fg bg-muted rounded-lg px-3 py-2">
                Andares disponíveis nessa unidade: {unidade.andares.map(andarLabel).join(', ')}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            {!unidade ? (
              <div className="text-sm text-amber bg-amber/10 border border-amber/30 rounded-lg p-3">
                Volte à etapa 1 e selecione a unidade antes de escolher os cargos por andar.
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold">{selectedList.length} malote(s) selecionado(s)</span>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs rounded-lg border border-border px-3 py-1.5 hover:bg-muted">
                      Selecionar todos
                    </button>
                    <button onClick={() => setSelected({})} className="text-xs rounded-lg border border-border px-3 py-1.5 hover:bg-muted">
                      Limpar seleção
                    </button>
                  </div>
                </div>

                {ROLE_TIERS.map((tier) => (
                  <div key={tier.title} className="mb-5">
                    <div className="font-mono-label text-[11px] text-muted-fg mb-2">{tier.title}</div>
                    {!tier.hasAndar ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {tier.roles.map((role) => (
                          <Checkbox
                            key={role}
                            checked={!!selected[roleKey(role, 'geral')]}
                            onChange={() => toggle(role, 'geral')}
                            label={role}
                          />
                        ))}
                      </div>
                    ) : (
                      tier.roles.map((role) => (
                        <div key={role} className="mb-3">
                          <div className="text-xs font-semibold mb-1.5">{role}</div>
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                            {unidade.andares.map((andar) => (
                              <Checkbox
                                key={andar}
                                checked={!!selected[roleKey(role, andar)]}
                                onChange={() => toggle(role, andar)}
                                label={andarLabel(andar)}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
              <div><div className="font-mono-label text-[11px] text-muted-fg">Nome</div>{name || '—'}</div>
              <div><div className="font-mono-label text-[11px] text-muted-fg">Data</div>{date || '—'}</div>
              <div><div className="font-mono-label text-[11px] text-muted-fg">Unidade</div>{unidade?.nome || '—'}</div>
              <div><div className="font-mono-label text-[11px] text-muted-fg">Coordenador</div>{coordinatorEmail || '—'}</div>
            </div>
            <div className="font-mono-label text-[11px] text-muted-fg mb-2">Malotes a gerar ({selectedList.length})</div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-mono-label text-[10.5px] text-muted-fg border-b border-border">
                    <th className="p-2">Cargo</th>
                    <th className="p-2">Andar</th>
                    <th className="p-2">Itens</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedList.map(({ role, andar }) => (
                    <tr key={roleKey(role, andar)} className="border-b border-border">
                      <td className="p-2">{role}</td>
                      <td className="p-2">{andar === 'geral' ? '—' : andarLabel(andar)}</td>
                      <td className="p-2">{defaultItemsFor(role).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-5">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Voltar
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            className="rounded-lg px-4 py-2 font-mono-label text-xs font-bold"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            próximo
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={saving}
            className="rounded-lg px-4 py-2 font-mono-label text-xs font-bold disabled:opacity-60"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            {saving ? 'gerando…' : 'gerar evento'}
          </button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ['Dados', 'Cargos', 'Revisão'];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={l} className="flex items-center gap-2 flex-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: done || active ? 'var(--primary)' : 'var(--muted)',
                color: done || active ? 'var(--primary-fg)' : 'var(--muted-fg)',
              }}
            >
              {done ? '✓' : n}
            </div>
            <span className={`text-xs font-semibold ${active ? '' : 'text-muted-fg'}`}>{l}</span>
            {n < 3 && <div className="flex-1 h-0.5" style={{ background: done ? 'var(--primary)' : 'var(--border)' }} />}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label
      className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer"
      style={{
        borderColor: checked ? 'var(--primary)' : 'var(--border)',
        background: checked ? 'var(--accent)' : 'var(--card)',
      }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-primary" />
      {label}
    </label>
  );
}
