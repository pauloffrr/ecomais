import { StyleSheet, Text, View } from 'react-native';
import { Gift, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function RewardBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.decorativeCircle} />
      <View style={styles.copy}>
        <Text style={styles.title}>Troque seu impacto por recompensas</Text>
        <Text style={styles.subtitle}>
          Cada item reciclado aproxima voce de beneficios exclusivos com parceiros sustentaveis.
        </Text>
      </View>
      <LinearGradient colors={['#39D353', '#009245']} style={styles.giftShell}>
        <Gift size={42} color={colors.white} strokeWidth={2.1} />
        <Sparkles size={17} color={colors.white} strokeWidth={2.2} style={styles.sparkle} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  decorativeCircle: {
    position: 'absolute',
    right: -42,
    top: -46,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primaryLight,
    opacity: 0.22,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  giftShell: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  sparkle: {
    position: 'absolute',
    top: 16,
    right: 15,
  },
});
