# API Web (Resumen)

Este documento resume los endpoints del backend web (Next.js) que consume la app móvil.

Base: `EXPO_PUBLIC_WEB_API_BASE` (producción: https://www.universotattoo.com.ar)

Autenticación: Las llamadas adjuntan `Authorization: Bearer <token supabase>` automáticamente (ver `lib/api.ts`). Los endpoints que requieren usuario autenticado devolverán 401/403 si el token no está presente o no es válido.

## Catálogo

- GET `/api/categorias`
  - Respuesta: lista de categorías. Campos tolerados: `{ id_categoria | id, nombre, es_activa | activa, orden }`.

- GET `/api/productos`
  - Respuesta: lista de productos. Campos tolerados en cada producto:
    - Identificadores: `id_producto | id | productoId`
    - Precios/stock: `precio_base | precio`, `stock_total | stock`
    - Imágenes: `ProductoImagen[]` o `imagenes[]` con `{ url_imagen, es_principal, orden }`
    - Variantes: `ProductoVariante[]` o `variantes[]` con al menos `{ id_variante | id | varianteId, stock, precio_adicional, es_activa }`
    - Categoría: `{ Categoria: { id_categoria, nombre } }` o `categoria`

- GET `/api/productos/:id`
  - Respuesta: producto con los mismos campos tolerados que arriba.

- GET `/api/productos/destacados?limit=8`
  - Respuesta: `{ productos: [...] }` o `[...]` con items `{ id, nombre, descripcion, precio, stock, imagen }`.

## Favoritos

- GET `/api/favorites`
  - Respuesta (tolerante):
    - `number[]`/`string[]` (IDs de productos), o
    - objetos `{ producto_id, Producto? }` (con datos incrustados opcionales)

- POST `/api/favorites`
  - Body: `{ producto_id: number }`
  - Respuesta: `{ ok: true }` o similar.

- DELETE `/api/favorites/:id`
  - Respuesta: `{ ok: true }` o similar.

## Perfil

- GET `/api/profile`
  - Respuesta: objeto Cliente (campos usados por la app):
    `{ id_cliente, nombre, apellido, email, telefono, dni, calle, numero, departamento, barrio, ciudad, provincia, codigo_postal, fecha_nacimiento, acepta_marketing }`

- POST `/api/profile/update`
  - Body: subset de campos de Cliente (strings vacíos se envían como null donde aplica).
  - Respuesta: Cliente actualizado.

## Pedidos

- GET `/api/user/orders`
  - Respuesta: lista de pedidos del usuario autenticado. La app tolera `_items` (detalle) y `_total` (total sin envío) si están presentes.

- GET `/api/orders/details?orderId=<id>&numero=<numero_pedido>`
  - Respuesta: `{ items: [...] }` o `[...]` con ítems del pedido. Cada ítem idealmente incluye `Producto` básico.

- POST `/api/orders`
  - Body (contrato usado por la app):
    ```json
    {
      "items": [{ "id": "string", "quantity": 1, "price": 0, "varianteId": 123|null }],
      "customerInfo": { "firstName": "", "lastName": "", "email": "", "phone": "", "dni": "" },
      "shippingInfo": {
        "calle": "", "numero": "", "departamento": "", "barrio": "",
        "city": "", "province": "", "postalCode": "",
        "sucursal?": "", "direccion?": "", "ciudad?": "", "provincia?": "", "codigoPostal?": ""
      } | null,
      "shippingMethod": "delivery|branch|pickup",
      "selectedBranch": { ... } | null,
      "paymentMethod": "MercadoPago|Transferencia|Efectivo",
      "notes": "",
      "subtotal": 0,
      "shipping": 0,
      "discount": 0,
      "total": 0
    }
    ```
  - Respuesta esperada: `{ success?: boolean, pedido?: { id: number, numero_pedido: string, total: number } }`

## Pagos (Mercado Pago)

- POST `/api/create-preference`
  - Body: `{ items: [{ id, name, quantity, price, image_url?, description }], payer: { firstName, lastName, email, phone, address?, postalCode? }, shipping: number, external_reference: string, coupon_discount: number }`
  - Respuesta: `{ id?: string, init_point?: string, sandbox_init_point?: string }`

- GET `/api/payments/verify?external_reference=<numero_pedido>`
  - Respuesta: estado del pago/orden. La app lo usa indirectamente vía flujo web/hook.

## Envíos (OCA)

- GET `/api/oca/cotizar?codigoPostalOrigen=3260&codigoPostalDestino=XXXX&cantidadPaquetes=1&valorDeclarado=100&pesoTotal=0.5&volumenTotal=0.01&operativa=414609`
  - Respuesta: `{ ok: boolean, data: [{ precio: number, plazoEntrega?: string, descripcion?: string }] }`

- GET `/api/oca/sucursales?codigoPostal=XXXX`
  - Respuesta: `{ ok: boolean, data: [{ nombre, direccion, localidad, provincia, codigoPostal }] }`

## Notas

- Los mapeos en la app son tolerantes para soportar cambios mínimos en nombres de campos.
- Se adjunta `Authorization` cuando hay sesión supabase; para anónimos, algunos endpoints devolverán 401.
- No se realizan escrituras directas a la DB desde el cliente; todo pasa por estos endpoints.
