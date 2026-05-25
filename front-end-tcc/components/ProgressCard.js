import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf } from 'lucide-react-native';
import ProgressBar from './ProgressBar';
import { colors, gradients } from '../theme/colors';

export default function ProgressCard({ summary }) {
  return (
    <LinearGradient
      colors={[colors.primaryDark, gradients.primary[0], gradients.primary[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.decorOne} />
      <View style={styles.decorTwo} />
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>{summary.label}</Text>
          <Text style={styles.value}>{summary.value}</Text>
        </View>
        <View style={styles.iconCircle}>
          <Leaf size={25} color={colors.white} strokeWidth={2.1} />
        </View>
      </View>

      <View style={styles.goalRow}>
        <Text style={styles.goal}>{summary.goal}</Text>
        <Text style={styles.percent}>{summary.progress}%</Text>
      </View>
      <ProgressBar progress={summary.progress} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 190,
    borderRadius: 32,
    padding: 24,
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  decorOne: {
    position: 'absolute',
    right: -42,
    top: -44,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  decorTwo: {
    position: 'absolute',
    left: -34,
    bottom: -52,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '900',
  },
  value: {
    marginTop: 10,
    color: colors.white,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '900',
    maxWidth: 250,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalRow: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goal: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '800',
  },
  percent: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
});
