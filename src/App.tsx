import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { Layout } from './components/Layout.js';

import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { Tables } from './pages/Tables.js';
import { PosTerminal } from './pages/PosTerminal.js';
import { KitchenKds } from './pages/KitchenKds.js';
import { BarBds } from './pages/BarBds.js';
import { BillingCashier } from './pages/BillingCashier.js';
import { OrdersInvoices } from './pages/OrdersInvoices.js';
import { Reports } from './pages/Reports.js';
import { Settings } from './pages/Settings.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Protected operational routes wrapped in Layout */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="tables" element={<Tables />} />
                <Route path="pos" element={<PosTerminal />} />
                <Route path="kitchen" element={<KitchenKds />} />
                <Route path="bar" element={<BarBds />} />
                <Route path="billing" element={<BillingCashier />} />
                <Route path="orders" element={<OrdersInvoices />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
