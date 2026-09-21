/**
 * Table Status Picker Modal
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Table, TableStatus } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { StatusBadge } from '../common/StatusBadge';

interface TableStatusPickerModalProps {
  visible: boolean;
  table: Table | null;
  onClose: () => void;
  onSelectStatus: (status: TableStatus) => void;
}

const STATUS_OPTIONS: Array<{ status: TableStatus; label: string; desc: string }> = [
  { status: 'AVAILABLE', label: 'Available', desc: 'Ready for new guests' },
  { status: 'OCCUPIED', label: 'Occupied', desc: 'Guests seated' },
  { status: 'RESERVED', label: 'Reserved', desc: 'Booked for upcoming party' },
  { status: 'CLEANING', label: 'Cleaning', desc: 'Busser clearing & sanitizing' },
  { status: 'OUT_OF_SERVICE', label: 'Out of Service', desc: 'Maintenance / disabled' },
];

export const TableStatusPickerModal: React.FC<TableStatusPickerModalProps> = ({
  visible,
  table,
  onClose,
  onSelectStatus,
}) => {
  if (!table) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.header}>
                <Text style={styles.title}>
                  Table {table.tableNumber || table.tableName} Status
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.currentLabel}>
                Current Status:{' '}
                <Text style={{ fontWeight: '700' }}>{table.status}</Text>
              </Text>

              <View style={styles.optionsList}>
                {STATUS_OPTIONS.map((item) => {
                  const isSelected = table.status === item.status;
                  return (
                    <TouchableOpacity
                      key={item.status}
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemSelected,
                      ]}
                      onPress={() => {
                        onSelectStatus(item.status);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionTextContainer}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text style={styles.optionDesc}>{item.desc}</Text>
                      </View>
                      <StatusBadge status={item.status} type="table" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeButton: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  currentLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  optionsList: {
    marginTop: SPACING.xs,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  optionItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  optionLabelSelected: {
    color: COLORS.primaryDark,
  },
  optionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
