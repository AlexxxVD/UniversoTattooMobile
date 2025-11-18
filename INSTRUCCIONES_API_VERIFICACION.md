# API de Verificación de Email para Registro

Necesitás crear este archivo en tu proyecto web:

## Archivo: `app/api/auth/send-verification/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getServiceSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() {
          return undefined;
        },
        set() {},
        remove() {},
      },
    }
  );
}

/**
 * API para enviar email de verificación después del registro
 * POST /api/auth/send-verification
 * Body: { email: string, name: string, userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Email y userId son requeridos" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 1. Generar código de 6 dígitos
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    console.log(`[Send Verification] Código generado para ${email}: ${code}`);
    console.log(`[Send Verification] Expira: ${expiresAt.toISOString()}`);

    // 2. Guardar código en la base de datos
    // Primero eliminar códigos anteriores del mismo email
    await supabase
      .from("CodigoVerificacion")
      .delete()
      .eq("email", email.toLowerCase())
      .eq("tipo", "registro");

    // Insertar nuevo código
    const { error: insertError } = await supabase
      .from("CodigoVerificacion")
      .insert({
        email: email.toLowerCase(),
        codigo: code,
        tipo: "registro",
        expira_en: expiresAt.toISOString(),
        user_id: userId,
      });

    if (insertError) {
      console.error("[Send Verification] Error guardando código:", insertError);
      return NextResponse.json(
        { error: "Error guardando código" },
        { status: 500 }
      );
    }

    // 3. Enviar email con el código usando Resend
    try {
      await resend.emails.send({
        from: "Universo Tattoo <onboarding@resend.dev>",
        to: email,
        subject: "Verifica tu cuenta - Universo Tattoo",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
                <tr>
                  <td align="center" style="padding: 20px;">
                    <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <tr>
                        <td style="background: linear-gradient(90deg, #6366f1, #8b5cf6); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                          <h1 style="margin: 0; font-size: 32px; color: #ffffff; font-weight: bold;">🪐 Verifica tu Cuenta</h1>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 40px;">
                          <h2 style="color: #6366f1; font-size: 24px; margin-top: 0;">¡Hola ${name || ''}!</h2>
                          
                          <p style="line-height: 1.8; margin-bottom: 20px; color: #374151; font-size: 16px;">
                            Gracias por registrarte en <strong>Universo Tattoo</strong>. Para completar tu registro, ingresa este código en la app:
                          </p>
                          
                          <div style="background: linear-gradient(135deg, #f3e8ff, #fce7f3); border: 2px solid #a855f7; padding: 30px; margin: 30px 0; border-radius: 12px; text-align: center;">
                            <p style="margin: 0 0 10px; color: #6b21a8; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                              Tu código de verificación
                            </p>
                            <p style="margin: 0; font-size: 48px; font-weight: bold; color: #a855f7; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                              ${code}
                            </p>
                            <p style="margin: 15px 0 0; color: #9333ea; font-size: 13px;">
                              ⏱️ Válido por 24 horas
                            </p>
                          </div>
                          
                          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
                            <p style="margin: 0 0 10px; color: #92400e; font-weight: 600; font-size: 14px;">
                              ⚠️ Importante
                            </p>
                            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                              Si no solicitaste esta cuenta, puedes ignorar este correo de forma segura.
                            </p>
                          </div>
                          
                          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
                              ¿Necesitas ayuda? Contáctanos:
                            </p>
                            <p style="color: #6366f1; font-size: 14px; margin: 5px 0;">
                              📱 WhatsApp: <a href="https://api.whatsapp.com/send?phone=543442550581&text=Hola%20Universo%20Tattoo%20quiero%20más%20información!%20🪐⚡" style="color: #6366f1; text-decoration: none;">+54 3442 550581</a>
                            </p>
                            <p style="color: #6366f1; font-size: 14px; margin: 5px 0;">
                              📍 Dirección: Bartolomé Mitre 587, Entre Ríos
                            </p>
                          </div>
                          
                          <div style="margin-top: 30px; text-align: center;">
                            <p style="color: #6366f1; font-weight: bold; font-size: 18px; margin: 0;">¡Gracias por unirte a Universo Tattoo!</p>
                          </div>
                          
                          <div style="margin-top: 20px; text-align: center;">
                            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                              Este es un email automático, por favor no respondas a este mensaje.
                            </p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      });

      console.log(`[Send Verification] ✅ Email enviado a ${email}`);
    } catch (emailError) {
      console.error("[Send Verification] Error enviando email:", emailError);
      return NextResponse.json(
        { error: "Error enviando email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Código de verificación enviado",
    });
  } catch (error) {
    console.error("[Send Verification] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
```

## Archivo: `app/api/auth/verify-code/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function getServiceSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() {
          return undefined;
        },
        set() {},
        remove() {},
      },
    }
  );
}

/**
 * API para verificar código de registro
 * POST /api/auth/verify-code
 * Body: { email: string, code: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email y código son requeridos" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    console.log(`[Verify Code] Verificando código para: ${email}`);

    // 1. Buscar el código en la base de datos
    const { data: codigoData, error: codigoError } = await supabase
      .from("CodigoVerificacion")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("tipo", "registro")
      .maybeSingle();

    if (codigoError || !codigoData) {
      console.error("[Verify Code] Código no encontrado");
      return NextResponse.json(
        { error: "Código no encontrado" },
        { status: 404 }
      );
    }

    // 2. Verificar si expiró
    const now = new Date();
    const expiresAt = new Date(codigoData.expira_en);

    if (now > expiresAt) {
      console.error("[Verify Code] Código expirado");
      await supabase
        .from("CodigoVerificacion")
        .delete()
        .eq("email", email.toLowerCase());

      return NextResponse.json(
        { error: "Código expirado. Solicita uno nuevo" },
        { status: 410 }
      );
    }

    // 3. Verificar el código
    if (codigoData.codigo !== code) {
      console.error("[Verify Code] Código incorrecto");
      return NextResponse.json(
        { error: "Código incorrecto" },
        { status: 401 }
      );
    }

    // 4. Marcar usuario como verificado en User
    if (codigoData.user_id) {
      const { error: updateError } = await supabase
        .from("User")
        .update({ emailVerified: new Date().toISOString() })
        .eq("id", codigoData.user_id);

      if (updateError) {
        console.error("[Verify Code] Error actualizando usuario:", updateError);
      } else {
        console.log("[Verify Code] Usuario verificado correctamente");
      }
    }

    // 5. Eliminar el código usado
    await supabase
      .from("CodigoVerificacion")
      .delete()
      .eq("email", email.toLowerCase())
      .eq("tipo", "registro");

    console.log(`[Verify Code] ✅ Email verificado: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Email verificado correctamente",
    });
  } catch (error) {
    console.error("[Verify Code] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
```

## Pasos para implementar:

1. Crear los dos archivos mencionados arriba en tu proyecto web
2. Asegurarte que existe la tabla `CodigoVerificacion` con estos campos:
   - `id` (serial/autoincrement)
   - `email` (text)
   - `codigo` (text)
   - `tipo` (text) - puede ser "registro" o "login_checkout"
   - `expira_en` (timestamp)
   - `user_id` (uuid, nullable)
   - `created_at` (timestamp, default now())

3. Opcionalmente agregar campo `emailVerified` a la tabla `User` si aún no existe

4. Una vez implementado, la app mobile podrá:
   - Registrar usuario
   - Recibir código por email
   - Verificar el código
   - Marcar email como verificado
