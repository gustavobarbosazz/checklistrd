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
