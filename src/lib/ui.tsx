export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendente', cls: 'text-amber bg-amber/15' },
    in_progress: { label: 'Em andamento', cls: 'text-primary bg-primary/15' },
    completed: { label: 'Concluído', cls: 'text-green bg-green/15' },
  };
  const item = map[status] ?? { label: status, cls: 'text-muted-fg bg-muted' };
  return (
    <span
      className={`font-mono-label text-[10.5px] font-bold px-2 py-0.5 rounded-full ${item.cls}`}
    >
      {item.label}
    </span>
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full transition-all"
        style={{
          width: `${pct}%`,
          background: pct === 100 ? 'var(--green)' : pct > 50 ? 'var(--primary)' : 'var(--amber)',
        }}
      />
    </div>
  );
}
