import { StyleSheet, Text, View } from 'react-native';

const STATUS_CONFIG = {
  active: {
    label: 'Online',
    backgroundColor: '#E4F7EA',
    color: '#087A3A',
  },
  online: {
    label: 'Online',
    backgroundColor: '#E4F7EA',
    color: '#087A3A',
  },
  inactive: {
    label: 'Offline',
    backgroundColor: '#FDE8E8',
    color: '#B42318',
  },
  offline: {
    label: 'Offline',
    backgroundColor: '#FDE8E8',
    color: '#B42318',
  },
  error: {
    label: 'Offline',
    backgroundColor: '#FDE8E8',
    color: '#B42318',
  },
  maintenance: {
    label: 'Manutenção',
    backgroundColor: '#FFF3D6',
    color: '#9A6700',
  },
};

export default function AdminStatusBadge({ status }) {
  const normalizedStatus = String(status ?? '').toLowerCase();
  const config = STATUS_CONFIG[normalizedStatus] ?? {
    label: 'Status desconhecido',
    backgroundColor: '#EEF1F4',
    color: '#59636E',
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    maxWidth: 138,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
  },
});
