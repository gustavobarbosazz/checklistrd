'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteEvent(eventId: string, eventName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  // A exclusão em cascata (malotes e itens) é feita automaticamente pelo banco
  // via "on delete cascade" nas foreign keys — não precisa apagar um por um.
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) return { error: error.message };

  await supabase.from('audit_logs').insert({
    usuario_id: user.id,
    email_usuario: user.email,
    acao: 'Deletou',
    modulo: 'Eventos',
    item_afetado: eventName,
    detalhes: 'Evento excluído em cascata (malotes e itens)',
    resultado: 'Sucesso',
  });

  revalidatePath('/admin');
  return { success: true };
}

// ---------- UNIDADES ----------

export async function createUnidade(nome: string, andares: string[]) {
  const supabase = await createClient();
  const { error } = await supabase.from('unidades').insert({ nome, andares });
  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath('/novo-evento');
  return { success: true };
}

export async function updateUnidade(id: string, nome: string, andares: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('unidades')
    .update({ nome, andares, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath('/novo-evento');
  return { success: true };
}

export async function deleteUnidade(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('unidades').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath('/novo-evento');
  return { success: true };
}

// ---------- CARGOS ----------

export async function createCargo(nome: string, tier: string, temAndar: boolean, itens: string[]) {
  const supabase = await createClient();
  const { error } = await supabase.from('cargos').insert({ nome, tier, tem_andar: temAndar, itens });
  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath('/novo-evento');
  return { success: true };
}

export async function updateCargo(id: string, nome: string, tier: string, temAndar: boolean, itens: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('cargos')
    .update({ nome, tier, tem_andar: temAndar, itens, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath('/novo-evento');
  return { success: true };
}

export async function deleteCargo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('cargos').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath('/novo-evento');
  return { success: true };
}

