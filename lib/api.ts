import { Platform } from 'react-native';

const ENV_BASE = process.env.EXPO_PUBLIC_API_BASE;

const FALLBACK_BASE =
  Platform.OS === 'android'
    ? 'http://192.168.0.239'
    : 'http://localhost:3000';

export const API_BASE = ENV_BASE || FALLBACK_BASE;

function buildQS(params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `?${qs}`;
}

export async function apiGet<T = any>(path: string, params?: Record<string, any>, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}${buildQS(params)}`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const json = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    throw new Error((json as any)?.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function apiPost<T = any>(path: string, body?: any, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  });
  const json = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    throw new Error((json as any)?.error || `HTTP ${res.status}`);
  }
  return json;
}