import { StyleSheet, Text, View } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

export default function LogoMark({ compact = false }) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.logo, compact && styles.logoCompact]}
      >
        <Leaf size={compact ? 30 : 38} color={colors.white} strokeWidth={2.2} />
      </LinearGradient>
      <Text style={[styles.name, compact && styles.nameCompact]}>Eco+</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  logoCompact: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  name: {
    marginTop: 18,
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0,
  },
  nameCompact: {
    marginTop: 12,
    fontSize: 28,
  },
});
