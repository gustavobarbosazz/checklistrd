export const ANDAR_OPTIONS = [
  { value: 'terreo', label: 'Térreo' },
  { value: '1o', label: '1º Andar' },
  { value: '2o', label: '2º Andar' },
  { value: '3o', label: '3º Andar' },
  { value: '4o', label: '4º Andar' },
  { value: '5o', label: '5º Andar' },
] as const;

export const ANDAR_SORT_ORDER = ['terreo', '1o', '2o', '3o', '4o', '5o', 'geral'];

export function andarLabel(v: string) {
  if (v === 'geral') return 'Geral';
  return ANDAR_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export const ROLE_CATALOG = {
  semAndar: [
    'Organizador Geral',
    'Coordenador Geral',
    'Itinerante Geral',
    'Materiais Extra',
    'Rádios Comunicação',
    'Tablets',
  ],
  comAndar: ['Fiscal Itinerante', 'Fiscal Sanitário e Detector', 'Subcoordenador', 'Fiscal de Sala'],
};

// Catálogo de itens por cargo — confirmado via auditoria de código-fonte do sistema original.
export const ITEMS_BY_ROLE: Record<string, string[]> = {
  'Organizador Geral': [
    'Crachás (ITINERANTE, EXTRA, E FISCAL DE APOIO)',
    'Envelope do Itinerante (Checklist / Lista de Fiscais / Prancheta)',
    'Baterias extras',
    'Buchinhas de cabelo',
    'Colete extra',
    'Coletes',
    'Copos',
    'Detector extra',
    'Envelope lacre 25 M E 25 G',
    'Grampeador',
    'Guardanapo',
    'Lacres malote',
    'Pasta',
  ],
  'Coordenador Geral': [
    'Coletes',
    'Crachás',
    'Pasta',
    'Guardanapo',
    'Envelope lacre',
    'Lacres malote',
    'Kit sala',
    'Grampeador',
    'Canetas',
  ],
  'Itinerante Geral': [
    'Envelope Itinerante',
    '1 Colete',
    'Crachás múltiplos',
    '25 Sacos segurança M',
    '25 Envelopes G',
    '20 Coletes extras',
    'Copos',
  ],
  'Materiais Extra': [
    '50 Coletes extra',
    'Detectores extras',
    'Relógios extras',
    'Envelopes lacres',
    'Baterias e pilhas',
  ],
  'Rádios Comunicação': ['Rádios de comunicação', 'Protocolo entrega/devolução'],
  Tablets: ['Tablets identificados'],
  'Fiscal Itinerante': ['01 Colete', '01 Crachá', '01 Envelope', 'Saco de segurança'],
  'Fiscal Sanitário e Detector': ['04 Coletes', 'Crachás', 'Luvas 2M e 2G', 'Saco de Lixo 6G e 6M'],
  Subcoordenador: ['01 Colete', '01 Crachá', 'Lista de presença', 'Caneta', 'Folha de ocorrências'],
  'Fiscal de Sala': ['KIT SALAS (coletes, crachás, envelopes)'],
};

export function defaultItemsFor(role: string): string[] {
  return ITEMS_BY_ROLE[role] ?? ['Item genérico'];
}
