# 🚀 Deploy de Endpoints Mobile a Producción

## ✅ Opción A - Usar el proyecto web existente

Ya tienes los endpoints `/api/mobile/*` creados en el proyecto web.
Solo necesitas deployarlos a producción (Vercel).

---

## 📦 Archivos a deployar

Los siguientes archivos ya están en `UniversoTattoo/app/api/mobile/`:

```
✅ register/route.ts    - POST /api/mobile/register
✅ login/route.ts       - POST /api/mobile/login  
✅ productos/route.ts   - GET /api/mobile/productos
✅ categorias/route.ts  - GET /api/mobile/categorias
✅ profile/route.ts     - GET/PUT /api/mobile/profile
✅ orders/route.ts      - GET /api/mobile/orders
✅ checkout/route.ts    - POST /api/mobile/checkout
```

---

## 🔧 Pasos para Deploy

### 1. Ir al proyecto web

```bash
cd c:\Users\alexd\Documents\GitHub\UniversoTattooMobile\UniversoTattoo
```

### 2. Verificar que existe el Service Role Key

Archivo: `UniversoTattoo/.env`

Debe tener:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### 3. Commit y Push

```bash
git status
git add app/api/mobile
git commit -m "feat: Add mobile API endpoints with Service Role Key"
git push origin main
```

### 4. Deploy automático en Vercel

Vercel detectará el push y deployará automáticamente.

Espera 2-3 minutos y verifica en:
https://vercel.com/tu-proyecto

### 5. Verificar endpoints

Una vez deployado, prueba:

```bash
# Productos
https://www.universotattoo.com.ar/api/mobile/productos

# Categorías  
https://www.universotattoo.com.ar/api/mobile/categorias
```

---

## 📱 Configuración Mobile

La app móvil ya está configurada para usar:

```properties
EXPO_PUBLIC_API_BASE_URL="https://www.universotattoo.com.ar"
```

Endpoints que se usarán:
- `POST /api/mobile/register` - Sin reCAPTCHA
- `POST /api/mobile/login` - Login directo
- `GET /api/mobile/productos` - Lista de productos
- `GET /api/mobile/categorias` - Lista de categorías
- `GET /api/mobile/profile` - Perfil del usuario
- `PUT /api/mobile/profile` - Actualizar perfil
- `GET /api/mobile/orders` - Órdenes del usuario
- `POST /api/mobile/checkout` - Crear orden

---

## ⚠️ Importante

1. **Service Role Key**: Ya está en el `.env` del proyecto web
2. **Sin reCAPTCHA**: Los endpoints móviles NO requieren reCAPTCHA
3. **Mismo Supabase**: Web y mobile comparten la misma base de datos
4. **Bypass RLS**: El Service Role Key bypasea las políticas RLS

---

## 🧪 Probar después del deploy

```bash
# Desde PowerShell
Invoke-RestMethod -Uri "https://www.universotattoo.com.ar/api/mobile/productos"

# Debería devolver la lista de productos
```

---

## 📝 Checklist

- [ ] Verificar `.env` tiene `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Hacer commit de `app/api/mobile/*`
- [ ] Push a GitHub
- [ ] Esperar deploy de Vercel
- [ ] Probar endpoint de productos
- [ ] Abrir app móvil y probar registro
- [ ] Verificar login funciona
- [ ] Probar checkout

---

## 🎯 Ventajas de esta opción

✅ No hay servidor adicional que mantener  
✅ Todo en un solo proyecto web  
✅ Deploy automático con Vercel  
✅ Gratis (dentro del plan de Vercel)  
✅ URL única: www.universotattoo.com.ar  

---

**¡Listo!** Solo haz push y Vercel se encarga del resto 🚀
