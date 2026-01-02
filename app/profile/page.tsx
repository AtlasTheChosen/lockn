'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import ProfileSettings from '@/components/dashboard/ProfileSettings';
import type { UserProfile } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function ProfilePage() {
  const router = useRouter();
  const { user: sessionUser, profile: sessionProfile, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadData = useCallback(async () => {
    if (!sessionUser) return;

    try {
      setError(null);
      
      // Use session profile if available
      if (sessionProfile) {
        setProfile(sessionProfile);
        setLoading(false);
        return;
      }

      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?id=eq.${sessionUser.id}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const profileData = profileResponse.ok ? await profileResponse.json() : [];

      if (!profileData || profileData.length === 0) {
        // Create profile if it doesn't exist
        const createResponse = await fetch(
          `${supabaseUrl}/rest/v1/user_profiles`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              id: sessionUser.id,
              email: sessionUser.email,
            }),
          }
        );
        const newProfile = createResponse.ok ? await createResponse.json() : [];
        setProfile(newProfile?.[0] || null);
      } else {
        setProfile(profileData[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [sessionUser, sessionProfile]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!sessionUser) {
      router.push('/auth/login');
      return;
    }
    loadData();
  }, [sessionUser, sessionLoading, router, loadData]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8 bg-slate-700" />
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <Skeleton className="h-24 bg-slate-700" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Error Loading Profile</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">{error}</p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setLoading(true);
                  loadData();
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Link href="/">
                <Button variant="outline" className="border-slate-600">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back navigation */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
        </div>

        {/* Profile Settings */}
        {profile ? (
          <ProfileSettings profile={profile} onUpdate={loadData} />
        ) : (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-12 text-center">
              <p className="text-slate-400">Unable to load profile settings.</p>
            </CardContent>
          </Card>
        )}

        {/* Back to Dashboard */}
        <div className="flex justify-center pt-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
