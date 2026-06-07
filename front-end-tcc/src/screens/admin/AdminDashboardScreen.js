import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AlertTriangle, ArrowLeft, Database, RefreshCcw, Server } from 'lucide-react-native';
import AdminBinCard from '../../components/admin/AdminBinCard';
import FlaggedDiscardCard from '../../components/admin/FlaggedDiscardCard';
import ResolveDiscardModal from '../../components/admin/ResolveDiscardModal';
import { useAdminBins } from '../../hooks/useAdminBins';
import { useAuth } from '../../hooks/useAuth';
import { useFlaggedDiscards } from '../../hooks/useFlaggedDiscards';
import { getAdminErrorMessage } from '../../services/adminService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const getInitial = (name) => name?.trim()?.charAt(0)?.toUpperCase() || 'A';

function SectionState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Icon size={23} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
        >
          <RefreshCcw size={16} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.retryText}>{actionLabel ?? 'Tentar novamente'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SectionHeader({ title, count }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{new Intl.NumberFormat('pt-BR').format(count)}</Text>
      </View>
    </View>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [resolution, setResolution] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const {
    bins,
    total: binsTotal,
    loading: binsLoading,
    refreshing: binsRefreshing,
    error: binsError,
    refetch: refetchBins,
  } = useAdminBins();
  const {
    discards,
    total: flaggedTotal,
    loading: discardsLoading,
    refreshing: discardsRefreshing,
    error: discardsError,
    resolvingId,
    refetch: refetchDiscards,
    resolveDiscard,
  } = useFlaggedDiscards();

  const loading = (binsLoading && bins.length === 0) || (discardsLoading && discards.length === 0);
  const refreshing = binsRefreshing || discardsRefreshing;
  const adminName = user?.full_name ?? user?.name ?? 'Administrador Eco+';
  const accessDenied = binsError?.response?.status === 403 || discardsError?.response?.status === 403;

  useEffect(() => {
    if (!accessDenied) return;

    Alert.alert('Acesso restrito', 'Acesso restrito a administradores.');
    navigation.replace('Home');
  }, [accessDenied, navigation]);

  const onlineBins = useMemo(
    () => bins.filter((bin) => ['active', 'online'].includes(String(bin.status).toLowerCase())).length,
    [bins]
  );

  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      refetchBins({ refresh: true }),
      refetchDiscards({ refresh: true }),
    ]);
  }, [refetchBins, refetchDiscards]);

  const openResolution = (discard, action) => {
    setFeedback(null);
    setResolution({ discard, action });
  };

  const confirmResolution = async (payload) => {
    try {
      await resolveDiscard(resolution.discard.id, payload);
      setResolution(null);
      setFeedback({
        type: 'success',
        message: payload.status === 'approved' ? 'Descarte aprovado com sucesso.' : 'Descarte reprovado com sucesso.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(error, 'Não foi possível resolver o descarte.'),
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={refreshDashboard}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Pressable
                accessibilityLabel="Voltar para a Home"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigation.navigate('Home')}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              >
                <ArrowLeft size={22} color={colors.primary} strokeWidth={2.3} />
              </Pressable>

              <View style={styles.headerCopy}>
                <Text style={styles.title}>Painel Administrativo</Text>
                <Text style={styles.subtitle}>Controle de máquinas e descartes</Text>
              </View>

              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitial(adminName)}</Text>
              </View>
            </View>

            <Text style={styles.adminName}>{adminName}</Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Server size={19} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.summaryValue}>{onlineBins}/{binsTotal}</Text>
                <Text style={styles.summaryLabel}>Online</Text>
              </View>
              <View style={styles.summaryItem}>
                <AlertTriangle size={19} color="#9A6700" strokeWidth={2.2} />
                <Text style={styles.summaryValue}>{flaggedTotal}</Text>
                <Text style={styles.summaryLabel}>Pendentes</Text>
              </View>
            </View>

            {feedback ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setFeedback(null)}
                style={[
                  styles.feedback,
                  feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
                ]}
              >
                <Text
                  style={[
                    styles.feedbackText,
                    feedback.type === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText,
                  ]}
                >
                  {feedback.message}
                </Text>
              </Pressable>
            ) : null}

            {loading ? (
              <View style={styles.initialLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando dados administrativos...</Text>
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <SectionHeader title="Máquinas / Lixeiras" count={binsTotal} />

                  {binsError && bins.length === 0 ? (
                    <SectionState
                      icon={Server}
                      title="Não foi possível carregar as lixeiras"
                      description={getAdminErrorMessage(binsError)}
                      onAction={() => refetchBins()}
                    />
                  ) : null}

                  {!binsError && bins.length === 0 ? (
                    <SectionState
                      icon={Server}
                      title="Nenhuma lixeira cadastrada"
                      description="As máquinas cadastradas aparecerão aqui."
                    />
                  ) : null}

                  <View style={styles.list}>
                    {bins.map((bin) => <AdminBinCard key={bin.id} bin={bin} />)}
                  </View>
                </View>

                <View style={styles.section}>
                  <SectionHeader title="Descartes sinalizados" count={flaggedTotal} />

                  {discardsError && discards.length === 0 ? (
                    <SectionState
                      icon={AlertTriangle}
                      title="Não foi possível carregar os descartes"
                      description={getAdminErrorMessage(discardsError)}
                      onAction={() => refetchDiscards()}
                    />
                  ) : null}

                  {!discardsError && discards.length === 0 ? (
                    <SectionState
                      icon={Database}
                      title="Nenhuma revisão pendente"
                      description="Todos os descartes sinalizados já foram analisados."
                    />
                  ) : null}

                  <View style={styles.list}>
                    {discards.map((discard) => (
                      <FlaggedDiscardCard
                        key={discard.id}
                        discard={discard}
                        loading={resolvingId === discard.id}
                        onApprove={() => openResolution(discard, 'approved')}
                        onReject={() => openResolution(discard, 'rejected')}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <ResolveDiscardModal
          action={resolution?.action}
          discardId={resolution?.discard?.id}
          loading={resolvingId === resolution?.discard?.id}
          onCancel={() => setResolution(null)}
          onConfirm={confirmResolution}
          visible={Boolean(resolution)}
        />
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
    paddingBottom: 40,
  },
  container: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '900',
  },
  adminName: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.sm,
    marginLeft: 54,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    minHeight: 86,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  feedback: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  feedbackSuccess: {
    backgroundColor: '#E4F7EA',
  },
  feedbackError: {
    backgroundColor: '#FDE8E8',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '800',
  },
  feedbackSuccessText: {
    color: '#087A3A',
  },
  feedbackErrorText: {
    color: '#B42318',
  },
  initialLoading: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  countBadge: {
    minWidth: 34,
    height: 28,
    paddingHorizontal: 9,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  countText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  list: {
    gap: spacing.sm,
  },
  state: {
    minHeight: 190,
    padding: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  stateDescription: {
    maxWidth: 330,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
  },
  retryButton: {
    minHeight: 42,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
