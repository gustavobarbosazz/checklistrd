'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const FREE_EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com'];
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

async function assertIsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    throw new Error('Sem permissão.');
  }
  return user;
}

export async function createUser(formData: FormData) {
  await assertIsAdmin();

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? 'user');
  const password = String(formData.get('password') ?? '');
  const setPasswordNow = formData.get('setPasswordNow') === 'on';

  const domain = email.split('@')[1] ?? '';
  if (!email || !EMAIL_REGEX.test(email) || FREE_EMAIL_DOMAINS.includes(domain)) {
    return { error: 'Use um e-mail corporativo válido (não são aceitos Gmail, Hotmail, etc.).' };
  }
  if (setPasswordNow && password.length < 8) {
    return { error: 'A senha não atende todos os requisitos de segurança.' };
  }

  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: setPasswordNow ? password : undefined,
    email_confirm: true,
    user_metadata: {
      full_name: name || email.split('@')[0],
      must_change_password: !setPasswordNow,
      password_created: setPasswordNow,
    },
  });

  if (error || !created.user) {
    if (error?.message?.toLowerCase().includes('already')) {
      return { error: 'Este e-mail já está cadastrado no sistema.' };
    }
    return { error: error?.message ?? 'Erro ao criar usuário.' };
  }

  // Se não definiu senha agora, gera uma temporária aleatória (o usuário nunca a vê;
  // ele cria a própria senha de verdade na tela de Primeiro Acesso).
  if (!setPasswordNow) {
    await admin.auth.admin.updateUserById(created.user.id, {
      password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    });
  }

  await admin.from('profiles').update({ role }).eq('id', created.user.id);

  revalidatePath('/usuarios');
  return { success: true, message: setPasswordNow
    ? 'Usuário criado com sucesso. A conta já está ativa com a senha definida.'
    : 'Usuário criado com sucesso. No primeiro acesso, ele deverá criar uma senha.' };
}

export async function toggleUserStatus(userId: string, currentStatus: string) {
  await assertIsAdmin();
  const admin = createAdminClient();
  const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
  await admin.from('profiles').update({ status: newStatus }).eq('id', userId);
  revalidatePath('/usuarios');
}

export async function forcePasswordReset(userId: string) {
  await assertIsAdmin();
  const admin = createAdminClient();
  await admin.from('profiles').update({ must_change_password: true, password_created: false }).eq('id', userId);
  revalidatePath('/usuarios');
}
