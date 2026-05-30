import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function LoadingOverlay({ visible, message = 'Carregando...' }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
    padding: 24,
  },
  card: {
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.surface,
    paddingHorizontal: 22,
    paddingVertical: 20,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  message: {
    marginTop: 12,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
});
