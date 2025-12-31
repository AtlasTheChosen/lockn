'use client';

import { useSession } from '@/hooks/use-session';
import Toolbar from './Toolbar';

export default function ToolbarWrapper() {
  const { user, profile, loading } = useSession();

  // Always show toolbar, even when loading - it will handle the loading state internally
  // This ensures the toolbar is always visible regardless of auth state
  return <Toolbar user={user} profile={profile} />;
}
