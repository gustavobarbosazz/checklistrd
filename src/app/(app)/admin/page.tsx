import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminClient from './admin-client';

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!myProfile || !['admin', 'owner'].includes(myProfile.role)) {
    return (
      <div className="px-8 py-8">
        <h1 className="font-display text-xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-muted-fg text-sm">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const { data: events } = await supabase
    .from('events')
    .select('*, malotes(id)')
    .order('created_at', { ascending: false });

  return <AdminClient initialEvents={events ?? []} />;
}
