import { supabase } from './supabase';

export type AppRole = 'admin' | 'user' | 'client';

type EnsureOptions = {
  defaultRole?: AppRole;
};


export async function ensureUserRow(opts: EnsureOptions = {}): Promise<boolean> {
  const { defaultRole = 'user' } = opts;

  const { data: s, error: sErr } = await supabase.auth.getSession();
  if (sErr || !s?.session?.user) {
    console.warn('[ensureUserRow] no session:', sErr?.message);
    return false;
  }
  const u = s.session.user;

  const meta = u.user_metadata || {};
  const firstName = (meta.firstName || meta.name || '').toString().trim();
  const lastName = (meta.lastName || '').toString().trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || null;
  const phone = (meta.phone || '').toString().trim() || null;
  const address = (meta.address || '').toString().trim() || null;

 
  const existing = await supabase
    .from('User')
    .select('id')
    .eq('id', u.id)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    console.warn('[ensureUserRow] select by id error:', {
      message: existing.error.message,
      code: (existing.error as any)?.code,
      details: (existing.error as any)?.details,
      hint: (existing.error as any)?.hint,
    });

  }
  if (existing.data) return false; // ya existe

  const payload: any = {
    id: u.id,
    email: u.email,
    name: fullName,
    image: null,
    role: defaultRole, // ahora acepta 'user'
  };

 
  let res = await supabase
    .from('User')
    .upsert(payload, { onConflict: 'id' })
    .select('id')
    .single();

  if (res.error) {
    console.warn('[ensureUserRow] upsert by id error:', {
      message: res.error.message,
      code: (res.error as any)?.code,
      details: (res.error as any)?.details,
      hint: (res.error as any)?.hint,
    });
    
    res = await supabase
      .from('User')
      .upsert(payload, { onConflict: 'email' })
      .select('id')
      .single();

    if (res.error) {
      console.warn('[ensureUserRow] upsert by email error:', {
        message: res.error.message,
        code: (res.error as any)?.code,
        details: (res.error as any)?.details,
        hint: (res.error as any)?.hint,
      });
      return false;
    }
  }

  // Crear registro en Cliente también
  try {
    const clientePayload: any = {
      userId: u.id,
      nombre: firstName || null,
      apellido: lastName || null,
      email: u.email,
      telefono: phone,
      calle: address,
      acepta_marketing: false,
    };

    const { error: clienteError } = await supabase
      .from('Cliente')
      .insert(clientePayload);

    if (clienteError) {
      console.warn('[ensureUserRow] Error creando Cliente:', clienteError);
    } else {
      console.log('[ensureUserRow] Cliente creado exitosamente');
    }
  } catch (e: any) {
    console.warn('[ensureUserRow] Exception al crear Cliente:', e?.message);
  }

  return true;
}