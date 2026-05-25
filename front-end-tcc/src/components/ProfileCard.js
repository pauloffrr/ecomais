import { StyleSheet, Text, View } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function ProfileCard({ user }) {
  return (
    <View style={styles.card}>
      <View style={styles.decorativeCircle} />
      <View style={styles.decorativeDot} />

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user.avatarInitials}</Text>
      </View>

      <View style={styles.nameRow}>
        <Text style={styles.name}>{user.name}</Text>
        {user.verified ? (
          <View style={styles.verifiedBadge}>
            <Leaf size={14} color={colors.white} strokeWidth={2.4} />
          </View>
        ) : null}
      </View>

      <Text style={styles.email}>{user.email}</Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{user.badge}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  decorativeCircle: {
    position: 'absolute',
    top: -38,
    right: -32,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.primaryLight,
    opacity: 0.14,
  },
  decorativeDot: {
    position: 'absolute',
    top: 36,
    right: 34,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    opacity: 0.22,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  avatarText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '900',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  email: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  badge: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
});
