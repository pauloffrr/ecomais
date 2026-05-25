import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function StatusCard({ icon: Icon, title, value, isGreen = false }) {
  return (
    <View style={[styles.container, isGreen && styles.containerGreen]}>
      {isGreen && (
        <View style={styles.iconBackgroundGreen}>
          <Icon size={24} color={colors.white} strokeWidth={2} />
        </View>
      )}
      {!isGreen && (
        <View style={styles.iconBackgroundWhite}>
          <Icon size={24} color={colors.primary} strokeWidth={2} />
        </View>
      )}

      <Text style={[styles.title, isGreen && styles.titleGreen]}>{title}</Text>
      <Text style={[styles.value, isGreen && styles.valueGreen]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  containerGreen: {
    backgroundColor: colors.primary,
  },
  iconBackgroundGreen: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconBackgroundWhite: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  titleGreen: {
    color: colors.white,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  valueGreen: {
    color: colors.white,
  },
});
