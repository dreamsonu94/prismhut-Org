/**
 * KOT & BOT Kitchen / Bar Progress Tracker
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KOT, BOT } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { StatusBadge } from '../common/StatusBadge';

interface KotStatusTrackerProps {
  kots?: KOT[];
  bots?: BOT[];
}

export const KotStatusTracker: React.FC<KotStatusTrackerProps> = ({
  kots = [],
  bots = [],
}) => {
  const safeKots = Array.isArray(kots) ? kots : [];
  const safeBots = Array.isArray(bots) ? bots : [];

  if (safeKots.length === 0 && safeBots.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Kitchen & Bar Dispatch</Text>

      {/* Kitchen Tickets */}
      {safeKots.map((kot) => (
        <View key={kot.id} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View style={styles.badgeLabelRow}>
              <Text style={styles.departmentBadgeKitchen}>🍳 KITCHEN</Text>
              <Text style={styles.ticketNumber}>{kot.kotNumber}</Text>
            </View>
            <StatusBadge status={kot.status} type="ticket" />
          </View>

          {Array.isArray(kot.items) && kot.items.length > 0 ? (
            <View style={styles.itemsList}>
              {kot.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <Text style={styles.itemName}>
                    {item.menuItem?.name || 'Item'}
                  </Text>
                  {item.notes ? (
                    <Text style={styles.itemNotes}>({item.notes})</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {/* Bar Tickets */}
      {safeBots.map((bot) => (
        <View key={bot.id} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View style={styles.badgeLabelRow}>
              <Text style={styles.departmentBadgeBar}>🍸 BAR</Text>
              <Text style={styles.ticketNumber}>{bot.botNumber}</Text>
            </View>
            <StatusBadge status={bot.status} type="ticket" />
          </View>

          {Array.isArray(bot.items) && bot.items.length > 0 ? (
            <View style={styles.itemsList}>
              {bot.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <Text style={styles.itemName}>
                    {item.menuItem?.name || 'Beverage'}
                  </Text>
                  {item.notes ? (
                    <Text style={styles.itemNotes}>({item.notes})</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ticketCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  badgeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  departmentBadgeKitchen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.xs,
  },
  departmentBadgeBar: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7E22CE',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.xs,
  },
  ticketNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemsList: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    width: 24,
  },
  itemName: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
  },
  itemNotes: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginLeft: SPACING.xs,
  },
});
