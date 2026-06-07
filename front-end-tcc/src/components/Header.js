import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function Header({ appName, user, onAvatarPress }) {
  const avatarInitials = user?.avatarInitials ?? 'EC';

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
          disabled={!onAvatarPress}
          onPress={onAvatarPress}
          hitSlop={8}
          style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
        >
          <Text style={styles.avatarText}>{avatarInitials}</Text>
        </Pressable>
        <Text style={styles.appName}>{appName}</Text>
      </View>

      <Pressable accessibilityRole="button" style={styles.notificationButton}>
        <Bell size={21} color={colors.text} strokeWidth={1.8} />
        <View style={styles.dot} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  avatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  appName: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  notificationButton: {
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
  dot: {
    position: 'absolute',
    top: 13,
    right: 14,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
  },
});
