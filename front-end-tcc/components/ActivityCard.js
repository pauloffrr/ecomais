import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Archive, Beer, BottleWine, Cpu, FileText, Package } from 'lucide-react-native';
import { colors } from '../theme/colors';

const materialTheme = {
  pet: {
    icon: BottleWine,
    iconColor: '#2563EB',
    background: '#EAF2FF',
  },
  aluminum: {
    icon: Beer,
    iconColor: '#F97316',
    background: '#FFF0E5',
  },
  glass: {
    icon: Archive,
    iconColor: colors.primary,
    background: '#E7F8ED',
  },
  paper: {
    icon: FileText,
    iconColor: '#7C3AED',
    background: '#F2ECFF',
  },
  electronic: {
    icon: Cpu,
    iconColor: '#0891B2',
    background: '#E6F7FB',
  },
  other: {
    icon: Package,
    iconColor: colors.muted,
    background: colors.surfaceSoft,
  },
};

function ActivityCard({ item }) {
  const theme = materialTheme[item.type] || materialTheme.pet;
  const Icon = theme.icon;

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
        <Icon size={23} color={theme.iconColor} strokeWidth={2} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>
          {item.date} • {item.material}
        </Text>
      </View>

      <View style={styles.pointsBox}>
        <Text style={styles.points}>+{item.points}</Text>
        <Text style={styles.pointsLabel}>PTS</Text>
      </View>
    </View>
  );
}

export default memo(ActivityCard);

const styles = StyleSheet.create({
  card: {
    minHeight: 82,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  meta: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  pointsBox: {
    alignItems: 'flex-end',
  },
  points: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  pointsLabel: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
  },
});
