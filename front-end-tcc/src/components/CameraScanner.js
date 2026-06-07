import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ScannerOverlay from './ScannerOverlay';
import { colors } from '../theme/colors';

export default function CameraScanner({ onScanned, processing, disabled = false }) {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={[styles.cameraShell, styles.permissionState]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.cameraShell, styles.permissionState]}>
        <Text style={styles.permissionTitle}>Permissão da câmera</Text>
        <Text style={styles.permissionText}>Autorize a câmera para escanear o QR Code da máquina.</Text>
      </View>
    );
  }

  return (
    <View style={styles.cameraShell}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={processing || disabled ? undefined : onScanned}
      />
      <ScannerOverlay />
      {processing ? (
        <View style={styles.processing}>
          <ActivityIndicator color={colors.white} />
          <Text style={styles.processingText}>Validando máquina...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cameraShell: {
    height: 360,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#111827',
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 9,
  },
  permissionState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  permissionText: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  processing: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  processingText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
