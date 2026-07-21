import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from './sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (profile?.must_change_password) redirect('/primeiro-acesso');

  return (
    <div className="flex h-screen overflow-hidden relative">
      <div className="terminal-bg" />
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto relative z-10">{children}</main>
    </div>
  );
}
