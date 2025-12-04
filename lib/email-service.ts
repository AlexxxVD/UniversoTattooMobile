/**
 * Servicio de Email para Mobile
 * Integra con el backend web (UniversoTattoo) que maneja Resend
 */


const WEB_API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE || 'https://www.universotattoo.com.ar';

interface EmailResponse {
  success?: boolean;
  error?: string;
  message?: string;
  remainingMinutes?: number;
}

/**
 * Enviar email de verificación de cuenta
 */
export async function sendVerificationEmail(email: string): Promise<EmailResponse> {
  try {
    const response = await fetch(`${WEB_API_BASE}/api/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al enviar email de verificación',
        remainingMinutes: data.remainingMinutes,
      };
    }

    return {
      success: true,
      message: data.message || 'Email de verificación enviado',
    };
  } catch (error) {
    console.error('[email-service] Error enviando verificación:', error);
    return {
      success: false,
      error: 'Error de conexión. Verifica tu internet.',
    };
  }
}

/**
 * Solicitar recuperación de contraseña
 */
export async function requestPasswordReset(email: string): Promise<EmailResponse> {
  try {
    const response = await fetch(`${WEB_API_BASE}/api/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al solicitar recuperación de contraseña',
      };
    }

    return {
      success: true,
      message: data.message || 'Email de recuperación enviado',
    };
  } catch (error) {
    console.error('[email-service] Error solicitando reset:', error);
    return {
      success: false,
      error: 'Error de conexión. Verifica tu internet.',
    };
  }
}

/**
 * Restablecer contraseña con token
 */
export async function resetPassword(token: string, newPassword: string): Promise<EmailResponse> {
  try {
    const response = await fetch(`${WEB_API_BASE}/api/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password: newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al restablecer contraseña',
      };
    }

    return {
      success: true,
      message: data.message || 'Contraseña restablecida exitosamente',
    };
  } catch (error) {
    console.error('[email-service] Error reseteando contraseña:', error);
    return {
      success: false,
      error: 'Error de conexión. Verifica tu internet.',
    };
  }
}

/**
 * Verificar email con token
 */
export async function verifyEmail(token: string): Promise<EmailResponse> {
  try {
    const response = await fetch(`${WEB_API_BASE}/api/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al verificar email',
      };
    }

    return {
      success: true,
      message: data.message || 'Email verificado exitosamente',
    };
  } catch (error) {
    console.error('[email-service] Error verificando email:', error);
    return {
      success: false,
      error: 'Error de conexión. Verifica tu internet.',
    };
  }
}

/**
 * Enviar email de confirmación de orden
 */
export async function sendOrderConfirmation(orderNumber: string): Promise<EmailResponse> {
  try {
    const response = await fetch(`${WEB_API_BASE}/api/orders/send-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderNumber }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al enviar confirmación de orden',
      };
    }

    return {
      success: true,
      message: data.message || 'Confirmación de orden enviada',
    };
  } catch (error) {
    console.error('[email-service] Error enviando confirmación:', error);
    return {
      success: false,
      error: 'Error de conexión. Verifica tu internet.',
    };
  }
}
