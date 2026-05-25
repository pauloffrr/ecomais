import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { TicketPercent } from 'lucide-react-native';
import PointsBadge from './PointsBadge';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function CouponCard({ coupon, onRedeem, onOpen }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue) => {
    Animated.spring(scale, {
      toValue,
      friction: 6,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onOpen} onPressIn={() => animate(0.985)} onPressOut={() => animate(1)} style={styles.card}>
        <View style={styles.iconShell}>
          <TicketPercent size={22} color={colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.content}>
          <Text style={styles.partner}>{coupon.partner}</Text>
          <Text style={styles.title}>{coupon.title}</Text>
          <Text style={styles.description}>{coupon.description}</Text>
          <View style={styles.footer}>
            <PointsBadge points={coupon.points} />
            <Pressable accessibilityRole="button" onPress={onRedeem} style={styles.button}>
              <Text style={styles.buttonText}>Resgatar</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  iconShell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  content: {
    flex: 1,
  },
  partner: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  description: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
});
