import * as Linking from 'expo-linking';
import { Slot, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { toastConfig } from '../components/ui/ToastConfig';

// Mapeo de rutas web a rutas de la app
function mapWebRouteToAppRoute(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const params = parsed.searchParams;

    // /auth/reset-password?token=xxx -> /(auth)/reset-password?token=xxx
    if (path.includes('/auth/reset-password') || path.includes('/reset-password')) {
      const token = params.get('token');
      if (token) {
        return `/(auth)/reset-password?token=${token}`;
      }
    }

    // /auth/verify-email?token=xxx -> /(auth)/confirm?token=xxx
    if (path.includes('/auth/verify-email') || path.includes('/verify-email')) {
      const token = params.get('token');
      if (token) {
        return `/(auth)/confirm?token=${token}`;
      }
    }

    // /auth/login -> /(auth)
    if (path.includes('/auth/login') || path.includes('/login')) {
      return '/(auth)';
    }

    return null;
  } catch {
    return null;
  }
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Manejar deep links cuando la app está abierta
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] URL recibida:', url);
      const appRoute = mapWebRouteToAppRoute(url);
      if (appRoute) {
        console.log('[DeepLink] Navegando a:', appRoute);
        router.replace(appRoute as any);
      }
    });

    // Manejar deep link inicial (cuando la app se abre desde un link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] URL inicial:', url);
        const appRoute = mapWebRouteToAppRoute(url);
        if (appRoute) {
          console.log('[DeepLink] Navegando a:', appRoute);
          // Pequeño delay para asegurar que el router esté listo
          setTimeout(() => {
            router.replace(appRoute as any);
          }, 100);
        }
      }
    });

    return () => subscription.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
        <Toast 
          config={toastConfig} 
          position="top" 
          topOffset={Platform.select({ ios: 50, android: 40 })} 
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}