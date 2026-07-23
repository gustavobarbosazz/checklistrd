'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logAudit } from '@/lib/audit';
import { andarLabel } from '@/lib/roleCatalog';
import type { UnidadeRow, CargoRow } from '@/types/database';

type Selected = Record<string, boolean>; // key: `${cargoNome}|${andar}`

function roleKey(role: string, andar: string) {
  return `${role}|${andar}`;
}

export default function NovoEventoClient({ unidades, cargos }: { unidades: UnidadeRow[]; cargos: CargoRow[] }) {
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
  const [warnings, setWarnings] = useState<string[]>([]);

  const unidade = unidades.find((u) => u.id === unidadeId);

  // Agrupa os cargos por camada (tier), na ordem em que vieram do banco.
  const tiers: { title: string; hasAndar: boolean; cargos: CargoRow[] }[] = [];
  cargos.forEach((c) => {
    let tier = tiers.find((t) => t.title === c.tier);
    if (!tier) {
      tier = { title: c.tier, hasAndar: c.tem_andar, cargos: [] };
      tiers.push(tier);
    }
    tier.cargos.push(c);
  });

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
    cargos.forEach((c) => {
      if (c.tem_andar) {
        (unidade?.andares ?? []).forEach((a) => (all[roleKey(c.nome, a)] = true));
      } else {
        all[roleKey(c.nome, 'geral')] = true;
      }
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
    setWarnings([]);

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

    const failedMalotes: string[] = [];

    for (const { role, andar } of selectedList) {
      const cargo = cargos.find((c) => c.nome === role);
      const items = cargo?.itens?.length ? cargo.itens : ['Item genérico'];
      const category = andar === 'geral' ? 'geral' : 'por_andar';
      const maloteName = category === 'por_andar' ? `${role} - ${andarLabel(andar)}` : role;

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

      // IMPORTANTE: antes esse erro era ignorado silenciosamente (o malote
      // simplesmente não era criado, sem nenhum aviso). Agora ele é coletado
      // e mostrado ao final, pra você saber exatamente o que não foi salvo.
      if (maloteError || !malote) {
        failedMalotes.push(`${maloteName} (${maloteError?.message ?? 'erro desconhecido'})`);
        continue;
      }

      const { error: itemsError } = await supabase.from('malote_items').insert(
        items.map((itemName) => ({
          malote_id: malote.id,
          name: itemName,
          quantity: '1',
          created_by: user?.id,
        }))
      );
      if (itemsError) {
        failedMalotes.push(`${maloteName} — itens não foram salvos (${itemsError.message})`);
      }
    }

    logAudit({
      acao: 'Criou',
      modulo: 'Eventos',
      itemAfetado: name,
      detalhes: `Evento criado com ${selectedList.length - failedMalotes.length}/${selectedList.length} malote(s) na ${unidade?.nome}`,
      resultado: failedMalotes.length > 0 ? 'Alerta' : 'Sucesso',
    });

    if (failedMalotes.length > 0) {
      setSaving(false);
      setWarnings(failedMalotes);
      // Mesmo com falhas parciais, o evento já foi criado — leva para a página dele
      // pra você ver o que deu certo, mas deixa os avisos visíveis antes.
      setTimeout(() => {
        router.push(`/evento/${event.id}`);
        router.refresh();
      }, 4000);
      return;
    }

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
        {warnings.length > 0 && (
          <div className="text-xs mb-4 rounded-lg border border-amber/35 bg-amber/10 px-3 py-3 text-amber">
            <div className="font-bold mb-1">Alguns malotes não foram criados:</div>
            <ul className="list-disc pl-4">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <div className="mt-2 text-muted-fg">Redirecionando para o evento em instantes…</div>
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
                    setSelected({});
                  }}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary"
                >
                  <option value="">Selecione a unidade...</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
                {unidades.length === 0 && (
                  <div className="text-[11px] text-amber mt-1">
                    Nenhuma unidade cadastrada — crie uma em Configurações → Unidades.
                  </div>
                )}
              </div>
            </div>
            <Field label="E-mail do coordenador" type="email" value={coordinatorEmail} onChange={setCoordinatorEmail} />
            {unidade && (
              <div className="text-xs text-muted-fg bg-muted rounded-lg px-3 py-2">
                Andares disponíveis nessa unidade: {unidade.andares.map(andarLabel).join(', ') || '—'}
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

                {tiers.map((tier) => (
                  <div key={tier.title} className="mb-5">
                    <div className="font-mono-label text-[11px] text-muted-fg mb-2">{tier.title}</div>
                    {!tier.hasAndar ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {tier.cargos.map((c) => (
                          <Checkbox
                            key={c.id}
                            checked={!!selected[roleKey(c.nome, 'geral')]}
                            onChange={() => toggle(c.nome, 'geral')}
                            label={c.nome}
                          />
                        ))}
                      </div>
                    ) : (
                      tier.cargos.map((c) => (
                        <div key={c.id} className="mb-3">
                          <div className="text-xs font-semibold mb-1.5">{c.nome}</div>
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                            {unidade.andares.map((andar) => (
                              <Checkbox
                                key={andar}
                                checked={!!selected[roleKey(c.nome, andar)]}
                                onChange={() => toggle(c.nome, andar)}
                                label={andarLabel(andar)}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
                {cargos.length === 0 && (
                  <div className="text-sm text-amber bg-amber/10 border border-amber/30 rounded-lg p-3">
                    Nenhum cargo cadastrado — crie em Configurações → Cargos.
                  </div>
                )}
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
                      <td className="p-2">{cargos.find((c) => c.nome === role)?.itens?.length ?? 0}</td>
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
