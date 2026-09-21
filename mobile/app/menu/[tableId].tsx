/**
 * Waiter Menu Screen
 * Category tabs, search filtering, item counters, and quick floating cart action
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useCart } from '../../src/context/CartContext';
import { menuService } from '../../src/services/menuService';
import { MenuCategory, MenuItem } from '../../src/types';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { Header } from '../../src/components/common/Header';
import { CategoryTabs } from '../../src/components/menu/CategoryTabs';
import { MenuItemCard } from '../../src/components/menu/MenuItemCard';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../src/components/common/LoadingSkeleton';

export default function MenuScreen() {
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurant } = useAuth();
  const {
    items: cartItems,
    itemCount,
    total,
    addItem,
    updateQuantity,
    getItemQuantity,
    setTableContext,
  } = useCart();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | 'KITCHEN' | 'BAR'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tableId) {
      setTableContext(tableId);
    }
  }, [tableId, setTableContext]);

  const loadMenuData = useCallback(async () => {
    try {
      setError(null);
      const [categoriesData, itemsData] = await Promise.all([
        menuService.getCategories(),
        menuService.getMenuItems(),
      ]);
      setCategories(categoriesData);
      setMenuItems(itemsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load restaurant menu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategoryId && item.categoryId !== selectedCategoryId) {
        return false;
      }
      if (departmentFilter !== 'ALL' && item.department !== departmentFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [menuItems, selectedCategoryId, departmentFilter, searchQuery]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Menu Catalog"
        subtitle={`Table Order • ${filteredItems.length} items`}
        onBack={() => router.back()}
        rightAction={
          itemCount > 0 ? (
            <TouchableOpacity
              style={styles.headerCartBadge}
              onPress={() => router.push(`/cart/${tableId || 'default'}`)}
            >
              <Text style={styles.headerCartText}>🛒 {itemCount}</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Search Bar & Department Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search food or beverages..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.departmentPillsRow}>
          {(['ALL', 'KITCHEN', 'BAR'] as const).map((dept) => {
            const isActive = departmentFilter === dept;
            return (
              <TouchableOpacity
                key={dept}
                style={[
                  styles.deptPill,
                  isActive && styles.deptPillActive,
                ]}
                onPress={() => setDepartmentFilter(dept)}
              >
                <Text
                  style={[
                    styles.deptPillText,
                    isActive && styles.deptPillTextActive,
                  ]}
                >
                  {dept === 'ALL' ? 'All Items' : dept === 'KITCHEN' ? '🍳 Food' : '🍸 Drinks'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Categories Horizontal Tabs */}
      <CategoryTabs
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {/* Menu Item Catalog List */}
      {isLoading ? (
        <LoadingSkeleton message="Loading menu items..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadMenuData} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No Items Found"
          description={
            searchQuery
              ? 'Try changing your search term.'
              : 'No items in this category.'
          }
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            itemCount > 0 ? { paddingBottom: 100 } : null,
          ]}
        >
          {filteredItems.map((item) => {
            const qty = getItemQuantity(item.id);
            return (
              <MenuItemCard
                key={item.id}
                item={item}
                quantity={qty}
                currency={restaurant?.currency || '$'}
                onAdd={() => addItem(item)}
                onIncrease={() => updateQuantity(item.id, qty + 1)}
                onDecrease={() => updateQuantity(item.id, qty - 1)}
              />
            );
          })}
        </ScrollView>
      )}

      {/* Floating Bottom Cart Bar */}
      {itemCount > 0 ? (
        <View style={[styles.floatingCartBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartItemsCount}>{itemCount} items</Text>
            <Text style={styles.cartTotalAmount}>
              {restaurant?.currency || '$'}
              {Number(total).toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.reviewCartBtn}
            onPress={() => router.push(`/cart/${tableId || 'default'}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.reviewCartText}>Review Order →</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCartBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  headerCartText: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: '800',
  },
  searchSection: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 40,
    marginBottom: SPACING.xs + 2,
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
  departmentPillsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  deptPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceMuted,
    marginRight: SPACING.xs,
  },
  deptPillActive: {
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  deptPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  deptPillTextActive: {
    color: COLORS.primaryDark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.darkBackground,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  cartInfo: {
    flex: 1,
  },
  cartItemsCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  cartTotalAmount: {
    color: COLORS.textInverse,
    fontSize: 18,
    fontWeight: '900',
  },
  reviewCartBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  reviewCartText: {
    color: COLORS.textInverse,
    fontSize: 14,
    fontWeight: '800',
  },
});
