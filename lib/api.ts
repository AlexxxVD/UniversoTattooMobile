import { Platform } from 'react-native';
import { supabase } from './supabase';

const ENV_BASE = process.env.EXPO_PUBLIC_API_BASE;
const ENV_WEB_BASE = process.env.EXPO_PUBLIC_WEB_API_BASE || process.env.EXPO_PUBLIC_API_BASE_URL;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;


const FALLBACK_BASE =
  Platform.OS === 'android'
    ? 'http://192.168.0.239:3000'
    : 'http://localhost:3000';

export const API_BASE = (ENV_BASE || FALLBACK_BASE).replace(/\/+$/, ''); 
export const WEB_BASE = (ENV_WEB_BASE || FALLBACK_BASE).replace(/\/+$/, ''); 

function buildQS(params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `?${qs}`;
}

function joinUrl(base: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path; // ya es absoluta
  const b = base.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return `${b}/${p}`;
}

const isSupabaseFunctionsBase = (base: string) => /functions\.supabase\.co/i.test(base) || /\/functions\/v\d+/i.test(base);

// Normaliza HeadersInit a un objeto simple Record<string, string>
function normalizeHeaders(h?: HeadersInit): Record<string, string> {
  if (!h) return {};
  // Headers
  if (typeof Headers !== 'undefined' && h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  // Array de tuplas
  if (Array.isArray(h)) {
    const out: Record<string, string> = {};
    for (const [k, v] of h) out[k] = v;
    return out;
  }
  // Objeto plano
  return h as Record<string, string>;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // deja json como {}
  }
  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export async function apiGet<T = any>(
  path: string,
  params?: Record<string, any>,
  init?: RequestInit & { withAuth?: boolean }
) {
  const url = joinUrl(API_BASE, `${path}${buildQS(params)}`);
  const { headers: initHeaders, ...rest } = init ?? {};
  const auth = init?.withAuth === false ? {} : await getAuthHeader();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...auth,
    ...(isSupabaseFunctionsBase(API_BASE) && SUPABASE_ANON ? { apikey: SUPABASE_ANON } : {}),
    ...normalizeHeaders(initHeaders as HeadersInit | undefined),
  };
  const res = await fetch(url, {
    method: 'GET',
    headers,
    ...rest,
  });
  return handleResponse<T>(res);
}

export async function apiPost<T = any>(
  path: string,
  body?: any,
  init?: RequestInit & { withAuth?: boolean }
) {
  const url = joinUrl(API_BASE, path);
  const { headers: initHeaders, ...rest } = init ?? {};
  const auth = init?.withAuth === false ? {} : await getAuthHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...auth,
    ...(isSupabaseFunctionsBase(API_BASE) && SUPABASE_ANON ? { apikey: SUPABASE_ANON } : {}),
    ...normalizeHeaders(initHeaders as HeadersInit | undefined),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });
  return handleResponse<T>(res);
}

export async function apiPut<T = any>(
  path: string,
  body?: any,
  init?: RequestInit & { withAuth?: boolean }
) {
  const url = joinUrl(API_BASE, path);
  const { headers: initHeaders, ...rest } = init ?? {};
  const auth = init?.withAuth === false ? {} : await getAuthHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...auth,
    ...(isSupabaseFunctionsBase(API_BASE) && SUPABASE_ANON ? { apikey: SUPABASE_ANON } : {}),
    ...normalizeHeaders(initHeaders as HeadersInit | undefined),
  };
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T = any>(
  path: string,
  init?: RequestInit & { withAuth?: boolean }
) {
  const url = joinUrl(API_BASE, path);
  const { headers: initHeaders, ...rest } = init ?? {};
  const auth = init?.withAuth === false ? {} : await getAuthHeader();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...auth,
    ...(isSupabaseFunctionsBase(API_BASE) && SUPABASE_ANON ? { apikey: SUPABASE_ANON } : {}),
    ...normalizeHeaders(initHeaders as HeadersInit | undefined),
  };
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
    ...rest,
  });
  return handleResponse<T>(res);
}

// Variante que usa la base web (útil para endpoints como /api/oca/*)
export async function apiGetWeb<T = any>(
  path: string,
  params?: Record<string, any>,
  init?: RequestInit & { withAuth?: boolean }
) {
  const url = joinUrl(WEB_BASE, `${path}${buildQS(params)}`);
  const { headers: initHeaders, ...rest } = init ?? {};
  const auth = init?.withAuth === false ? {} : await getAuthHeader();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...auth,
    ...normalizeHeaders(initHeaders as HeadersInit | undefined),
  };
  const res = await fetch(url, {
    method: 'GET',
    headers,
    ...rest,
  });
  return handleResponse<T>(res);
}

export async function apiPostWeb<T = any>(
  path: string,
  body?: any,
  init?: RequestInit & { withAuth?: boolean }
) {
  const url = joinUrl(WEB_BASE, path);
  const { headers: initHeaders, ...rest } = init ?? {};
  const auth = init?.withAuth === false ? {} : await getAuthHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...auth,
    ...normalizeHeaders(initHeaders as HeadersInit | undefined),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });
  return handleResponse<T>(res);
}