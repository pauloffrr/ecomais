import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CheckCircle2, Keyboard, PackageCheck, RefreshCcw, X } from 'lucide-react-native';
import CameraScanner from '../components/CameraScanner';
import FloatingTabBar from '../components/FloatingTabBar';
import Header from '../components/Header';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import WeeklyGoalCard from '../components/WeeklyGoalCard';
import { useAuth } from '../hooks/useAuth';
import { useScanner } from '../hooks/useScanner';
import { colors } from '../theme/colors';

const SCANNER_TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'scanner', label: 'Scanner', icon: 'scan' },
  { key: 'history', label: 'Historico', icon: 'bar-chart' },
  { key: 'rewards', label: 'Recompensas', icon: 'gift' },
  { key: 'profile', label: 'Perfil', icon: 'user' },
];

const getAvatarInitial = (fullName) => {
  const initial = fullName?.trim()?.charAt(0);
  return initial ? initial.toUpperCase() : 'E';
};

const formatDateTime = (date) =>
  date
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    : '';

const getSessionErrorMessage = (error, fallback) => {
  const detail = String(error?.response?.data?.detail ?? '').toLowerCase();

  if (error?.message === 'QR_INVALID') return 'QR invalido.';
  if (error?.response?.status === 404) return 'Maquina nao encontrada.';
  if (error?.response?.status === 409 && detail.includes('active session')) {
    return 'Voce ja possui uma sessao ativa.';
  }
  if (error?.response?.status === 409) return 'Esta estacao esta indisponivel no momento.';
  if (error?.response?.status >= 500 || !error?.response) return 'Falha ao conectar com a estacao.';

  return fallback || 'Falha ao conectar com a estacao.';
};

const MATERIAL_TRANSLATIONS = {
  'Aluminum Can': 'Lata de aluminio',
  Cardboard: 'Papelao',
  'Clear Glass Bottle': 'Garrafa de vidro transparente',
  'Colored Glass Bottle': 'Garrafa de vidro colorido',
  'Electronic Waste': 'Lixo eletronico',
  'HDPE Plastic Container': 'Embalagem plastica HDPE',
  'Newspaper & Paper': 'Jornal e papel',
  'Organic Waste': 'Residuos organicos',
  'PET Plastic Bottle': 'Garrafa PET',
  'Steel Can': 'Lata de aco',
};

const getMaterialNamePtBr = (material) =>
  MATERIAL_TRANSLATIONS[material.name] ?? material.name;

function MachineInfoCard({ session, connectedAt }) {
  const machine = session?.machine;

  if (!machine) return null;

  return (
    <View style={styles.machineCard}>
      <View style={styles.machineIcon}>
        <CheckCircle2 size={22} color={colors.primary} strokeWidth={2.2} />
      </View>
      <View style={styles.machineContent}>
        <Text style={styles.machineTitle}>{machine.location_name}</Text>
        <Text style={styles.machineMeta}>Maquina {machine.bin_code}</Text>
        <Text style={styles.machineMeta}>Status {String(machine.status).toUpperCase()}</Text>
        <Text style={styles.machineMeta}>Conectada em {formatDateTime(connectedAt)}</Text>
        <Text style={styles.machineSession}>Sessao ativa #{session.id}</Text>
      </View>
    </View>
  );
}

function MaterialsCard({ materials, loading }) {
  return (
    <View style={styles.materialsCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Materiais aceitos</Text>
        <PackageCheck size={20} color={colors.primary} strokeWidth={2.1} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.materialLoading} />
      ) : (
        <View style={styles.materialList}>
          {materials.map((material) => (
            <View key={material.id} style={styles.materialChip}>
              <Text style={styles.materialText}>{getMaterialNamePtBr(material)}</Text>
            </View>
          ))}
          {materials.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum material ativo foi encontrado.</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function ManualCodeModal({ visible, loading, onClose, onSubmit }) {
  const [code, setCode] = useState('');

  const submit = () => {
    onSubmit(code);
    setCode('');
  };

  const close = () => {
    setCode('');
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Informar codigo da maquina</Text>
            <Pressable accessibilityRole="button" onPress={close} hitSlop={10} style={styles.closeButton}>
              <X size={18} color={colors.muted} strokeWidth={2.2} />
            </Pressable>
          </View>

          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Codigo da maquina"
            placeholderTextColor="#9BAAA2"
            autoCapitalize="characters"
            editable={!loading}
            style={styles.manualInput}
          />

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={submit}
            style={[styles.modalSubmit, loading && styles.modalSubmitDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.modalSubmitText}>Validar maquina</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function ScannerScreen({ navigation }) {
  const { user } = useAuth();
  const scanner = useScanner();

  const headerUser = useMemo(
    () => ({
      ...user,
      avatarInitials: getAvatarInitial(user?.full_name),
    }),
    [user]
  );

  const connectionStatus = scanner.session?.machine?.status ?? 'offline';
  const connectionLabel = scanner.machineConnected
    ? String(connectionStatus).toUpperCase()
    : 'AGUARDANDO QR';

  const stats = useMemo(
    () => [
      {
        id: 'points',
        label: 'PONTOS GANHOS',
        value: String(scanner.todayMetrics.points),
        icon: 'leaf',
      },
      {
        id: 'items',
        label: 'ITENS COLETADOS',
        value: String(scanner.todayMetrics.items),
        icon: 'recycle',
      },
    ],
    [scanner.todayMetrics.items, scanner.todayMetrics.points]
  );

  const showSessionError = useCallback(
    (error) => {
      Alert.alert('Validacao da maquina', getSessionErrorMessage(error, scanner.errorMessage));
    },
    [scanner.errorMessage]
  );

  const validateMachine = useCallback(
    async (code) => {
      try {
        await scanner.scanMachine(code);
      } catch (error) {
        showSessionError(error);
      }
    },
    [scanner, showSessionError]
  );

  const handleScanned = useCallback(
    ({ data: code }) => {
      validateMachine(code);
    },
    [validateMachine]
  );

  const handleManualSubmit = useCallback(
    async (code) => {
      try {
        await scanner.scanMachine(code);
        scanner.setManualModalVisible(false);
      } catch (error) {
        showSessionError(error);
      }
    },
    [scanner, showSessionError]
  );

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
      navigation.navigate('AccountSettings');
      return;
    }

    if (key === 'rewards') {
      navigation.navigate('Rewards');
      return;
    }

    if (key !== 'scanner') {
      Alert.alert('Em breve', 'Esta area esta pronta para receber a proxima tela.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={scanner.refreshing}
              tintColor={colors.primary}
              onRefresh={scanner.refresh}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Header appName="Eco+" user={headerUser} />

            <View style={styles.badgeWrapper}>
              <StatusBadge label={connectionLabel} status={connectionStatus} />
            </View>

            <View style={styles.copy}>
              <Text style={styles.title}>Escaneie o QR da maquina</Text>
              <Text style={styles.subtitle}>
                Aponte sua camera para o codigo QR localizado na lateral da estacao de reciclagem.
              </Text>
            </View>

            <CameraScanner
              onScanned={handleScanned}
              processing={scanner.scanning}
              disabled={scanner.sessionActive}
            />

            {scanner.scannedCode ? (
              <View style={styles.scanResult}>
                <Text style={styles.scannedText}>Ultimo codigo lido: {scanner.scannedCode}</Text>
                <Pressable accessibilityRole="button" onPress={scanner.resetScan} style={styles.scanAgainButton}>
                  <RefreshCcw size={15} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.scanAgainText}>Escanear novamente</Text>
                </Pressable>
              </View>
            ) : null}

            <MachineInfoCard session={scanner.session} connectedAt={scanner.lastConnectedAt} />

            {scanner.loading ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <>
                <View style={styles.statsRow}>
                  {stats.map((item) => (
                    <StatsCard key={item.id} item={item} />
                  ))}
                </View>

                <View style={styles.goalWrapper}>
                  <WeeklyGoalCard goal={scanner.weeklyGoal} />
                </View>
              </>
            )}

            <MaterialsCard materials={scanner.acceptedMaterials} loading={scanner.loading} />

            <Pressable
              accessibilityRole="button"
              onPress={() => scanner.setManualModalVisible(true)}
              style={styles.manualButton}
            >
              <Keyboard size={18} color={colors.primary} strokeWidth={2.1} />
              <Text style={styles.manualText}>Digitar codigo manualmente</Text>
            </Pressable>
          </View>
        </ScrollView>

        <FloatingTabBar tabs={SCANNER_TABS} activeKey="scanner" onChange={handleTabChange} />
      </View>

      <ManualCodeModal
        visible={scanner.manualModalVisible}
        loading={scanner.scanning}
        onClose={() => scanner.setManualModalVisible(false)}
        onSubmit={handleManualSubmit}
      />
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
  machineCard: {
    minHeight: 112,
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  machineIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  machineContent: {
    flex: 1,
  },
  machineTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  machineMeta: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  machineSession: {
    marginTop: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  materialsCard: {
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  materialLoading: {
    marginVertical: 12,
  },
  materialList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  materialChip: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
  },
  materialText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
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
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    padding: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  manualInput: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  modalSubmit: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    backgroundColor: colors.primary,
  },
  modalSubmitDisabled: {
    opacity: 0.72,
  },
  modalSubmitText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
});
