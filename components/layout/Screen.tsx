import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  safeTop?: boolean;
};

export function Screen({ children, scroll = true, contentStyle, safeTop = true }: Props) {
  const { colors } = useTheme();
  const Content = scroll ? ScrollView : View;

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <LinearGradient
        colors={['rgba(124,58,237,0.10)', 'transparent', 'rgba(219,39,119,0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <Content contentContainerStyle={[{ padding: 16 }, contentStyle]} style={{ flex: 1 }}>
          {children}
        </Content>
      </SafeAreaView>
    </View>
  );
}