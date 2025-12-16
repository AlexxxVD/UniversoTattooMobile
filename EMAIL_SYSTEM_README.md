# Sistema de Emails Mobile - Universo Tattoo

## Descripción General

El proyecto mobile de **Universo Tattoo** utiliza el backend web (Next.js) existente para gestionar el envío de emails transaccionales mediante **Resend**. Esto evita duplicar la lógica de emails y mantiene la consistencia entre web y mobile.

## Arquitectura

```
┌─────────────────┐
│   Mobile App    │
│  (React Native) │
└────────┬────────┘
         │
         │ HTTP POST
         │
         ▼
┌─────────────────┐
│  Backend Web    │
│    (Next.js)    │
└────────┬────────┘
         │
         │ API
         │
         ▼
┌─────────────────┐
│     Resend      │
│  (Email Service)│
└─────────────────┘
```

## Servicios Implementados

### 1. **Verificación de Email** (`sendVerificationEmail`)
- **Endpoint**: `/api/resend-verification`
- **Función**: Envía email de confirmación de cuenta
- **Rate Limit**: 1 email cada 5 minutos por usuario
- **Uso**:
  ```typescript
  import { sendVerificationEmail } from '@/lib/email-service';
  
  const result = await sendVerificationEmail('user@example.com');
  if (result.success) {
    // Email enviado
  } else {
    // Manejar error: result.error
    // Si hay rate limit: result.remainingMinutes
  }
  ```

### 2. **Recuperación de Contraseña** (`requestPasswordReset`)
- **Endpoint**: `/api/forgot-password`
- **Función**: Envía link de reset de contraseña
- **Rate Limit**: 3 intentos cada 15 minutos por IP
- **Uso**:
  ```typescript
  import { requestPasswordReset } from '@/lib/email-service';
  
  const result = await requestPasswordReset('user@example.com');
  if (result.success) {
    // Email enviado
  }
  ```

### 3. **Restablecer Contraseña** (`resetPassword`)
- **Endpoint**: `/api/reset-password`
- **Función**: Cambia la contraseña usando token del email
- **Uso**:
  ```typescript
  import { resetPassword } from '@/lib/email-service';
  
  const result = await resetPassword(token, newPassword);
  if (result.success) {
    // Contraseña actualizada
  }
  ```

### 4. **Verificar Email con Token** (`verifyEmail`)
- **Endpoint**: `/api/verify-email`
- **Función**: Valida el email usando el token
- **Uso**:
  ```typescript
  import { verifyEmail } from '@/lib/email-service';
  
  const result = await verifyEmail(token);
  if (result.success) {
    // Email verificado
  }
  ```

## Configuración

### Variables de Entorno (`.env`)

```env
# URL del backend web (Next.js)
EXPO_PUBLIC_API_BASE_URL=https://www.universotattoo.com.ar

# O en desarrollo local:
# EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Backend Web (Next.js)

El backend debe tener configurado:

```env
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email remitente verificado en Resend
RESEND_EMAIL_FROM=Universo Tattoo <noreply@universotattoo.com.ar>

# URL de la aplicación web
NEXT_PUBLIC_APP_URL=https://www.universotattoo.com.ar
```

## Pantallas Actualizadas

### 1. **forgot-password.tsx**
- Usa `requestPasswordReset()`
- Envía email con link de recuperación
- Maneja rate limiting y errores de red

### 2. **verify-pending.tsx**
- Usa `sendVerificationEmail()`
- Permite reenviar email de verificación
- Muestra tiempo restante si hay rate limit

### 3. **register.tsx** (Futuro)
- Después de registro exitoso, redirige a `verify-pending`
- El backend web envía automáticamente el email de verificación

## Emails Enviados

### Email de Verificación
- **Asunto**: "Confirma tu Cuenta - Universo Tattoo"
- **Contenido**: Link de verificación con token
- **Link**: `https://universotattoo.com.ar/auth/verify-email?token=XXX`

### Email de Recuperación de Contraseña
- **Asunto**: "Recupera tu Contraseña - Universo Tattoo"
- **Contenido**: Link de reset con token
- **Link**: `https://universotattoo.com.ar/auth/reset-password?token=XXX`

### Email de Confirmación de Reset
- **Asunto**: "Contraseña Restablecida - Universo Tattoo"
- **Contenido**: Confirmación de cambio exitoso
- **Acción**: Link para iniciar sesión

## Manejo de Errores

```typescript
interface EmailResponse {
  success?: boolean;
  error?: string;
  message?: string;
  remainingMinutes?: number; // Para rate limiting
}
```

### Errores Comunes

1. **Rate Limit (429)**
   - Error: "Por favor espera X minuto(s) antes de solicitar otro email"
   - Solución: Mostrar `remainingMinutes` al usuario

2. **Usuario no encontrado (404)**
   - Error: "Usuario no encontrado"
   - Solución: Verificar que el email esté registrado

3. **Email ya verificado (400)**
   - Error: "El email ya está verificado"
   - Solución: Redirigir al login

4. **Error de red**
   - Error: "Error de conexión. Verifica tu internet."
   - Solución: Reintentar cuando haya conexión

## Deep Links (Futuro)

Para que los links de email abran directamente la app mobile:

### 1. Configurar Deep Linking en Expo

```json
// app.json
{
  "expo": {
    "scheme": "universotattoo",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "https",
              "host": "universotattoo.com.ar",
              "pathPrefix": "/auth"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "ios": {
      "associatedDomains": ["applinks:universotattoo.com.ar"]
    }
  }
}
```

### 2. Crear Pantalla de Reset Password en Mobile

```typescript
// app/(auth)/reset-password.tsx
import { useLocalSearchParams } from 'expo-router';
import { resetPassword } from '@/lib/email-service';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  
  // UI para ingresar nueva contraseña
  // Llamar a resetPassword(token, newPassword)
}
```

### 3. Actualizar Backend para Detectar Mobile

```typescript
// UniversoTattoo/app/api/forgot-password/route.ts
const { email, client } = await request.json();

const resetUrl = client === 'mobile' 
  ? `universotattoo://auth/reset-password?token=${token}`
  : `${baseUrl}/auth/reset-password?token=${token}`;
```

## Testing

### Desarrollo Local

1. Ejecutar backend web:
   ```bash
   cd UniversoTattoo
   npm run dev
   ```

2. Actualizar `.env` mobile:
   ```env
   EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000
   ```

3. Probar servicios:
   ```typescript
   // En cualquier pantalla mobile
   import { sendVerificationEmail } from '@/lib/email-service';
   
   const test = async () => {
     const result = await sendVerificationEmail('test@example.com');
     console.log(result);
   };
   ```

### Producción

1. Verificar que `EXPO_PUBLIC_API_BASE_URL` apunte a producción
2. Verificar que Resend esté configurado en el backend
3. Probar flujo completo:
   - Registro → Email de verificación
   - Olvidé contraseña → Email de reset
   - Verificar email → Activación de cuenta

## Próximos Pasos

- [ ] Implementar deep linking para abrir la app desde emails
- [ ] Crear pantalla de reset password en mobile
- [ ] Agregar email de confirmación de compra
- [ ] Agregar email de actualización de estado de pedido
- [ ] Implementar email de bienvenida personalizado
- [ ] Agregar notificaciones push complementarias

## Notas Técnicas

- **Seguridad**: Todos los tokens tienen expiración (24h para verificación, 1h para reset)
- **Rate Limiting**: Implementado tanto en backend como en respuestas al cliente
- **Error Handling**: Todos los servicios devuelven objetos `EmailResponse` consistentes
- **Offline**: Los servicios detectan falta de conexión y devuelven error apropiado
- **Logs**: Todos los errores se loguean en consola con prefijo `[email-service]`

## Soporte

Para problemas o dudas sobre el sistema de emails:
1. Verificar logs del backend Next.js
2. Verificar logs de Resend dashboard
3. Verificar configuración de variables de entorno
4. Verificar que el dominio esté verificado en Resend
