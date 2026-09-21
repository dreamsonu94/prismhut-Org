/**
 * Expo Router Root Layout
 * Wraps application in Auth, Network, Socket, and Cart Context Providers
 */
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { NetworkProvider } from '../src/context/NetworkContext';
import { SocketProvider } from '../src/context/SocketContext';
import { CartProvider } from '../src/context/CartContext';
import { NetworkBanner } from '../src/components/common/NetworkBanner';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NetworkProvider>
          <SocketProvider>
            <CartProvider>
              <StatusBar style="dark" />
              <NetworkBanner />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="login" options={{ animation: 'fade' }} />
                <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                <Stack.Screen name="table/[id]" options={{ presentation: 'card' }} />
                <Stack.Screen name="menu/[tableId]" options={{ presentation: 'card' }} />
                <Stack.Screen name="cart/[tableId]" options={{ presentation: 'modal' }} />
                <Stack.Screen name="order/[id]" options={{ presentation: 'card' }} />
              </Stack>
            </CartProvider>
          </SocketProvider>
        </NetworkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
