export interface Unidade {
  id: string;
  nome: string;
  andares: string[]; // valores como '1o', '2o', etc — os mesmos usados no banco
}

/**
 * Catálogo de unidades. Cada unidade tem seu próprio conjunto de andares —
 * ao escolher a unidade no wizard de Novo Evento, só os andares dela aparecem
 * para seleção de cargos "por andar".
 *
 * Para adicionar uma nova unidade, é só incluir um item aqui (nome + lista de
 * andares). Não precisa mexer no banco — o campo Malote.andar aceita qualquer
 * um desses valores.
 */
export const UNIDADES: Unidade[] = [
  { id: 'unidade-1', nome: 'Unidade I', andares: ['1o', '2o', '3o', '4o', '5o'] },
  { id: 'unidade-2', nome: 'Unidade II', andares: ['3o', '5o', '6o', '7o', '8o'] },
];

export function getUnidade(id: string): Unidade | undefined {
  return UNIDADES.find((u) => u.id === id);
}
