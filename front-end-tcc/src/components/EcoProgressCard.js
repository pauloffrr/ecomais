import { StyleSheet, Text, View } from 'react-native';
import { TreePine } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function EcoProgressCard({ data }) {
  const trees = Array.from({ length: data.treesTotal });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>{data.level}</Text>
        </View>
        <View style={styles.trees}>
          {trees.map((_, index) => (
            <TreePine
              key={`tree-${index}`}
              size={20}
              color={index < data.treesCompleted ? colors.primary : colors.border}
              fill={index < data.treesCompleted ? colors.primary : 'transparent'}
              strokeWidth={1.8}
            />
          ))}
        </View>
      </View>

      <View style={styles.progressMeta}>
        <Text style={styles.progressLabel}>{data.progressLabel}</Text>
        <Text style={styles.progressValue}>{data.progress}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${data.progress}%` }]} />
      </View>
      <Text style={styles.hint}>{data.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 22,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  trees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  progressMeta: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  progressValue: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  hint: {
    marginTop: 14,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
