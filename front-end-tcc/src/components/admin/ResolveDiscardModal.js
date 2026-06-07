import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const ACTION_COPY = {
  approved: {
    title: 'Aprovar descarte',
    description: 'Confirme a validação manual deste descarte.',
    placeholder: 'Ex.: Descarte validado manualmente.',
    Icon: CheckCircle2,
    color: colors.primary,
  },
  rejected: {
    title: 'Reprovar descarte',
    description: 'Informe por que este descarte não deve ser validado.',
    placeholder: 'Ex.: Material divergente do informado.',
    Icon: XCircle,
    color: colors.danger,
  },
};

export default function ResolveDiscardModal({
  visible,
  action,
  discardId,
  loading,
  onCancel,
  onConfirm,
}) {
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState('');
  const copy = ACTION_COPY[action] ?? ACTION_COPY.approved;
  const Icon = copy.Icon;

  useEffect(() => {
    if (visible) {
      setNote('');
      setValidationError('');
    }
  }, [action, discardId, visible]);

  const handleConfirm = () => {
    const normalizedNote = note.trim();

    if (!normalizedNote) {
      setValidationError('A observação é obrigatória.');
      return;
    }

    onConfirm({
      status: action,
      admin_note: normalizedNote,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} />

        <View style={styles.modal}>
          <View style={[styles.iconBox, { backgroundColor: `${copy.color}14` }]}>
            <Icon size={27} color={copy.color} strokeWidth={2.2} />
          </View>

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.description}>
            {copy.description} Descarte #{discardId}.
          </Text>

          <Text style={styles.label}>Observação administrativa</Text>
          <TextInput
            accessibilityLabel="Observação administrativa"
            editable={!loading}
            multiline
            maxLength={500}
            onChangeText={(value) => {
              setNote(value);
              if (validationError) setValidationError('');
            }}
            placeholder={copy.placeholder}
            placeholderTextColor={colors.inactive}
            style={[styles.input, validationError && styles.inputError]}
            textAlignVertical="top"
            value={note}
          />
          <View style={styles.inputFooter}>
            <Text style={styles.error}>{validationError}</Text>
            <Text style={styles.counter}>{note.length}/500</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onCancel}
              style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: copy.color },
                pressed && styles.pressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmText}>Confirmar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 20, 0.48)',
  },
  modal: {
    width: '100%',
    maxWidth: 430,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.md,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 6,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    marginTop: spacing.lg,
    marginBottom: 8,
  },
  input: {
    minHeight: 112,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: 14,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputFooter: {
    minHeight: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 5,
  },
  error: {
    flex: 1,
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  counter: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  confirmText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
