// Flags para migrar por partes la app móvil hacia la API de la web.
// Podés ir encendiendo cada feature cuando el endpoint de la web esté listo.

export const featureFlags = {
  // Catálogo desde la API de la web (si querés usarla en vez de Supabase directo)
  useWebApiCatalog: false,

  // Reprecio del carrito usando la API de la web (mantener true si ya tenés el endpoint)
  useWebApiCartPricing: true,

  // Cotización de envíos usando la API de la web (si preferís reemplazar OCA local)
  useWebApiShipping: false,

  // Checkout vía API de la web (crea pedido y abre preferencia de Mercado Pago)
  // Si todavía no querés usar la API, ponelo en false y se usa el flujo local (Supabase).
  useWebApiCheckout: true,
} as const;