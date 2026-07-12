'use client';

import React from 'react';
import { AuthProvider } from '@/lib/AuthContext';
import { usePathname } from 'next/navigation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlayer = pathname.startsWith('/player/');

  return (
    <AuthProvider>
      <div className="content-overlay">
        {children}
      </div>
    </AuthProvider>
  );
}
