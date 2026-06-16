'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';

export default function PendingPage() {
  const [email, setEmail] = useState<string>('');
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || '');
    });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-bull/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10 text-center">
        <div className="glass rounded-2xl p-8 shadow-2xl relative border-border bg-card/60 flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-6">
            <Clock className="h-8 w-8 text-orange-500 animate-pulse" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">Account Pending Approval</h1>
          
          <p className="text-muted-foreground text-sm mb-8">
            Your account {email ? `(${email}) ` : ''}has been successfully created, but it requires administrator approval before you can access the platform. Please check back later.
          </p>

          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 py-3 px-6 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors w-full cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
