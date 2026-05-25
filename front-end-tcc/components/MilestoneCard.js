import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function MilestoneCard({ nextLevelPoints, progressPercentage }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PRÓXIMO MARCO</Text>
        <Text style={styles.percentage}>{progressPercentage}%</Text>
      </View>

      <Text style={styles.description}>{nextLevelPoints} PONTOS ATÉ O NÍVEL 15</Text>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${progressPercentage}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  percentage: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  description: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
});
