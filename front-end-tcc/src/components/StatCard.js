import { StyleSheet, Text, View } from 'react-native';
import { Medal, Recycle } from 'lucide-react-native';
import { colors } from '../theme/colors';

const icons = {
  recycle: Recycle,
  medal: Medal,
};

export default function StatCard({ item }) {
  const Icon = icons[item.icon] || Recycle;

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
    minHeight: 142,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
  },
  value: {
    marginTop: 6,
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
});
