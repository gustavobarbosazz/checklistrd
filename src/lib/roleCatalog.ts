export const ANDAR_SORT_ORDER = ['terreo', '1o', '2o', '3o', '4o', '5o', '6o', '7o', '8o', 'geral'];

const ANDAR_LABELS: Record<string, string> = {
  terreo: 'Térreo',
  '1o': '1º Andar',
  '2o': '2º Andar',
  '3o': '3º Andar',
  '4o': '4º Andar',
  '5o': '5º Andar',
  '6o': '6º Andar',
  '7o': '7º Andar',
  '8o': '8º Andar',
  geral: 'Geral',
};

export function andarLabel(v: string) {
  return ANDAR_LABELS[v] ?? v;
}

/**
 * Catálogo de cargos organizado em camadas (a "pirâmide" do processo seletivo).
 * Cada camada é só uma organização visual no wizard — o que importa pro banco
 * é se o cargo tem andar (category: 'por_andar') ou não (category: 'geral').
 */
export const ROLE_TIERS: { title: string; roles: string[]; hasAndar: boolean }[] = [
  {
    title: 'Coordenação (sem andar)',
    hasAndar: false,
    roles: ['Coordenação Geral', 'Subcoordenação Geral', 'Itinerante Geral', 'Organizador Geral'],
  },
  {
    title: 'Liderança por andar',
    hasAndar: true,
    roles: ['Subcoordenador por andar', 'Itinerante por andar'],
  },
  {
    title: 'Sala (por andar)',
    hasAndar: true,
    roles: ['Fiscal Líder de Sala', 'Fiscal Extra', 'Fiscal de Sala'],
  },
  {
    title: 'Operacional (por andar)',
    hasAndar: true,
    roles: ['Fiscal Detector e Sanitário', 'Equipe de Apoio', 'Porteiro'],
  },
  {
    title: 'Equipamentos (sem andar)',
    hasAndar: false,
    roles: ['Tablets', 'Materiais Extras', 'Rádios de Comunicação'],
  },
];

// Compatibilidade com o restante do app, que espera semAndar/comAndar.
export const ROLE_CATALOG = {
  semAndar: ROLE_TIERS.filter((t) => !t.hasAndar).flatMap((t) => t.roles),
  comAndar: ROLE_TIERS.filter((t) => t.hasAndar).flatMap((t) => t.roles),
};

// Catálogo de itens por cargo — conforme especificado.
export const ITEMS_BY_ROLE: Record<string, string[]> = {
  'Coordenação Geral': [
    'Coletes',
    'Crachás',
    'Pasta de documentos',
    'Guardanapo',
    'Envelope de segurança',
    'Lacres de malotes',
    'Kits salas',
    'Grampeador',
    'Canetas',
  ],
  'Subcoordenação Geral': [
    'Coletes',
    'Crachás',
    'Pasta de documentos',
    'Buchinhas de cabelo',
    'Copos',
    'Envelopes de segurança',
    'Grampeador',
    'Canetas',
    'Atas',
  ],
  'Itinerante Geral': [
    'Coletes extras',
    'Envelopes de segurança tamanho G',
    'Envelopes de segurança tamanho M',
    'Crachás',
    'Copos',
  ],
  'Organizador Geral': [
    'Coletes',
    'Copos',
    'Lacres de malote',
    'Envelopes de segurança',
    'Guardanapos',
    'Pasta de documentos',
    'Grampeador',
    'Detector de metal extra',
    'Bateria extra',
    'Buchinhas de cabelo',
    'Colete extra',
    'Crachás (Itinerante, Extra e Fiscal de Apoio)',
    'Envelope do itinerante',
  ],
  'Subcoordenador por andar': ['Colete', 'Crachá', 'Lista de presença', 'Canetas', 'Ata', 'Pasta de documentos'],
  'Itinerante por andar': ['10 Coletes', 'Envelope de segurança', 'Ata de sala', 'Pasta de documentos'],
  'Fiscal Líder de Sala': ['Coletes', 'Crachás', 'Envelopes de segurança', 'Etiquetas de pertences', 'Pasta de informações da sala'],
  // NÃO ESPECIFICADO pelo usuário ainda — item placeholder até definir a lista real.
  'Fiscal Extra': ['Kit padrão (definir itens)'],
  'Fiscal de Sala': ['Kit padrão (definir itens)'],
  'Fiscal Detector e Sanitário': [
    '4 Coletes',
    'Crachás',
    '2 Luvas M',
    '2 Luvas G',
    '6 Sacos de lixo G',
    '6 Sacos de lixo M',
    '2 Detectores de metal',
  ],
  // NÃO ESPECIFICADO pelo usuário ainda — item placeholder até definir a lista real.
  'Equipe de Apoio': ['Kit padrão (definir itens)'],
  Porteiro: ['Ata', 'Colete', 'Crachá', 'Pasta de documentos'],
  Tablets: ['Tablets de facial', 'Protocolo'],
  'Materiais Extras': ['Coletes extras', 'Detectores extras', 'Envelopes de segurança extra', 'Baterias e pilhas extras', 'Relógios extras'],
  'Rádios de Comunicação': ['Rádios de comunicação', 'Protocolo de entrega/devolução'],
};

export function defaultItemsFor(role: string): string[] {
  return ITEMS_BY_ROLE[role] ?? ['Item genérico'];
}

