/**
 * Network Connectivity Alert Banner
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetwork } from '../../context/NetworkContext';
import { useSocket } from '../../context/SocketContext';
import { COLORS, SPACING } from '../../constants/theme';

export const NetworkBanner: React.FC = () => {
  const { isOnline, isBackendReachable, checkConnectivity } = useNetwork();
  const { isConnected: isSocketConnected } = useSocket();

  if (isOnline && isBackendReachable && isSocketConnected) {
    return null;
  }

  const getMessage = () => {
    if (!isOnline) {
      return 'No internet connection. Operating offline.';
    }
    if (!isBackendReachable) {
      return 'Connecting to restaurant server...';
    }
    if (!isSocketConnected) {
      return 'Live real-time updates reconnecting...';
    }
    return '';
  };

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{getMessage()}</Text>
      <TouchableOpacity
        onPress={checkConnectivity}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.retryButton}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F59E0B',
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  retryButton: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginLeft: SPACING.sm,
  },
});
