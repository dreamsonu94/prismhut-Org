/**
 * Waiter Dashboard Screen
 * Overview of current shift, table occupancy, pending KOTs, and recent active orders
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import { tableService } from '../../src/services/tableService';
import { orderService } from '../../src/services/orderService';
import { Table, Order } from '../../src/types';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { Header } from '../../src/components/common/Header';
import { OrderCard } from '../../src/components/orders/OrderCard';
import { LoadingSkeleton, ErrorState } from '../../src/components/common/LoadingSkeleton';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, restaurant } = useAuth();
  const { isConnected, subscribe } = useSocket();

  const [tables, setTables] = useState<Table[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [tablesData, ordersData] = await Promise.all([
        tableService.getTables(),
        orderService.getOrders({ status: undefined }),
      ]);
      const safeTables = Array.isArray(tablesData) ? tablesData : [];
      const safeOrders = Array.isArray(ordersData) ? ordersData : [];
      setTables(safeTables);
      setRecentOrders(safeOrders.slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Failed to sync with restaurant server');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time socket event subscription for live dashboard stats
  useEffect(() => {
    const unsubOrder = subscribe('order.updated', () => loadDashboardData());
    const unsubOrderCreated = subscribe('order.created', () => loadDashboardData());
    const unsubTable = subscribe('table.updated', () => loadDashboardData());
    const unsubKot = subscribe('kot.updated', () => loadDashboardData());

    return () => {
      unsubOrder();
      unsubOrderCreated();
      unsubTable();
      unsubKot();
    };
  }, [subscribe, loadDashboardData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const safeTablesList = Array.isArray(tables) ? tables : [];
  const safeOrdersList = Array.isArray(recentOrders) ? recentOrders : [];

  const totalTables = safeTablesList.length;
  const occupiedTables = safeTablesList.filter((t) => t?.status === 'OCCUPIED').length;
  const availableTables = safeTablesList.filter((t) => t?.status === 'AVAILABLE').length;

  const activeOrdersCount = safeOrdersList.filter(
    (o) => o?.status !== 'COMPLETED' && o?.status !== 'CANCELLED'
  ).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title={restaurant?.name || 'Restaurant Smart POS'}
        subtitle={`Waiter: ${user?.name || user?.username || 'Active Shift'}`}
        rightAction={
          <View style={styles.connectionStatus}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? COLORS.success : COLORS.warning },
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? 'LIVE' : 'SYNCING'}
            </Text>
          </View>
        }
      />

      {isLoading ? (
        <LoadingSkeleton message="Loading floor metrics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDashboardData} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {/* Quick Stats Bento */}
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: COLORS.status.available }]}
              onPress={() => router.push('/(tabs)/tables')}
              activeOpacity={0.7}
            >
              <Text style={styles.statLabel}>AVAILABLE TABLES</Text>
              <Text style={[styles.statNumber, { color: '#15803D' }]}>
                {availableTables}
              </Text>
              <Text style={styles.statSubText}>of {totalTables} total</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: COLORS.status.occupied }]}
              onPress={() => router.push('/(tabs)/tables')}
              activeOpacity={0.7}
            >
              <Text style={styles.statLabel}>OCCUPIED TABLES</Text>
              <Text style={[styles.statNumber, { color: '#B91C1C' }]}>
                {occupiedTables}
              </Text>
              <Text style={styles.statSubText}>seated guests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: COLORS.primary }]}
              onPress={() => router.push('/(tabs)/orders')}
              activeOpacity={0.7}
            >
              <Text style={styles.statLabel}>ACTIVE ORDERS</Text>
              <Text style={[styles.statNumber, { color: COLORS.primary }]}>
                {activeOrdersCount}
              </Text>
              <Text style={styles.statSubText}>in prep / ready</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Action Bar */}
          <View style={styles.actionSection}>
            <Text style={styles.sectionHeader}>Quick Actions</Text>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => router.push('/(tabs)/tables')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnIcon}>⚡</Text>
                <Text style={styles.actionBtnText}>New Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.darkSurface }]}
                onPress={() => router.push('/(tabs)/tables')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnIcon}>🪑</Text>
                <Text style={styles.actionBtnText}>Floor Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#475569' }]}
                onPress={() => router.push('/(tabs)/orders')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnIcon}>📋</Text>
                <Text style={styles.actionBtnText}>Kitchen Orders</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Orders Section */}
          <View style={styles.recentSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionHeader}>Active Orders</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            {recentOrders.length === 0 ? (
              <View style={styles.noOrdersCard}>
                <Text style={styles.noOrdersText}>No active orders at this moment</Text>
              </View>
            ) : (
              recentOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  currency={restaurant?.currency || '$'}
                  onPress={() => router.push(`/order/${order.id}`)}
                />
              ))
            )}
          </View>
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  statsGrid: {
    marginBottom: SPACING.lg,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 2,
  },
  statSubText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionSection: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  actionBtnIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionBtnText: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  recentSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  viewAllText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  noOrdersCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noOrdersText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
