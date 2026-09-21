/**
 * Table Card Component for Waiter Floor View
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Table } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { StatusBadge } from '../common/StatusBadge';

interface TableCardProps {
  table: Table;
  currency?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  currency = '$',
  onPress,
  onLongPress,
}) => {
  const isOccupied = table.status === 'OCCUPIED';
  const hasActiveOrder = !!table.activeOrder;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isOccupied ? styles.cardOccupied : styles.cardAvailable,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <View style={styles.tableNumberBadge}>
          <Text style={styles.tableNumberText}>{table.tableNumber || table.tableName}</Text>
        </View>
        <StatusBadge status={table.status} type="table" />
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.capacityText}>👥 {table.capacity} Seats</Text>
        {table.section ? (
          <Text style={styles.sectionText}>📍 {table.section.name}</Text>
        ) : null}
      </View>

      {hasActiveOrder && table.activeOrder ? (
        <View style={styles.activeOrderBox}>
          <View style={styles.orderTopRow}>
            <Text style={styles.orderNumberText}>
              #{table.activeOrder.orderNumber}
            </Text>
            <Text style={styles.orderAmountText}>
              {currency}
              {Number(table.activeOrder.totalAmount || 0).toFixed(2)}
            </Text>
          </View>
          {table.activeOrder.waiterName ? (
            <Text style={styles.waiterText} numberOfLines={1}>
              🤵 {table.activeOrder.waiterName}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyTablePrompt}>
          <Text style={styles.tapToOrderText}>Tap to Start Order</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardAvailable: {
    borderColor: '#E2E8F0',
  },
  cardOccupied: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFBFB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tableNumberBadge: {
    backgroundColor: COLORS.darkBackground,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  tableNumberText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  capacityText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sectionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeOrderBox: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  orderAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  waiterText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyTablePrompt: {
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs + 2,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  tapToOrderText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
});
