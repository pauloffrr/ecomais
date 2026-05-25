import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Info, Sprout } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function TipCard({ tip }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Sprout size={24} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.text}>{tip.text}</Text>
      <Pressable accessibilityRole="button" style={styles.infoButton}>
        <Info size={19} color={colors.white} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 86,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  infoButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
