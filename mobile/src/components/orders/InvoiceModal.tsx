/**
 * Invoice / Bill Viewing Modal for Waiter
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Order, Invoice } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { Button } from '../common/Button';

interface InvoiceModalProps {
  visible: boolean;
  order: Order | null;
  invoice: Invoice | null;
  currency?: string;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  visible,
  order,
  invoice,
  currency = '$',
  onClose,
}) => {
  if (!order) return null;

  const invNumber = invoice?.invoiceNumber || `EST-${order.orderNumber}`;
  const subtotal = invoice?.subtotal || order.subtotal || 0;
  const tax = invoice?.taxAmount || order.taxAmount || 0;
  const serviceCharge = invoice?.serviceCharge || order.serviceCharge || 0;
  const grandTotal = invoice?.grandTotal || order.totalAmount || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Bill Statement</Text>
              <Text style={styles.subTitle}>Invoice #{invNumber}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Metadata */}
            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Table:</Text>
                <Text style={styles.metaValue}>
                  {order.table?.tableName || order.table?.tableNumber || 'Takeaway'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Waiter:</Text>
                <Text style={styles.metaValue}>
                  {order.waiter?.name || 'Assigned Waiter'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date:</Text>
                <Text style={styles.metaValue}>
                  {new Date(order.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Itemized list */}
            <Text style={styles.sectionTitle}>Ordered Items</Text>
            <View style={styles.itemsTable}>
              {order.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                  <Text style={styles.itemName}>{item.menuItem?.name}</Text>
                  <Text style={styles.itemTotal}>
                    {currency}
                    {Number(item.subtotal || (item.unitPrice * item.quantity)).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calculations */}
            <View style={styles.totalsBox}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Subtotal</Text>
                <Text style={styles.calcValue}>
                  {currency}
                  {Number(subtotal).toFixed(2)}
                </Text>
              </View>
              {tax > 0 ? (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Tax</Text>
                  <Text style={styles.calcValue}>
                    {currency}
                    {Number(tax).toFixed(2)}
                  </Text>
                </View>
              ) : null}
              {serviceCharge > 0 ? (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Service Charge</Text>
                  <Text style={styles.calcValue}>
                    {currency}
                    {Number(serviceCharge).toFixed(2)}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.calcRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total Due</Text>
                <Text style={styles.grandTotalValue}>
                  {currency}
                  {Number(grandTotal).toFixed(2)}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Close Receipt"
              onPress={onClose}
              variant="secondary"
              size="md"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeText: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: 4,
  },
  scrollContent: {
    marginVertical: SPACING.md,
  },
  metaBox: {
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsTable: {
    marginBottom: SPACING.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceMuted,
  },
  itemQuantity: {
    width: 32,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  footer: {
    paddingTop: SPACING.sm,
  },
});
