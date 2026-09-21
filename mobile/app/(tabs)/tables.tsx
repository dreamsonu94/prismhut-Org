/**
 * Tables & Floor Plan Screen
 * Real-time floor layout with section filters, table status, and tap-to-order workflow
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import { tableService } from '../../src/services/tableService';
import { Table, TableStatus } from '../../src/types';
import { extractArray } from '../../src/utils/normalize';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { Header } from '../../src/components/common/Header';
import { TableCard } from '../../src/components/tables/TableCard';
import { TableStatusPickerModal } from '../../src/components/tables/TableStatusPickerModal';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../src/components/common/LoadingSkeleton';

export default function TablesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { restaurant } = useAuth();
  const { subscribe } = useSocket();

  const [tables, setTables] = useState<Table[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status modal state
  const [selectedTableForStatus, setSelectedTableForStatus] = useState<Table | null>(null);

  const fetchTables = useCallback(async () => {
    try {
      setError(null);
      const data = await tableService.getTables();
      setTables(extractArray<Table>(data, 'tables'));
    } catch (err: any) {
      setError(err?.message || 'Failed to load restaurant floor tables');
      setTables([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Real-time updates for table status and active order creation/changes
  useEffect(() => {
    const unsubTable = subscribe('table.updated', () => fetchTables());
    const unsubOrder = subscribe('order.created', () => fetchTables());
    const unsubOrderUp = subscribe('order.updated', () => fetchTables());

    return () => {
      unsubTable();
      unsubOrder();
      unsubOrderUp();
    };
  }, [subscribe, fetchTables]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTables();
  };

  const safeTables = useMemo(() => (Array.isArray(tables) ? tables : []), [tables]);

  // Section list extracted from tables
  const sections = useMemo(() => {
    const map = new Map<string, string>();
    safeTables.forEach((t) => {
      if (t.section?.id && t.section?.name) {
        map.set(t.section.id, t.section.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [safeTables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return safeTables.filter((table) => {
      if (selectedSection && table.sectionId !== selectedSection) {
        return false;
      }
      if (statusFilter && table.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [safeTables, selectedSection, statusFilter]);

  const handleTablePress = (table: Table) => {
    router.push(`/table/${table.id}`);
  };

  const handleTableLongPress = (table: Table) => {
    setSelectedTableForStatus(table);
  };

  const handleStatusChange = async (newStatus: TableStatus) => {
    if (!selectedTableForStatus) return;
    try {
      await tableService.updateTableStatus(selectedTableForStatus.id, newStatus);
      fetchTables();
    } catch (err: any) {
      Alert.alert('Status Update Failed', err.message);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Restaurant Floor"
        subtitle={`${filteredTables.length} tables shown`}
        rightAction={
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchTables}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.refreshText}>🔄</Text>
          </TouchableOpacity>
        }
      />

      {/* Filter Tabs Row */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Section Filters */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedSection === null && styles.filterChipActive,
            ]}
            onPress={() => setSelectedSection(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedSection === null && styles.filterChipTextActive,
              ]}
            >
              All Sections
            </Text>
          </TouchableOpacity>

          {sections.map((sec) => (
            <TouchableOpacity
              key={sec.id}
              style={[
                styles.filterChip,
                selectedSection === sec.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedSection(sec.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedSection === sec.id && styles.filterChipTextActive,
                ]}
              >
                {sec.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Quick Filter Chips */}
        <View style={styles.statusChipsRow}>
          {['ALL', 'AVAILABLE', 'OCCUPIED'].map((st) => {
            const isSelected =
              st === 'ALL' ? statusFilter === null : statusFilter === st;
            return (
              <TouchableOpacity
                key={st}
                style={[
                  styles.statusChip,
                  isSelected && styles.statusChipActive,
                ]}
                onPress={() => setStatusFilter(st === 'ALL' ? null : st)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    isSelected && styles.statusChipTextActive,
                  ]}
                >
                  {st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <LoadingSkeleton message="Loading floor layout..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTables} />
      ) : filteredTables.length === 0 ? (
        <EmptyState
          title="No Tables Found"
          description="No tables match your selected filters."
          actionTitle="Reset Filters"
          onAction={() => {
            setSelectedSection(null);
            setStatusFilter(null);
          }}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              currency={restaurant?.currency || '$'}
              onPress={() => handleTablePress(table)}
              onLongPress={() => handleTableLongPress(table)}
            />
          ))}
        </ScrollView>
      )}

      {/* Table Status Picker Modal */}
      <TableStatusPickerModal
        visible={!!selectedTableForStatus}
        table={selectedTableForStatus}
        onClose={() => setSelectedTableForStatus(null)}
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
  refreshButton: {
    padding: SPACING.xs,
  },
  refreshText: {
    fontSize: 18,
  },
  filtersContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
  },
  filterScroll: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 1,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceMuted,
    marginRight: SPACING.xs + 2,
  },
  filterChipActive: {
    backgroundColor: COLORS.darkBackground,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  statusChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  statusChip: {
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceMuted,
    marginRight: SPACING.xs,
  },
  statusChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  statusChipTextActive: {
    color: COLORS.primaryDark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
});
