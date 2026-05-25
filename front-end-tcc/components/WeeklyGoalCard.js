import { StyleSheet, Text, View } from 'react-native';
import ProgressBar from './ProgressBar';
import { colors } from '../theme/colors';

export default function WeeklyGoalCard({ goal }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{goal.label}</Text>
        <Text style={styles.value}>{goal.value}</Text>
      </View>
      <ProgressBar progress={goal.progress} trackColor={colors.surfaceSoft} fillColor={colors.primaryLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  value: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
});
