import { supabase } from './supabase';

export type AppRole = 'admin' | 'client' | null;

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    // Opcional: log suave
    return { session: null };
  }
  return { session: data.session };
}

export async function getUserRole(userId: string): Promise<AppRole> {
  const { data, error } = await supabase
    .from('User')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) return null;
  return (data?.role as AppRole) ?? null;
}