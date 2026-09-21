/**
 * Order Details & Real-Time Kitchen Tracking Screen
 * Live KOT/BOT progress timeline, itemized receipt, bill request, and invoice viewer
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useCart } from '../../src/context/CartContext';
import { useSocket } from '../../src/context/SocketContext';
import { orderService } from '../../src/services/orderService';
import { invoiceService } from '../../src/services/invoiceService';
import { tableService } from '../../src/services/tableService';
import { Order, Invoice } from '../../src/types';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { Header } from '../../src/components/common/Header';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { Button } from '../../src/components/common/Button';
import { KotStatusTracker } from '../../src/components/orders/KotStatusTracker';
import { InvoiceModal } from '../../src/components/orders/InvoiceModal';
import { LoadingSkeleton, ErrorState } from '../../src/components/common/LoadingSkeleton';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurant } = useAuth();
  const { setTableContext } = useCart();
  const { subscribe } = useSocket();

  const [order, setOrder] = useState<Order | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await orderService.getOrderById(id);
      setOrder(data);

      // Attempt to load invoice if completed/settled
      if (data.invoices && data.invoices.length > 0) {
        setInvoice(data.invoices[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Real-time socket updates for order status, KOT items, BOT items, and payments
  useEffect(() => {
    const unsubOrder = subscribe('order.updated', (data) => {
      if (data?.order?.id === id || data?.id === id) {
        fetchOrderDetails();
      }
    });
    const unsubKot = subscribe('kot.updated', () => fetchOrderDetails());
    const unsubBot = subscribe('bot.updated', () => fetchOrderDetails());
    const unsubPay = subscribe('payment.completed', () => fetchOrderDetails());

    return () => {
      unsubOrder();
      unsubKot();
      unsubBot();
      unsubPay();
    };
  }, [subscribe, id, fetchOrderDetails]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchOrderDetails();
  };

  const handleAddItems = () => {
    if (!order) return;
    setTableContext(order.tableId || null, order.guestCount || 1);
    router.push(`/menu/${order.tableId || 'default'}`);
  };

  const handleRequestBill = async () => {
    if (!order) return;
    setIsRequestingBill(true);
    try {
      // If table exists, update status to indicate bill requested / attention needed
      if (order.tableId) {
        await tableService.updateTableStatus(order.tableId, 'OCCUPIED');
      }
      Alert.alert(
        'Bill Requested',
        `Cashier and manager have been notified for Table ${order.table?.tableName || order.table?.tableNumber || ''}.`
      );
      setInvoiceModalVisible(true);
    } catch (err: any) {
      Alert.alert('Request Failed', err.message);
    } finally {
      setIsRequestingBill(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Order Details" onBack={() => router.back()} />
        <LoadingSkeleton message="Loading order and kitchen tickets..." />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Order Details" onBack={() => router.back()} />
        <ErrorState message={error || 'Order not found'} onRetry={fetchOrderDetails} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title={`Order #${order.orderNumber}`}
        subtitle={
          order.table
            ? `Table ${order.table.tableNumber || order.table.tableName} • ${order.guestCount} Guests`
            : 'Takeaway Order'
        }
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity
            onPress={() => setInvoiceModalVisible(true)}
            style={styles.billIconBtn}
          >
            <Text style={styles.billIconText}>🧾 Receipt</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status & Timing Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.createdTime}>
                Ordered at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.serverName}>
                Server: {order.waiter?.name || 'Staff'}
              </Text>
            </View>
            <StatusBadge status={order.status} type="order" />
          </View>

          {order.notes ? (
            <View style={styles.orderNotesBox}>
              <Text style={styles.orderNotesLabel}>Special Notes:</Text>
              <Text style={styles.orderNotesText}>{order.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Live Kitchen & Bar Dispatch Tracker */}
        <KotStatusTracker kots={order.kots} bots={order.bots} />

        {/* Itemized Order List */}
        <Text style={styles.sectionTitle}>
          Ordered Items ({Array.isArray(order.items) ? order.items.length : 0})
        </Text>
        <View style={styles.itemsCard}>
          {(Array.isArray(order.items) ? order.items : []).map((item, idx) => (
            <View key={item.id || idx} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemQty}>{item.quantity}x</Text>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemName}>{item.menuItem?.name}</Text>
                  {item.notes ? (
                    <Text style={styles.itemNote}>Note: {item.notes}</Text>
                  ) : null}
                </View>
              </View>

              <Text style={styles.itemTotal}>
                {restaurant?.currency || '$'}
                {Number(item.subtotal || item.unitPrice * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          {/* Pricing Totals */}
          <View style={styles.divider} />
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcValue}>
              {restaurant?.currency || '$'}
              {Number(order.subtotal || 0).toFixed(2)}
            </Text>
          </View>

          {order.taxAmount > 0 ? (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Tax</Text>
              <Text style={styles.calcValue}>
                {restaurant?.currency || '$'}
                {Number(order.taxAmount).toFixed(2)}
              </Text>
            </View>
          ) : null}

          {order.serviceCharge > 0 ? (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Service Charge</Text>
              <Text style={styles.calcValue}>
                {restaurant?.currency || '$'}
                {Number(order.serviceCharge).toFixed(2)}
              </Text>
            </View>
          ) : null}

          <View style={[styles.calcRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>
              {restaurant?.currency || '$'}
              {Number(order.totalAmount || 0).toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Quick Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <Button
          title="+ Add Items"
          onPress={handleAddItems}
          variant="secondary"
          size="md"
          style={{ flex: 1, marginRight: SPACING.sm }}
        />
        <Button
          title="Request Bill"
          onPress={handleRequestBill}
          loading={isRequestingBill}
          variant="primary"
          size="md"
          style={{ flex: 1 }}
        />
      </View>

      {/* Invoice Modal */}
      <InvoiceModal
        visible={invoiceModalVisible}
        order={order}
        invoice={invoice}
        currency={restaurant?.currency || '$'}
        onClose={() => setInvoiceModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  billIconBtn: {
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  billIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createdTime: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  serverName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderNotesBox: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
  },
  orderNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  orderNotesText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceMuted,
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: SPACING.md,
  },
  itemQty: {
    width: 28,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  calcLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
});
