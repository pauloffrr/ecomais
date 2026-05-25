import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Keyboard, RefreshCcw } from 'lucide-react-native';
import CameraScanner from '../components/CameraScanner';
import FloatingTabBar from '../components/FloatingTabBar';
import Header from '../components/Header';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import WeeklyGoalCard from '../components/WeeklyGoalCard';
import { colors } from '../theme/colors';
import mockScannerData from '../data/mockScannerData.json';

export default function ScannerScreen({ navigation }) {
  const [scannerData, setScannerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setScannerData(mockScannerData);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  const data = useMemo(() => scannerData ?? mockScannerData, [scannerData]);

  const handleScanned = useCallback(({ data: code }) => {
    setScannedCode(code);
    setProcessing(true);

    setTimeout(() => {
      setProcessing(false);
      Alert.alert(
        'QR Code lido',
        `Código da máquina: ${code}\n\nPronto para validar este código na API REST.`
      );
    }, 900);
  }, []);

  const handleTabChange = (key) => {
    if (key === 'home') {
      navigation.navigate('Home');
      return;
    }

    if (key === 'history' || key === 'stats') {
      navigation.navigate('History');
      return;
    }

    if (key === 'profile') {
      navigation.navigate('Profile');
      return;
    }

    if (key === 'rewards') {
      navigation.navigate('Rewards');
      return;
    }

    if (key !== 'scanner') {
      Alert.alert('Em breve', 'Esta área está pronta para receber a próxima tela.');
    }
  };

  const handleManualCode = () => {
    Alert.alert('Código manual', 'Fluxo mockado. Pronto para tela de digitação manual.');
  };

  const handleScanAgain = () => {
    setScannedCode(null);
    setProcessing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <Header
              appName="Eco+"
              user={data.user}
              onAvatarPress={() => navigation.navigate('Profile')}
            />

            <View style={styles.badgeWrapper}>
              <StatusBadge label={data.connection.label} />
            </View>

            <View style={styles.copy}>
              <Text style={styles.title}>{data.scanner.title}</Text>
              <Text style={styles.subtitle}>{data.scanner.subtitle}</Text>
            </View>

            <CameraScanner
              onScanned={handleScanned}
              processing={processing}
              disabled={Boolean(scannedCode)}
            />

            {scannedCode ? (
              <View style={styles.scanResult}>
                <Text style={styles.scannedText}>Último código lido: {scannedCode}</Text>
                <Pressable accessibilityRole="button" onPress={handleScanAgain} style={styles.scanAgainButton}>
                  <RefreshCcw size={15} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.scanAgainText}>Escanear novamente</Text>
                </Pressable>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingCard} />
            ) : (
              <>
                <View style={styles.statsRow}>
                  {data.stats.map((item) => (
                    <StatsCard key={item.id} item={item} />
                  ))}
                </View>

                <View style={styles.goalWrapper}>
                  <WeeklyGoalCard goal={data.weeklyGoal} />
                </View>
              </>
            )}

            <Pressable accessibilityRole="button" onPress={handleManualCode} style={styles.manualButton}>
              <Keyboard size={18} color={colors.primary} strokeWidth={2.1} />
              <Text style={styles.manualText}>Digitar código manualmente</Text>
            </Pressable>
          </View>
        </ScrollView>

        <FloatingTabBar tabs={data.tabs} activeKey="scanner" onChange={handleTabChange} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 112,
  },
  container: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  badgeWrapper: {
    marginTop: 24,
  },
  copy: {
    marginTop: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  scanResult: {
    marginTop: 12,
    alignItems: 'center',
    gap: 6,
  },
  scannedText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  scanAgainButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  scanAgainText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 22,
  },
  goalWrapper: {
    marginTop: 14,
  },
  loadingCard: {
    height: 118,
    borderRadius: 24,
    backgroundColor: colors.surface,
    marginTop: 22,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  manualButton: {
    minHeight: 50,
    marginTop: 18,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
});
