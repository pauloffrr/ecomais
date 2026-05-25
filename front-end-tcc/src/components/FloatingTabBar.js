import { Pressable, StyleSheet, View } from 'react-native';
import { BarChart3, Gift, Home, ScanLine, UserRound } from 'lucide-react-native';
import { colors } from '../theme/colors';

const icons = {
  home: Home,
  scan: ScanLine,
  'bar-chart': BarChart3,
  gift: Gift,
  user: UserRound,
};

export default function FloatingTabBar({ tabs, activeKey, onChange }) {
  return (
    <View style={styles.wrapper}>
      {tabs.map((tab) => {
        const Icon = icons[tab.icon] || Home;
        const active = tab.key === activeKey;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.key)}
            style={[styles.item, active && styles.activeItem]}
          >
            <Icon size={23} color={active ? colors.primary : colors.inactive} strokeWidth={active ? 2.4 : 2} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 18,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: colors.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  item: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeItem: {
    backgroundColor: colors.surfaceSoft,
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
});
