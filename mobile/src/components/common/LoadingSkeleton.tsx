/**
 * Loading Skeleton, Empty State, and Error State Components
 */
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { Button } from './Button';

export const LoadingSkeleton: React.FC<{ message?: string }> = ({
  message = 'Loading restaurant data...',
}) => {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
}> = ({ title, description, actionTitle, onAction }) => {
  return (
    <View style={styles.centerContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIcon}>🍽️</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? (
        <Text style={styles.emptyDescription}>{description}</Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={{ marginTop: SPACING.md }}
        />
      ) : null}
    </View>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Failed to Load', message, onRetry }) => {
  return (
    <View style={styles.centerContainer}>
      <View style={styles.errorIconCircle}>
        <Text style={styles.errorIcon}>⚠️</Text>
      </View>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorDescription}>{message}</Text>
      {onRetry ? (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="secondary"
          size="sm"
          style={{ marginTop: SPACING.md }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    minHeight: 220,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: 260,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  errorIcon: {
    fontSize: 28,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: 280,
  },
});
