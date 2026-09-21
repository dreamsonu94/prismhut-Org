/**
 * Menu Item Card with Quick Quantity Controls
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MenuItem } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  currency?: string;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  quantity,
  currency = '$',
  onAdd,
  onIncrease,
  onDecrease,
}) => {
  const isOutOfStock = !item.isAvailable;

  return (
    <View
      style={[
        styles.card,
        isOutOfStock && styles.cardDisabled,
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            {/* Veg / Non-veg indicator */}
            <View
              style={[
                styles.vegBadge,
                item.isVeg ? styles.vegBadgeVeg : styles.vegBadgeNonVeg,
              ]}
            >
              <View
                style={[
                  styles.vegDot,
                  item.isVeg ? styles.vegDotVeg : styles.vegDotNonVeg,
                ]}
              />
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={styles.price}>
              {currency}
              {Number(item.price || 0).toFixed(2)}
            </Text>
            {item.department === 'BAR' ? (
              <View style={styles.departmentBadge}>
                <Text style={styles.departmentText}>🍸 BAR</Text>
              </View>
            ) : null}
          </View>
        </View>

        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : null}
      </View>

      <View style={styles.actionRow}>
        {isOutOfStock ? (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        ) : quantity > 0 ? (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={onDecrease}
              activeOpacity={0.7}
            >
              <Text style={styles.qtyButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={onIncrease}
              activeOpacity={0.7}
            >
              <Text style={styles.qtyButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAdd}
            activeOpacity={0.75}
          >
            <Text style={styles.addButtonText}>+ ADD</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  vegBadge: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs + 2,
  },
  vegBadgeVeg: {
    borderColor: '#16A34A',
  },
  vegBadgeNonVeg: {
    borderColor: '#DC2626',
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vegDotVeg: {
    backgroundColor: '#16A34A',
  },
  vegDotNonVeg: {
    backgroundColor: '#DC2626',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  description: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginRight: SPACING.sm,
  },
  departmentBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  departmentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7E22CE',
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  addButton: {
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.md,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBackground,
    borderRadius: RADIUS.md,
    paddingHorizontal: 2,
  },
  qtyButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  qtyButtonText: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '800',
  },
  qtyText: {
    color: COLORS.textInverse,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: SPACING.xs,
    minWidth: 20,
    textAlign: 'center',
  },
  outOfStockBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  outOfStockText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
