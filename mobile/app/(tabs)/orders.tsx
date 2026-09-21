/**
 * Orders Screen
 * Live kitchen/bar orders tracking with status filters (ACTIVE, READY, COMPLETED)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import { orderService } from '../../src/services/orderService';
import { Order, OrderStatus } from '../../src/types';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { Header } from '../../src/components/common/Header';
import { OrderCard } from '../../src/components/orders/OrderCard';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../src/components/common/LoadingSkeleton';

type OrderTabFilter = 'ALL' | 'ACTIVE' | 'READY' | 'COMPLETED';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { restaurant } = useAuth();
  const { subscribe } = useSocket();

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<OrderTabFilter>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const data = await orderService.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch restaurant orders');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time socket event subscriptions for orders and tickets
  useEffect(() => {
    const unsubOrder = subscribe('order.updated', () => fetchOrders());
    const unsubOrderCreated = subscribe('order.created', () => fetchOrders());
    const unsubKot = subscribe('kot.updated', () => fetchOrders());
    const unsubBot = subscribe('bot.updated', () => fetchOrders());
    const unsubPayment = subscribe('payment.completed', () => fetchOrders());

    return () => {
      unsubOrder();
      unsubOrderCreated();
      unsubKot();
      unsubBot();
      unsubPayment();
    };
  }, [subscribe, fetchOrders]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchOrders();
  };

  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);

  const filteredOrders = useMemo(() => {
    return safeOrders.filter((order) => {
      if (!order) return false;
      // Tab filter
      if (activeTab === 'ACTIVE') {
        const activeStatuses: OrderStatus[] = [
          'DRAFT',
          'CONFIRMED',
          'PREPARING',
          'SERVED',
        ];
        if (!activeStatuses.includes(order.status)) return false;
      } else if (activeTab === 'READY') {
        if (order.status !== 'READY') return false;
      } else if (activeTab === 'COMPLETED') {
        if (order.status !== 'COMPLETED' && order.status !== 'CANCELLED')
          return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = order.orderNumber?.toLowerCase().includes(q);
        const matchesTable =
          order.table?.tableName?.toLowerCase().includes(q) ||
          order.table?.tableNumber?.toLowerCase().includes(q);
        const matchesWaiter = order.waiter?.name?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesTable && !matchesWaiter) return false;
      }

      return true;
    });
  }, [safeOrders, activeTab, searchQuery]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Orders & Kitchen"
        subtitle={`${filteredOrders.length} orders listed`}
      />

      {/* Tabs & Search Bar */}
      <View style={styles.topSection}>
        <View style={styles.tabButtonsRow}>
          {(['ACTIVE', 'READY', 'COMPLETED', 'ALL'] as OrderTabFilter[]).map(
            (tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      isActive && styles.tabButtonTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order #, table, or waiter..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {isLoading ? (
        <LoadingSkeleton message="Fetching kitchen orders..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchOrders} />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          description={
            searchQuery
              ? 'No orders match your search query.'
              : `No ${activeTab.toLowerCase()} orders currently.`
          }
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currency={restaurant?.currency || '$'}
              onPress={() => router.push(`/order/${order.id}`)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topSection: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabButtonsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.xs + 3,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabButtonActive: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabButtonTextActive: {
    color: COLORS.primaryDark,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 40,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
});
