/**
 * Order Card Component for Orders Screen and Dashboard
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Order } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { StatusBadge } from '../common/StatusBadge';

interface OrderCardProps {
  order: Order;
  currency?: string;
  onPress: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  currency = '$',
  onPress,
}) => {
  const itemCount = order.items
    ? order.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.orderIdGroup}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.timeText}>{formattedTime}</Text>
        </View>
        <StatusBadge status={order.status} type="order" />
      </View>

      <View style={styles.divider} />

      <View style={styles.middleRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Table</Text>
          <Text style={styles.metaValue}>
            {order.table
              ? `T-${order.table.tableNumber || order.table.tableName}`
              : 'Takeaway'}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Items</Text>
          <Text style={styles.metaValue}>{itemCount} items</Text>
        </View>

        <View style={styles.metaItemRight}>
          <Text style={styles.metaLabel}>Total</Text>
          <Text style={styles.amountValue}>
            {currency}
            {Number(order.totalAmount || 0).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* KOT status pills if present */}
      {order.kots && order.kots.length > 0 ? (
        <View style={styles.kotSection}>
          <Text style={styles.kotSectionLabel}>Kitchen Tickets:</Text>
          <View style={styles.kotBadgesRow}>
            {order.kots.map((k) => (
              <View key={k.id} style={styles.kotPill}>
                <Text style={styles.kotPillText}>
                  {k.kotNumber}: {k.status}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceMuted,
    marginVertical: SPACING.sm,
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flex: 1,
  },
  metaItemRight: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  kotSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
  },
  kotSectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  kotBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kotPill: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  kotPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
