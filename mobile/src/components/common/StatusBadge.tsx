/**
 * Status Badge Component for Tables, Orders, and KOTs
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { TableStatus, OrderStatus, TicketStatus } from '../../types';

interface StatusBadgeProps {
  status: TableStatus | OrderStatus | TicketStatus | string;
  type?: 'table' | 'order' | 'ticket';
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'table',
  style,
}) => {
  const getBadgeColors = () => {
    const s = String(status).toUpperCase();

    // Table statuses
    if (s === 'AVAILABLE') {
      return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
    }
    if (s === 'OCCUPIED') {
      return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
    }
    if (s === 'RESERVED') {
      return { bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' };
    }
    if (s === 'CLEANING') {
      return { bg: '#F3E8FF', text: '#7E22CE', border: '#D8B4FE' };
    }
    if (s === 'OUT_OF_SERVICE') {
      return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }

    // Order / KOT statuses
    if (s === 'PENDING' || s === 'DRAFT') {
      return { bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' };
    }
    if (s === 'CONFIRMED' || s === 'ACCEPTED') {
      return { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' };
    }
    if (s === 'PREPARING' || s === 'COOKING') {
      return { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD' };
    }
    if (s === 'READY') {
      return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
    }
    if (s === 'SERVED') {
      return { bg: '#CFFAFE', text: '#0E7490', border: '#67E8F9' };
    }
    if (s === 'COMPLETED') {
      return { bg: '#E0F2FE', text: '#0369A1', border: '#7DD3FC' };
    }
    if (s === 'CANCELLED') {
      return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
    }

    return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
  };

  const colors = getBadgeColors();

  const formatText = (text: string) => {
    return text.replace(/_/g, ' ');
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
      <Text style={[styles.text, { color: colors.text }]}>
        {formatText(String(status))}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
