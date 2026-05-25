import { StyleSheet, Text, View } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function PointsBadge({ points, tone = 'light' }) {
  const dark = tone === 'dark';

  return (
    <View style={[styles.badge, dark && styles.darkBadge]}>
      <Leaf size={13} color={dark ? colors.white : colors.primary} strokeWidth={2.2} />
      <Text style={[styles.text, dark && styles.darkText]}>{points.toLocaleString('pt-BR')} pontos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.mint,
  },
  darkBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  text: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  darkText: {
    color: colors.white,
  },
});
