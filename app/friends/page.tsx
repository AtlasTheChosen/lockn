'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import FriendsSection from '@/components/dashboard/FriendsSection';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AppLayout } from '@/components/layout';

export default function FriendsPage() {
  const router = useRouter();
  const { user: sessionUser, accessToken, loading: sessionLoading } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!sessionUser) {
      router.push('/auth/login');
      return;
    }
  }, [sessionUser, sessionLoading, router]);

  // Show loading while checking auth
  if (sessionLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-32 mb-8 bg-slate-200" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 shadow-talka-sm">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full bg-slate-200" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2 bg-slate-200" />
                    <Skeleton className="h-4 w-48 bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!sessionUser) {
    return null;
  }

  // Show error state
  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-red-700 mb-2">Error Loading Friends</h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">{error}</p>
            <Button 
              onClick={() => setError(null)} 
              className="bg-gradient-purple-pink text-white font-bold rounded-2xl px-6 py-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl font-semibold text-slate-700 hover:border-talka-purple hover:-translate-x-1 transition-all mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="font-display text-4xl font-semibold gradient-text flex items-center gap-3">
            👥 Friends
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Connect with fellow language learners and compete together!
          </p>
        </div>
        
        <FriendsSection userId={sessionUser.id} accessToken={accessToken || ''} />
      </div>
    </AppLayout>
  );
}
