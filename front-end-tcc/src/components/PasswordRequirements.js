import { Check, X } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export const getPasswordRules = (password = '') => [
  {
    key: 'length',
    label: 'Minimo de 8 caracteres',
    valid: password.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'Uma letra maiuscula',
    valid: /[A-Z]/.test(password),
  },
  {
    key: 'lowercase',
    label: 'Uma letra minuscula',
    valid: /[a-z]/.test(password),
  },
  {
    key: 'number',
    label: 'Um numero',
    valid: /\d/.test(password),
  },
];

export const isPasswordValid = (password) =>
  getPasswordRules(password).every((rule) => rule.valid);

export default function PasswordRequirements({ password, style }) {
  const rules = getPasswordRules(password);

  return (
    <View style={[styles.container, style]}>
      {rules.map((rule) => (
        <View key={rule.key} style={styles.rule}>
          <View style={[styles.icon, rule.valid ? styles.validIcon : styles.invalidIcon]}>
            {rule.valid ? (
              <Check size={12} color={colors.white} strokeWidth={3} />
            ) : (
              <X size={12} color={colors.white} strokeWidth={3} />
            )}
          </View>
          <Text style={[styles.text, rule.valid ? styles.validText : styles.invalidText]}>
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: -4,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  rule: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validIcon: {
    backgroundColor: colors.primary,
  },
  invalidIcon: {
    backgroundColor: colors.danger,
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  validText: {
    color: colors.primary,
  },
  invalidText: {
    color: colors.muted,
  },
});
