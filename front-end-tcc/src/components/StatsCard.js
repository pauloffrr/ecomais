import { StyleSheet, Text, View } from 'react-native';
import { Leaf, Recycle } from 'lucide-react-native';
import { colors } from '../theme/colors';

const icons = {
  leaf: Leaf,
  recycle: Recycle,
};

export default function StatsCard({ item }) {
  const Icon = icons[item.icon] || Leaf;

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon size={22} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.label}>{item.label}</Text>
      <Text style={styles.value}>{item.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 118,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  value: {
    marginTop: 6,
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
});
