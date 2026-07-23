import { createClient } from '@/lib/supabase/server';
import NovoEventoClient from './novo-evento-client';

export default async function NovoEventoPage() {
  const supabase = await createClient();

  const { data: unidades } = await supabase.from('unidades').select('*').order('ordem');
  const { data: cargos } = await supabase.from('cargos').select('*').order('ordem');

  return <NovoEventoClient unidades={unidades ?? []} cargos={cargos ?? []} />;
}
