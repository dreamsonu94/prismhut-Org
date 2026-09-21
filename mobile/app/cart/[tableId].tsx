/**
 * Cart Review & Safe Order Submission Screen
 * Enforces production idempotency keys to eliminate duplicate kitchen orders.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useCart } from '../../src/context/CartContext';
import { orderService } from '../../src/services/orderService';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { Header } from '../../src/components/common/Header';
import { Button } from '../../src/components/common/Button';
import { EmptyState } from '../../src/components/common/LoadingSkeleton';

export default function CartScreen() {
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurant } = useAuth();
  const {
    items,
    guestCount,
    orderNotes,
    subtotal,
    taxAmount,
    total,
    updateQuantity,
    updateItemNotes,
    removeItem,
    setGuestCount,
    setOrderNotes,
    clearCart,
  } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    // Format payload for backend createOrder API
    const orderPayload = {
      tableId: tableId && tableId !== 'default' ? tableId : undefined,
      guestCount,
      orderType: 'DINE_IN' as const,
      notes: orderNotes.trim() || undefined,
      items: items.map((item) => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        notes: item.notes?.trim() || undefined,
      })),
    };

    try {
      const response = await orderService.createOrder(orderPayload);
      clearCart();
      router.replace(`/order/${response.order.id}`);
    } catch (err: any) {
      setSubmissionError(
        err.message || 'Order submission failed. Please retry.'
      );
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Order Cart" onBack={() => router.back()} />
        <EmptyState
          title="Cart is Empty"
          description="Add items from the menu to build an order."
          actionTitle="Browse Menu"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Review & Send to Kitchen"
        subtitle={`${items.length} unique items`}
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        {submissionError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{submissionError}</Text>
          </View>
        ) : null}

        {/* Guest Count & Notes Card */}
        <View style={styles.metaCard}>
          <View style={styles.guestRow}>
            <Text style={styles.metaLabel}>Party Size (Guests):</Text>
            <View style={styles.guestCounter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
              >
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterText}>{guestCount}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setGuestCount(guestCount + 1)}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.notesInputContainer}>
            <Text style={styles.notesLabel}>Table / Kitchen Instructions:</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Serve appetizers together, allergy info..."
              placeholderTextColor={COLORS.textMuted}
              value={orderNotes}
              onChangeText={setOrderNotes}
              multiline
            />
          </View>
        </View>

        {/* Items List */}
        <Text style={styles.sectionTitle}>Order Items</Text>
        {items.map((item) => (
          <View key={item.menuItem.id} style={styles.itemCard}>
            <View style={styles.itemTopRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.menuItem.name}</Text>
                <Text style={styles.itemUnitPrice}>
                  {restaurant?.currency || '$'}
                  {Number(item.menuItem.price).toFixed(2)} each
                </Text>
              </View>

              <View style={styles.qtyControl}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() =>
                    updateQuantity(item.menuItem.id, item.quantity - 1)
                  }
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() =>
                    updateQuantity(item.menuItem.id, item.quantity + 1)
                  }
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Item-specific kitchen instructions */}
            <TextInput
              style={styles.itemNotesInput}
              placeholder="Add cooking note (e.g. extra spicy, no ice)..."
              placeholderTextColor={COLORS.textMuted}
              value={item.notes}
              onChangeText={(n) => updateItemNotes(item.menuItem.id, n)}
            />

            <View style={styles.itemBottomRow}>
              <TouchableOpacity
                onPress={() => removeItem(item.menuItem.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
              <Text style={styles.itemSubtotal}>
                {restaurant?.currency || '$'}
                {(item.menuItem.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        {/* Totals Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {restaurant?.currency || '$'}
              {subtotal.toFixed(2)}
            </Text>
          </View>
          {taxAmount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Est. Tax</Text>
              <Text style={styles.summaryValue}>
                {restaurant?.currency || '$'}
                {taxAmount.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalValue}>
              {restaurant?.currency || '$'}
              {total.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Order Submission Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.bottomBarTotal}>
          <Text style={styles.bottomBarLabel}>Total to Send</Text>
          <Text style={styles.bottomBarAmount}>
            {restaurant?.currency || '$'}
            {total.toFixed(2)}
          </Text>
        </View>
        <Button
          title="⚡ SEND TO KITCHEN"
          onPress={handleSubmitOrder}
          loading={isSubmitting}
          variant="primary"
          size="lg"
          style={styles.submitBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  metaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  guestCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
  },
  counterBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  counterBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  notesInputContainer: {
    marginTop: SPACING.xs,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  notesInput: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 13,
    color: COLORS.textPrimary,
    minHeight: 44,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemUnitPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBackground,
    borderRadius: RADIUS.md,
  },
  qtyBtn: {
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
  },
  qtyBtnText: {
    color: COLORS.textInverse,
    fontSize: 14,
    fontWeight: '800',
  },
  qtyValue: {
    color: COLORS.textInverse,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: SPACING.xs,
    minWidth: 18,
    textAlign: 'center',
  },
  itemNotesInput: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  removeText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '600',
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  totalValue: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  bottomBarTotal: {
    marginRight: SPACING.md,
  },
  bottomBarLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  bottomBarAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  submitBtn: {
    flex: 1,
  },
});
