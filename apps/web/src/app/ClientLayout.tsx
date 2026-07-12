'use client';

import React from 'react';
import { AuthProvider } from '@/lib/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Sidebar />
      <main style={{ marginLeft: 'var(--sidebar-width)', minHeight: '100vh' }}>
        {children}
      </main>
    </AuthProvider>
  );
}
