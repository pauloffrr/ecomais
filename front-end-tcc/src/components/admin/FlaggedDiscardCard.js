import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Check, Clock3, Scale, UserRound, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const formatDateTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Data não informada';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const formatWeight = (value) =>
  `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0))} g`;

const formatConfidence = (value) => {
  if (value == null) return 'Não informada';
  return `${Math.round(Number(value) * 100)}%`;
};

export default function FlaggedDiscardCard({ discard, loading, onApprove, onReject }) {
  const reportedMaterial = discard.reported_material ?? discard.material_informed;
  const detectedMaterial = discard.detected_material ?? discard.ai_classification;
  const userLabel = discard.user_name ?? discard.user?.full_name ?? `Usuário #${discard.user_id}`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.warningIcon}>
          <AlertTriangle size={21} color="#9A6700" strokeWidth={2.2} />
        </View>

        <View style={styles.heading}>
          <Text style={styles.title}>Descarte #{discard.id}</Text>
          <Text style={styles.status}>Aguardando revisão</Text>
        </View>

        {loading ? <ActivityIndicator color={colors.primary} /> : null}
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <UserRound size={16} color={colors.muted} strokeWidth={2} />
          <Text style={styles.metaText} numberOfLines={1}>{userLabel}</Text>
        </View>
        <View style={styles.metaItem}>
          <Scale size={16} color={colors.muted} strokeWidth={2} />
          <Text style={styles.metaText}>{formatWeight(discard.weight_grams)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Clock3 size={16} color={colors.muted} strokeWidth={2} />
          <Text style={styles.metaText}>{formatDateTime(discard.created_at)}</Text>
        </View>
      </View>

      <View style={styles.comparison}>
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>Material informado</Text>
          <Text style={styles.comparisonValue}>{reportedMaterial ?? 'Não enviado pela API'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>Material detectado</Text>
          <Text style={styles.comparisonValue}>{detectedMaterial ?? 'Não enviado pela API'}</Text>
          <Text style={styles.confidence}>Confiança: {formatConfidence(discard.ai_confidence)}</Text>
        </View>
      </View>

      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>Motivo da sinalização</Text>
        <Text style={styles.reasonText}>{discard.validation_errors || 'Motivo não informado pelo backend.'}</Text>
      </View>

      {discard.points_awarded != null ? (
        <Text style={styles.points}>
          {new Intl.NumberFormat('pt-BR').format(Number(discard.points_awarded))} pontos pendentes
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={onReject}
          style={({ pressed }) => [styles.button, styles.rejectButton, pressed && styles.pressed]}
        >
          <X size={18} color={colors.danger} strokeWidth={2.4} />
          <Text style={styles.rejectText}>Reprovar</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={onApprove}
          style={({ pressed }) => [styles.button, styles.approveButton, pressed && styles.pressed]}
        >
          <Check size={18} color={colors.white} strokeWidth={2.4} />
          <Text style={styles.approveText}>Aprovar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3D6',
  },
  heading: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  status: {
    color: '#9A6700',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  metaGrid: {
    marginTop: spacing.md,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  comparison: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  comparisonItem: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
  },
  comparisonLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  comparisonValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  confidence: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  reasonBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: '#FFF9EA',
  },
  reasonLabel: {
    color: '#805500',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reasonText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  points: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  rejectButton: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  approveButton: {
    backgroundColor: colors.primary,
  },
  rejectText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  approveText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
