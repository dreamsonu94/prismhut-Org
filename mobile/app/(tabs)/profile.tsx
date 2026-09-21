/**
 * Waiter Profile & Diagnostics Screen
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import { useNetwork } from '../../src/context/NetworkContext';
import { API_BASE_URL, SOCKET_URL, APP_CONFIG } from '../../src/constants/config';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { Header } from '../../src/components/common/Header';
import { Button } from '../../src/components/common/Button';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, restaurant, logout } = useAuth();
  const { isConnected: isSocketConnected } = useSocket();
  const { isOnline, isBackendReachable, checkConnectivity } = useNetwork();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to end your shift and log out of the Waiter Terminal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Waiter Profile" subtitle="Shift & Terminal Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(user?.name || user?.username || 'W').charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.userName}>{user?.name || user?.username}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{user?.role || 'WAITER'}</Text>
          </View>
          <Text style={styles.usernameText}>@{user?.username}</Text>
        </View>

        {/* Restaurant Context Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Restaurant Context</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Venue:</Text>
            <Text style={styles.value}>
              {restaurant?.name || 'Restaurant Smart POS'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Currency:</Text>
            <Text style={styles.value}>{restaurant?.currency || '$'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Terminal App:</Text>
            <Text style={styles.value}>
              {APP_CONFIG.appName} (v{APP_CONFIG.version})
            </Text>
          </View>
        </View>

        {/* Live Network & Connection Diagnostics */}
        <View style={styles.sectionCard}>
          <View style={styles.diagnosticHeaderRow}>
            <Text style={styles.sectionTitle}>Connection Diagnostics</Text>
            <TouchableOpacity onPress={checkConnectivity}>
              <Text style={styles.testLink}>Test Link</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Internet:</Text>
            <View style={styles.statusGroup}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isOnline ? COLORS.success : COLORS.error },
                ]}
              />
              <Text style={styles.value}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Production API:</Text>
            <View style={styles.statusGroup}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isBackendReachable
                      ? COLORS.success
                      : COLORS.error,
                  },
                ]}
              />
              <Text style={styles.value}>
                {isBackendReachable ? 'Reachable' : 'Unreachable'}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Real-Time Socket:</Text>
            <View style={styles.statusGroup}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isSocketConnected
                      ? COLORS.success
                      : COLORS.warning,
                  },
                ]}
              />
              <Text style={styles.value}>
                {isSocketConnected ? 'Connected' : 'Connecting...'}
              </Text>
            </View>
          </View>

          <View style={styles.rowUrl}>
            <Text style={styles.labelSmall}>API Gateway:</Text>
            <Text style={styles.valueSmall} numberOfLines={1}>
              {API_BASE_URL}
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="End Shift & Sign Out"
            onPress={handleLogout}
            variant="danger"
            size="lg"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.darkBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textInverse,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  rolePill: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginVertical: SPACING.xs,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  usernameText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diagnosticHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  testLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceMuted,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  rowUrl: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  labelSmall: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  valueSmall: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontFamily: 'Courier',
  },
  logoutContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xxl,
  },
});
