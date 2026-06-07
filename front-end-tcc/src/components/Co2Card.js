import { StyleSheet, Text, View } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function Co2Card({ data }) {
  return (
    <View style={styles.card}>
      <View style={styles.sideBar} />
      <View>
        <Text style={styles.label}>{data.label}</Text>
        <Text style={styles.value}>{data.value}</Text>
      </View>
      <View style={styles.iconCircle}>
        <Leaf size={28} color={colors.primary} strokeWidth={2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 128,
    borderRadius: 28,
    backgroundColor: colors.surface,
    paddingVertical: 24,
    paddingLeft: 26,
    paddingRight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  sideBar: {
    position: 'absolute',
    left: 0,
    top: 24,
    bottom: 24,
    width: 6,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  value: {
    marginTop: 8,
    color: colors.text,
    fontSize: 36,
    fontWeight: '900',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
