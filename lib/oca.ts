import { apiGet } from './api';

type QuoteResp = {
  ok: boolean;
  data?: Array<{ operativa: string; precio: number; plazoEntrega?: string; descripcion?: string }>;
  error?: string;
};

export async function ocaCotizar(params: {
  pesoTotal: number;
  volumenTotal: number;
  codigoPostalOrigen: string;
  codigoPostalDestino: string;
  cantidadPaquetes: number;
  valorDeclarado: number;
  operativa: string; // "414609" | "414610"
  useTest?: boolean;
}) {
  return apiGet<QuoteResp>('/api/oca/cotizar', {
    ...params,
    useTest: params.useTest ?? false,
  });
}

type BranchesResp = { ok: boolean; data?: any[]; error?: string };

export async function ocaSucursales(codigoPostal: string, useTest = false) {
  return apiGet<BranchesResp>('/api/oca/sucursales', { codigoPostal, useTest });
}