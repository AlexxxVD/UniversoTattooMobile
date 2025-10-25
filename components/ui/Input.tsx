import React, { forwardRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

export type InputProps = TextInputProps & {
  label?: string;
  helperText?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      helperText,
      error,
      containerStyle,
      inputStyle,
      labelStyle,
      ...rest // incluye editable, placeholder, secureTextEntry, keyboardType, etc.
    },
    ref
  ) => {
    return (
      <View style={[styles.container, containerStyle]}>
        {!!label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            inputStyle,
            !!error && { borderColor: '#ef4444' },
          ]}
          {...rest}
        />
        {!!error ? (
          <Text style={styles.error}>{error}</Text>
        ) : !!helperText ? (
          <Text style={styles.helper}>{helperText}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export default Input;

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { color: '#E5E7EB', fontSize: 12, fontWeight: '600' },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2F3A',
    backgroundColor: '#11151B',
    color: '#F3F4F6',
    paddingHorizontal: 12,
  },
  helper: { color: '#A0A8B0', fontSize: 12 },
  error: { color: '#EF4444', fontSize: 12 },
});