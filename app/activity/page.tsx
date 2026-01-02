'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import ActivityFeed from '@/components/social/ActivityFeed';
import {
  ArrowLeft,
  Activity,
  Users,
  Globe,
} from 'lucide-react';

export default function ActivityPage() {
  const router = useRouter();
  const { user: sessionUser, loading: sessionLoading } = useSession();

  // Handle authentication
  useEffect(() => {
    if (!sessionLoading && !sessionUser) {
      router.push('/auth/login');
    }
  }, [sessionUser, sessionLoading, router]);

  // Loading state
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8 bg-slate-700" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full bg-slate-700" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32 bg-slate-700" />
                      <Skeleton className="h-4 w-48 bg-slate-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-indigo-400" />
              Activity Feed
            </h1>
            <p className="text-slate-400 text-sm">See what's happening in the community</p>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 mb-6">
            <TabsTrigger value="all" className="gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">All Activity</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Friends</span>
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">My Activity</span>
              <span className="sm:hidden">Mine</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ActivityFeed limit={30} showUserInfo />
          </TabsContent>

          <TabsContent value="friends">
            <ActivityFeed friendsOnly limit={30} showUserInfo />
          </TabsContent>

          <TabsContent value="mine">
            <ActivityFeed userId={sessionUser.id} limit={30} showUserInfo={false} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}






