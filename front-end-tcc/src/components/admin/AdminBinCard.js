import { StyleSheet, Text, View } from 'react-native';
import { Activity, MapPin, Recycle, Scale } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import AdminStatusBadge from './AdminStatusBadge';

const formatDateTime = (value) => {
  if (!value) return 'Sem atividade registrada';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const formatWeight = (value) =>
  `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0))} kg`;

export default function AdminBinCard({ bin }) {
  const loadPercentage =
    Number(bin.max_weight_kg) > 0
      ? Math.min(100, Math.round((Number(bin.current_load_kg ?? 0) / Number(bin.max_weight_kg)) * 100))
      : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Recycle size={21} color={colors.primary} strokeWidth={2.2} />
        </View>

        <View style={styles.heading}>
          <Text style={styles.name} numberOfLines={2}>
            {bin.name ?? bin.location_name ?? `Lixeira ${bin.id}`}
          </Text>
          <Text style={styles.code}>Código: {bin.bin_code ?? bin.code ?? bin.id}</Text>
        </View>

        <AdminStatusBadge status={bin.status} />
      </View>

      <View style={styles.detailRow}>
        <MapPin size={17} color={colors.muted} strokeWidth={2} />
        <Text style={styles.detailText}>{bin.location_address ?? bin.location_name ?? 'Localização não informada'}</Text>
      </View>

      <View style={styles.detailRow}>
        <Activity size={17} color={colors.muted} strokeWidth={2} />
        <Text style={styles.detailText}>Última atividade: {formatDateTime(bin.last_seen_at)}</Text>
      </View>

      <View style={styles.loadHeader}>
        <View style={styles.detailRow}>
          <Scale size={17} color={colors.muted} strokeWidth={2} />
          <Text style={styles.detailText}>Ocupação atual</Text>
        </View>
        <Text style={styles.loadValue}>
          {formatWeight(bin.current_load_kg)} / {formatWeight(bin.max_weight_kg)}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${loadPercentage}%` }]} />
      </View>

      {bin.total_discards != null ? (
        <Text style={styles.totalDiscards}>
          {new Intl.NumberFormat('pt-BR').format(Number(bin.total_discards))} descartes realizados
        </Text>
      ) : null}
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
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  code: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  detailRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  detailText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  loadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  loadValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  progressTrack: {
    height: 7,
    marginTop: spacing.sm,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  totalDiscards: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
});
