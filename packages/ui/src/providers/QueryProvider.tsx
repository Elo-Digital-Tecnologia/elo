// QueryProvider — TanStack Query provider with defaults
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
  client?: QueryClient;
}

export function QueryProvider({ children, client: externalClient }: QueryProviderProps) {
  const [internalClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: 'always'
          },
          mutations: {
            retry: 0
          }
        }
      })
  );

  const client = externalClient ?? internalClient;

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

// Hook to access query client
export function useQueryClient(): QueryClient {
  // This would need to be imported from @tanstack/react-query
  // For now, we'll export a type-only helper
  throw new Error('Use useQueryClient from @tanstack/react-query directly');
}

// Query keys factory for consistent key management
export const queryKeys = {
  // Auth
  auth: {
    me: () => ['auth', 'me'] as const,
    session: () => ['auth', 'session'] as const
  },

  // Restaurants
  restaurants: {
    all: () => ['restaurants'] as const,
    list: (params?: Record<string, unknown>) => ['restaurants', 'list', params] as const,
    detail: (id: string) => ['restaurants', 'detail', id] as const,
    subscription: (id: string) => ['restaurants', id, 'subscription'] as const
  },

  // Menu
  menu: {
    categories: (restaurantId: string) => ['menu', restaurantId, 'categories'] as const,
    products: (restaurantId: string, categoryId?: string) =>
      ['menu', restaurantId, 'products', categoryId] as const,
    product: (restaurantId: string, productId: string) =>
      ['menu', restaurantId, 'product', productId] as const,
    options: (productId: string) => ['menu', 'product', productId, 'options'] as const
  },

  // Tables
  tables: {
    all: (restaurantId: string) => ['tables', restaurantId] as const,
    detail: (restaurantId: string, tableId: string) =>
      ['tables', restaurantId, tableId] as const,
    session: (token: string) => ['tables', 'session', token] as const,
    qrCode: (restaurantId: string, tableId: string) =>
      ['tables', restaurantId, tableId, 'qr'] as const
  },

  // Orders
  orders: {
    all: (restaurantId: string, params?: Record<string, unknown>) =>
      ['orders', restaurantId, params] as const,
    detail: (restaurantId: string, orderId: string) =>
      ['orders', restaurantId, orderId] as const,
    kitchen: (restaurantId: string) => ['orders', restaurantId, 'kitchen'] as const,
    waiter: (restaurantId: string) => ['orders', restaurantId, 'waiter'] as const,
    customer: (sessionToken: string) => ['orders', 'customer', sessionToken] as const
  },

  // Billing
  billing: {
    bill: (restaurantId: string, tableId: string) =>
      ['billing', restaurantId, tableId] as const,
    history: (restaurantId: string, params?: Record<string, unknown>) =>
      ['billing', restaurantId, 'history', params] as const
  },

  // Reports
  reports: {
    sales: (restaurantId: string, params?: Record<string, unknown>) =>
      ['reports', restaurantId, 'sales', params] as const,
    products: (restaurantId: string, params?: Record<string, unknown>) =>
      ['reports', restaurantId, 'products', params] as const,
    orders: (restaurantId: string, params?: Record<string, unknown>) =>
      ['reports', restaurantId, 'orders', params] as const
  },

  // Subscriptions
  subscriptions: {
    all: () => ['subscriptions'] as const,
    detail: (id: string) => ['subscriptions', id] as const,
    payments: (subscriptionId: string) =>
      ['subscriptions', subscriptionId, 'payments'] as const
  },

  // Users
  users: {
    all: (restaurantId: string) => ['users', restaurantId] as const,
    detail: (restaurantId: string, userId: string) =>
      ['users', restaurantId, userId] as const,
    roles: () => ['users', 'roles'] as const
  }
} as const;

// Mutation keys factory
export const mutationKeys = {
  auth: {
    login: () => ['auth', 'login'] as const,
    logout: () => ['auth', 'logout'] as const,
    refresh: () => ['auth', 'refresh'] as const
  },
  menu: {
    createCategory: () => ['menu', 'createCategory'] as const,
    updateCategory: () => ['menu', 'updateCategory'] as const,
    deleteCategory: () => ['menu', 'deleteCategory'] as const,
    createProduct: () => ['menu', 'createProduct'] as const,
    updateProduct: () => ['menu', 'updateProduct'] as const,
    deleteProduct: () => ['menu', 'deleteProduct'] as const,
    toggleAvailability: () => ['menu', 'toggleAvailability'] as const
  },
  tables: {
    create: () => ['tables', 'create'] as const,
    update: () => ['tables', 'update'] as const,
    delete: () => ['tables', 'delete'] as const,
    regenerateToken: () => ['tables', 'regenerateToken'] as const
  },
  orders: {
    create: () => ['orders', 'create'] as const,
    updateStatus: () => ['orders', 'updateStatus'] as const,
    cancel: () => ['orders', 'cancel'] as const,
    callWaiter: () => ['orders', 'callWaiter'] as const,
    validateOpen: () => ['orders', 'validateOpen'] as const,
    closeTable: () => ['orders', 'closeTable'] as const
  },
  billing: {
    calculate: () => ['billing', 'calculate'] as const,
    applyServiceCharge: () => ['billing', 'applyServiceCharge'] as const,
    removeServiceCharge: () => ['billing', 'removeServiceCharge'] as const,
    splitBill: () => ['billing', 'splitBill'] as const,
    closeBill: () => ['billing', 'closeBill'] as const
  },
  subscriptions: {
    create: () => ['subscriptions', 'create'] as const,
    update: () => ['subscriptions', 'update'] as const,
    suspend: () => ['subscriptions', 'suspend'] as const,
    reactivate: () => ['subscriptions', 'reactivate'] as const,
    recordPayment: () => ['subscriptions', 'recordPayment'] as const
  },
  users: {
    create: () => ['users', 'create'] as const,
    update: () => ['users', 'update'] as const,
    delete: () => ['users', 'delete'] as const,
    changeRole: () => ['users', 'changeRole'] as const
  }
} as const;