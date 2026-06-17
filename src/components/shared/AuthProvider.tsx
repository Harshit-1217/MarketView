'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, user, profile, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Client-side protection as a secondary measure
    if (!loading && user && profile && profile.is_approved === false) {
      if (pathname !== '/pending' && pathname !== '/') {
        window.location.href = '/pending';
      }
    }
  }, [user, profile, loading, pathname]);

  return <>{children}</>;
}
