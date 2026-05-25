import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function AppHeader({ user, onAvatarPress }) {
  return (
    <View style={styles.appHeader}>
      <View style={styles.appLeft}>
        <Pressable accessibilityRole="button" onPress={onAvatarPress} style={styles.smallAvatar}>
          <Text style={styles.smallAvatarText}>{user.avatarInitials}</Text>
        </Pressable>
        <Text style={styles.brand}>Eco-Tech</Text>
      </View>
      <Pressable accessibilityRole="button" style={styles.notification}>
        <Bell size={21} color={colors.text} strokeWidth={1.9} />
        <View style={styles.notificationDot} />
      </Pressable>
    </View>
  );
}

export function BackHeader({ title, onBack }) {
  return (
    <View style={styles.backHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={10} style={styles.backButton}>
        <ChevronLeft size={24} color={colors.primary} strokeWidth={2.2} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.backSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  smallAvatarText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  brand: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  notification: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 13,
    right: 14,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  backSpacer: {
    width: 44,
  },
});
