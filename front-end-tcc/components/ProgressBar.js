import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export default function ProgressBar({ progress, trackColor = 'rgba(255,255,255,0.24)', fillColor = colors.white }) {
  const safeProgress = Math.max(0, Math.min(progress, 100));

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <View style={[styles.fill, { width: `${safeProgress}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 8,
  },
});
