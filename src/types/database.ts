export type UserRole = 'user' | 'admin' | 'owner';
export type UserStatus = 'active' | 'inactive';
export type EventStatus = 'planning' | 'in_progress' | 'completed';
export type MaloteStatus = 'pending' | 'in_progress' | 'completed';
export type MaloteCategory = 'geral' | 'por_andar';
export type Andar = 'terreo' | '1o' | '2o' | '3o' | '4o' | '5o' | 'geral';
export type AuditModulo =
  | 'Autenticação'
  | 'Usuários'
  | 'Checklists'
  | 'Sistema'
  | 'Dashboard'
  | 'Eventos'
  | 'Malotes'
  | 'Relatórios';
export type AuditResultado = 'Sucesso' | 'Falha' | 'Alerta';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  cargo: string | null;
  unidade: string | null;
  status: UserStatus;
  must_change_password: boolean;
  password_created: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  coordinator_email: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Malote {
  id: string;
  event_id: string;
  name: string;
  tipo: string;
  category: MaloteCategory;
  andar: Andar;
  responsavel_email: string | null;
  status: MaloteStatus;
  progress: number;
  total_items: number;
  checked_items: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaloteItem {
  id: string;
  malote_id: string;
  name: string;
  quantity: string;
  checked: boolean;
  observation: string | null;
  checked_by: string | null;
  checked_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  data_hora: string;
  usuario_id: string | null;
  nome_usuario: string | null;
  email_usuario: string | null;
  perfil_usuario: string | null;
  acao: string;
  modulo: AuditModulo;
  item_afetado: string | null;
  unidade: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  detalhes: string | null;
  resultado: AuditResultado;
}

// Estrutura mínima esperada pelo cliente Supabase tipado (@supabase/supabase-js).
// Cobre só o necessário para os tipos acima funcionarem no createClient<Database>().
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      events: { Row: Event; Insert: Partial<Event>; Update: Partial<Event> };
      malotes: { Row: Malote; Insert: Partial<Malote>; Update: Partial<Malote> };
      malote_items: { Row: MaloteItem; Insert: Partial<MaloteItem>; Update: Partial<MaloteItem> };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> };
    };
  };
}
