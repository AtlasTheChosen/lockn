'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardTabs from '@/components/dashboard/DashboardTabs';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    user: null,
    profile: null,
    stacks: [],
    stats: null,
    userName: 'Guest',
  });

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = user
        ? await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
        : { data: null };

      const { data: stacks } = user
        ? await supabase
            .from('card_stacks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        : { data: [] };

      const { data: stats } = user
        ? await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
        : { data: null };

      const userName = profile?.display_name || user?.email?.split('@')[0] || 'Guest';

      setData({
        user,
        profile,
        stacks: stacks || [],
        stats,
        userName,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <DashboardTabs
      stacks={data.stacks}
      stats={data.stats}
      profile={data.profile}
      userId={data.user?.id || ''}
      userName={data.userName}
      onUpdate={loadData}
    />
  );
}
