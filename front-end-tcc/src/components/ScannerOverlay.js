import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export default function ScannerOverlay() {
  const scanY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        }),
        Animated.timing(scanY, {
          toValue: 0,
          duration: 1700,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [scanY]);

  const translateY = scanY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 196],
  });

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.dimTop} />
      <View style={styles.middle}>
        <View style={styles.dimSide} />
        <View style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
        </View>
        <View style={styles.dimSide} />
      </View>
      <View style={styles.dimBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dimTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  middle: {
    height: 230,
    flexDirection: 'row',
  },
  dimSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  dimBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  frame: {
    width: 230,
    height: 230,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(57,211,83,0.45)',
    shadowColor: colors.primaryLight,
    shadowOpacity: 0.75,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: colors.primaryLight,
  },
  topLeft: {
    top: 12,
    left: 12,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 12,
    right: 12,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
    shadowColor: colors.primaryLight,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});
