import React from 'react';
import { Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
};

export function Input({
  value, onChangeText, placeholder, label, helperText, error,
  left, right, secureTextEntry, keyboardType = 'default', autoCapitalize = 'none',
  containerStyle, inputStyle,
}: Props) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={[{ marginBottom: spacing(3) }, containerStyle]}>
      {label ? <Text style={{ color: colors.text, marginBottom: spacing(1), fontWeight: '600' }}>{label}</Text> : null}
      <View style={{ position: 'relative' }}>
        {left ? <View style={{ position: 'absolute', left: 12, top: 14 }}>{left}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[
            {
              height: 50,
              borderWidth: 1,
              borderColor: error ? colors.danger : colors.inputBorder,
              backgroundColor: colors.inputBg,
              color: colors.white,
              borderRadius: radius.md,
              paddingHorizontal: left ? 40 : 14,
              paddingRight: right ? 44 : 14,
            },
            inputStyle,
          ]}
        />
        {right ? <View style={{ position: 'absolute', right: 12, top: 14 }}>{right}</View> : null}
      </View>
      {error ? <Text style={{ color: colors.danger, marginTop: 6 }}>{error}</Text> : null}
      {!error && helperText ? <Text style={{ color: colors.textMuted, marginTop: 6 }}>{helperText}</Text> : null}
    </View>
  );
}