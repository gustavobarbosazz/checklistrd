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

/**
 * Formata qualquer código de andar (ex.: '6o' → '6º Andar'). Funciona para
 * qualquer valor, mesmo andares criados depois — não depende de catálogo fixo.
 */
export function andarLabel(v: string) {
  if (ANDAR_LABELS[v]) return ANDAR_LABELS[v];
  const match = v.match(/^(\d+)o$/);
  if (match) return `${match[1]}º Andar`;
  return v;
}

/**
 * NOTA: o catálogo de Unidades e Cargos (com seus itens) não é mais fixo aqui —
 * agora vive nas tabelas `unidades` e `cargos` do banco, editável pela tela
 * de Configurações. Ver src/lib/catalogQueries.ts para as funções de leitura.
 */
