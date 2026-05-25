import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { BusFront, Coffee, TreePine } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PointsBadge from './PointsBadge';
import { colors, gradients } from '../theme/colors';
import { spacing } from '../theme/spacing';

const visuals = {
  bus: BusFront,
  trees: TreePine,
  coffee: Coffee,
};

export default function RewardCard({ reward, onRedeem, onOpen }) {
  const scale = useRef(new Animated.Value(1)).current;
  const Icon = visuals[reward.visual] ?? TreePine;

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
        <View style={styles.visual}>
          <LinearGradient colors={gradients.primary} style={styles.visualGradient}>
            <Icon size={46} color={colors.white} strokeWidth={2} />
          </LinearGradient>
        </View>

        <View style={styles.content}>
          <Text style={styles.partner}>{reward.partner}</Text>
          <Text style={styles.title}>{reward.title}</Text>
          <Text style={styles.description}>{reward.description}</Text>
          <View style={styles.footer}>
            <PointsBadge points={reward.points} />
            <Pressable accessibilityRole="button" onPress={onRedeem} style={styles.button}>
              <Text style={styles.buttonText}>{reward.actionLabel}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  visual: {
    height: 128,
    padding: spacing.md,
  },
  visualGradient: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  partner: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  button: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
});
