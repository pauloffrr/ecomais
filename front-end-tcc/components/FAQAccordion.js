import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function FAQAccordion({ question, answer }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.header}
      >
        <Text style={styles.question}>{question}</Text>
        <Animated.View style={[styles.icon, expanded && styles.iconRotated]}>
          <ChevronDown
            size={20}
            color={colors.primary}
            strokeWidth={2}
          />
        </Animated.View>
      </Pressable>

      {expanded && (
        <View style={styles.answerContainer}>
          <Text style={styles.answer}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  question: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  icon: {
    width: 20,
    height: 20,
  },
  iconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  answerContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  answer: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
});
