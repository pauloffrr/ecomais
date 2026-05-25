import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function MenuItem({ icon: Icon, label, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue) => {
    Animated.spring(scale, {
      toValue,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => animate(0.98)}
        onPressOut={() => animate(1)}
        style={styles.item}
      >
        <View style={styles.left}>
          <View style={styles.iconShell}>
            <Icon size={20} color={colors.primary} strokeWidth={2.1} />
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>
        <ChevronRight size={20} color={colors.muted} strokeWidth={2.1} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
});
