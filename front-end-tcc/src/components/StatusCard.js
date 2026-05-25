import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function StatusCard({ icon: Icon, title, value, variant = 'light' }) {
  const isGreen = variant === 'green';
  const content = (
    <>
      <View style={[styles.iconShell, isGreen && styles.iconShellGreen]}>
        <Icon size={23} color={isGreen ? colors.white : colors.primary} strokeWidth={2.2} />
      </View>
      <Text style={[styles.title, isGreen && styles.textOnGreen]}>{title}</Text>
      <Text style={[styles.value, isGreen && styles.textOnGreen]}>{value}</Text>
    </>
  );

  if (isGreen) {
    return (
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {content}
      </LinearGradient>
    );
  }

  return <View style={[styles.card, styles.lightCard]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 22,
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  lightCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconShell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
    marginBottom: spacing.sm,
  },
  iconShellGreen: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  value: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  textOnGreen: {
    color: colors.white,
  },
});
