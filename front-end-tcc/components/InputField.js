import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors } from '../theme/colors';

const InputField = forwardRef(function InputField(
  {
    icon,
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    isPassword,
    keyboardType,
    autoCapitalize = 'none',
    error,
    returnKeyType,
    onSubmitEditing,
    textContentType,
    editable = true,
    style,
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const passwordField = Boolean(secureTextEntry || isPassword);
  const [hidden, setHidden] = useState(passwordField);
  const hasError = Boolean(error);
  const Icon = typeof icon === 'function' ? icon : null;

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          focused && styles.focused,
          hasError && styles.error,
          !editable && styles.disabledShell,
        ]}
      >
        <View style={styles.icon}>
          {Icon ? <Icon size={20} color={colors.primary} strokeWidth={1.9} /> : icon}
        </View>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9BAAA2"
          secureTextEntry={passwordField ? hidden : false}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          textContentType={textContentType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          style={[styles.input, !editable && styles.disabledInput]}
        />
        {passwordField ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
            onPress={() => setHidden((current) => !current)}
            hitSlop={10}
            style={styles.eyeButton}
          >
            {hidden ? (
              <Eye size={20} color={colors.muted} strokeWidth={1.8} />
            ) : (
              <EyeOff size={20} color={colors.primary} strokeWidth={1.8} />
            )}
          </Pressable>
        ) : null}
      </View>
      {hasError ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

export default InputField;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 14,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  focused: {
    borderColor: colors.primaryLight,
    shadowOpacity: 0.12,
  },
  error: {
    borderColor: colors.danger,
  },
  disabledShell: {
    backgroundColor: colors.surfaceSoft,
  },
  icon: {
    width: 26,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 12,
    fontWeight: '600',
  },
  disabledInput: {
    color: colors.muted,
  },
  eyeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
});
