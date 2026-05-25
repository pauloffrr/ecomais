import { StyleSheet, View } from 'react-native';
import { Leaf, Recycle, Sparkles } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function EcoBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />
      <Leaf size={92} color={colors.primary} strokeWidth={1.2} style={styles.leafOne} />
      <Leaf size={62} color={colors.primaryDark} strokeWidth={1.1} style={styles.leafTwo} />
      <Recycle size={44} color={colors.primary} strokeWidth={1.2} style={styles.recycle} />
      <Sparkles size={26} color={colors.primaryDark} strokeWidth={1.3} style={styles.sparkle} />
      <View style={[styles.circuitLine, styles.lineOne]} />
      <View style={[styles.circuitLine, styles.lineTwo]} />
      <View style={[styles.node, styles.nodeOne]} />
      <View style={[styles.node, styles.nodeTwo]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.mint,
    opacity: 0.58,
  },
  glowTop: {
    top: -72,
    right: -72,
  },
  glowBottom: {
    left: -84,
    bottom: 24,
  },
  leafOne: {
    position: 'absolute',
    top: 64,
    left: -20,
    opacity: 0.07,
    transform: [{ rotate: '-22deg' }],
  },
  leafTwo: {
    position: 'absolute',
    bottom: 120,
    right: 18,
    opacity: 0.08,
    transform: [{ rotate: '18deg' }],
  },
  recycle: {
    position: 'absolute',
    top: 210,
    right: 28,
    opacity: 0.07,
  },
  sparkle: {
    position: 'absolute',
    top: 120,
    right: 78,
    opacity: 0.18,
  },
  circuitLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  lineOne: {
    top: 168,
    right: 0,
    width: 116,
  },
  lineTwo: {
    bottom: 212,
    left: 0,
    width: 138,
  },
  node: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    opacity: 0.28,
  },
  nodeOne: {
    top: 165,
    right: 112,
  },
  nodeTwo: {
    bottom: 209,
    left: 132,
  },
});
