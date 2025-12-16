import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme';

type Props = {
  title: string;
  canGoBack?: boolean;
  right?: React.ReactNode;
};

export function HeaderBar({ title, canGoBack = false, right }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 }}>
      {canGoBack ? (
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.link} />
        </Pressable>
      ) : (
        <View style={{ width: 24 }} />
      )}
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 }}>{title}</Text>
      {right}
    </View>
  );
}