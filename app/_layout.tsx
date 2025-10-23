import { Slot } from 'expo-router';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
      <Toast position="top" topOffset={Platform.select({ ios: 50, android: 20 })} />
    </GestureHandlerRootView>
  );
}