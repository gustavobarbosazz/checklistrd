import { createClient } from '@/lib/supabase/server';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from('events')
    .select('*, malotes(id, name, tipo, category, andar, status, total_items, checked_items)')
    .order('updated_at', { ascending: false });

  return <DashboardClient events={events ?? []} />;
}
