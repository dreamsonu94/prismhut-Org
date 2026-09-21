/**
 * Table Detail & Ordering Gateway Screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useCart } from '../../src/context/CartContext';
import { useSocket } from '../../src/context/SocketContext';
import { tableService } from '../../src/services/tableService';
import { Table, TableStatus } from '../../src/types';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { Header } from '../../src/components/common/Header';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { Button } from '../../src/components/common/Button';
import { TableStatusPickerModal } from '../../src/components/tables/TableStatusPickerModal';
import { LoadingSkeleton, ErrorState } from '../../src/components/common/LoadingSkeleton';

export default function TableDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurant } = useAuth();
  const { setTableContext } = useCart();
  const { subscribe } = useSocket();

  const [table, setTable] = useState<Table | null>(null);
  const [guestCount, setGuestCountState] = useState<number>(2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);

  const fetchTable = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await tableService.getTableById(id);
      setTable(data);
      if (data.activeOrder?.guestCount) {
        setGuestCountState(data.activeOrder.guestCount);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch table details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  useEffect(() => {
    const unsubTable = subscribe('table.updated', (data) => {
      if (data?.table?.id === id || data?.id === id) {
        fetchTable();
      }
    });
    const unsubOrder = subscribe('order.created', () => fetchTable());
    const unsubOrderUp = subscribe('order.updated', () => fetchTable());

    return () => {
      unsubTable();
      unsubOrder();
      unsubOrderUp();
    };
  }, [subscribe, id, fetchTable]);

  const handleStartOrder = () => {
    if (!table) return;
    setTableContext(table.id, guestCount);
    router.push(`/menu/${table.id}`);
  };

  const handleStatusChange = async (newStatus: TableStatus) => {
    if (!table) return;
    try {
      await tableService.updateTableStatus(table.id, newStatus);
      fetchTable();
    } catch (err: any) {
      Alert.alert('Status Change Failed', err.message);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Table Details" onBack={() => router.back()} />
        <LoadingSkeleton message="Loading table..." />
      </View>
    );
  }

  if (error || !table) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Table Details" onBack={() => router.back()} />
        <ErrorState message={error || 'Table not found'} onRetry={fetchTable} />
      </View>
    );
  }

  const hasActiveOrder = !!table.activeOrder;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title={`Table ${table.tableNumber || table.tableName}`}
        subtitle={table.section?.name ? `Section: ${table.section.name}` : undefined}
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity
            onPress={() => setStatusModalVisible(true)}
            style={styles.changeStatusBtn}
          >
            <Text style={styles.changeStatusText}>Edit Status</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Table Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.tableBadge}>
              <Text style={styles.tableBadgeText}>
                {table.tableNumber || table.tableName}
              </Text>
            </View>
            <StatusBadge status={table.status} type="table" />
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specItem}>👥 Capacity: {table.capacity} Guests</Text>
            {table.section ? (
              <Text style={styles.specItem}>📍 {table.section.name}</Text>
            ) : null}
          </View>
        </View>

        {/* Active Order Summary or New Order Form */}
        {hasActiveOrder && table.activeOrder ? (
          <View style={styles.activeOrderCard}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderTitle}>
                  Order #{table.activeOrder.orderNumber}
                </Text>
                <Text style={styles.orderWaiter}>
                  Server: {table.activeOrder.waiterName || 'Staff'}
                </Text>
              </View>
              <StatusBadge status={table.activeOrder.status} type="order" />
            </View>

            <View style={styles.orderAmountRow}>
              <Text style={styles.amountLabel}>Current Bill Total:</Text>
              <Text style={styles.amountValue}>
                {restaurant?.currency || '$'}
                {Number(table.activeOrder.totalAmount || 0).toFixed(2)}
              </Text>
            </View>

            <View style={styles.btnStack}>
              <Button
                title="View Full Order & Tickets"
                onPress={() => router.push(`/order/${table.activeOrder!.id}`)}
                variant="primary"
                size="md"
                style={{ marginBottom: SPACING.sm }}
              />
              <Button
                title="+ Add More Items to Order"
                onPress={() => {
                  setTableContext(table.id, table.activeOrder!.guestCount || 1);
                  router.push(`/menu/${table.id}`);
                }}
                variant="outline"
                size="md"
              />
            </View>
          </View>
        ) : (
          <View style={styles.newOrderCard}>
            <Text style={styles.newOrderTitle}>Start New Table Order</Text>
            <Text style={styles.newOrderSubtitle}>
              Select party size to begin taking guest orders.
            </Text>

            {/* Guest Counter */}
            <View style={styles.guestCounterRow}>
              <Text style={styles.guestCounterLabel}>Number of Guests:</Text>
              <View style={styles.counterControl}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setGuestCountState((g) => Math.max(1, g - 1))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{guestCount}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setGuestCountState((g) => g + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button
              title="Open Menu Catalog →"
              onPress={handleStartOrder}
              variant="primary"
              size="lg"
              style={{ marginTop: SPACING.lg }}
            />
          </View>
        )}
      </ScrollView>

      <TableStatusPickerModal
        visible={statusModalVisible}
        table={table}
        onClose={() => setStatusModalVisible(false)}
        onSelectStatus={handleStatusChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  changeStatusBtn: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  changeStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  tableBadge: {
    backgroundColor: COLORS.darkBackground,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.md,
  },
  tableBadgeText: {
    color: COLORS.textInverse,
    fontSize: 18,
    fontWeight: '900',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  activeOrderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  orderWaiter: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  btnStack: {
    marginTop: SPACING.xs,
  },
  newOrderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  newOrderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  newOrderSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  guestCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  guestCounterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  counterBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },
});
