'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Home, Users, Settings, Plus, LogOut, Trophy, Flame, Target, Sparkles, FileText, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import StackGenerationModal from './StackGenerationModal';

interface Stack {
  id: string;
  title: string;
  scenario: string;
  language: string;
  total_cards: number;
  mastered_count: number;
  created_at: string;
  is_completed?: boolean;
  test_progress?: number;
  test_notes?: any[];
}

interface Stats {
  total_cards_reviewed: number;
  current_streak: number;
  longest_streak: number;
  total_mastered: number;
}

interface Profile {
  display_name: string | null;
  is_premium: boolean;
}

interface User {
  id: string;
  email?: string;
}

interface SidebarDashboardProps {
  user: User;
  profile: Profile | null;
  stacks: Stack[];
  stats: Stats | null;
}

type TabType = 'home' | 'social' | 'settings';

export default function SidebarDashboard({ user, profile, stacks, stats }: SidebarDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedStackNotes, setSelectedStackNotes] = useState<Stack | null>(null);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Use hard navigation to ensure clean logout
    window.location.href = '/';
  };

  const handleNewStack = () => {
    setShowGenerationModal(true);
  };

  const activeStacks = stacks.filter(s => s.mastered_count < s.total_cards);
  const masteredStacks = stacks.filter(s => s.mastered_count === s.total_cards);

  return (
    <>
      <StackGenerationModal
        isOpen={showGenerationModal}
        onClose={() => setShowGenerationModal(false)}
        userId={user.id}
      />
      <div className="min-h-screen bg-black text-white flex">
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-20 bg-white/5 border-r border-white/10 flex flex-col items-center py-8 gap-8"
      >
        <div className="mb-4">
          <Sparkles className="h-8 w-8 text-blue-500" />
        </div>

        <nav className="flex-1 flex flex-col gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveTab('home')}
            className={`h-12 w-12 rounded-xl transition-all ${
              activeTab === 'home'
                ? 'bg-blue-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Home className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveTab('social')}
            className={`h-12 w-12 rounded-xl transition-all ${
              activeTab === 'social'
                ? 'bg-blue-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveTab('settings')}
            className={`h-12 w-12 rounded-xl transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="h-6 w-6" />
          </Button>
        </nav>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="h-12 w-12 rounded-xl text-white/60 hover:text-white hover:bg-white/10"
        >
          <LogOut className="h-6 w-6" />
        </Button>
      </motion.aside>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'home' && (
          <div className="p-8 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h1 className="text-4xl font-light mb-2">
                Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}
              </h1>
              <p className="text-white/60 font-light">Continue your learning journey.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Flame className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-light">{stats?.current_streak || 0}</p>
                    <p className="text-white/60 text-sm font-light">Day Streak</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Target className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-light">{stats?.total_mastered || 0}</p>
                    <p className="text-white/60 text-sm font-light">Total Passed</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-light">{stats?.total_cards_reviewed || 0}</p>
                    <p className="text-white/60 text-sm font-light">Total Reviews</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-light">Active Stacks</h2>
                <Button
                  onClick={handleNewStack}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 font-light"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  New Stack
                </Button>
              </div>
              {activeStacks.length === 0 ? (
                <Card className="bg-white/5 border-white/10 border-dashed">
                  <CardContent className="p-12 text-center">
                    <p className="text-white/60 font-light mb-4">No active stacks yet.</p>
                    <Button
                      onClick={handleNewStack}
                      variant="outline"
                      className="border-white/10 text-white/80 hover:bg-white/10"
                    >
                      Create your first stack
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeStacks.map((stack) => (
                    <Card
                      key={stack.id}
                      className="bg-white/5 border-white/10 hover:bg-white/8 transition-all cursor-pointer"
                      onClick={() => router.push(`/stack/${stack.id}`)}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-light capitalize">{stack.scenario}</h3>
                          <div className="flex items-center gap-2">
                            {stack.test_notes && stack.test_notes.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStackNotes(stack);
                                  setShowNotesModal(true);
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            <Badge className="bg-blue-500/20 text-blue-400 border-0">
                              {stack.language}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60 font-light">Progress</span>
                            <span className="text-white font-light">
                              {stack.mastered_count}/{stack.total_cards}
                            </span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{
                                width: `${(stack.mastered_count / stack.total_cards) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-sm mt-2">
                            <span className="text-white/60 font-light">Test Score</span>
                            <span className={`font-light ${
                              stack.test_progress === 100 
                                ? 'text-green-400' 
                                : stack.test_progress && stack.test_progress > 0
                                  ? 'text-white'
                                  : 'text-white/40'
                            }`}>
                              {stack.test_progress ?? 0}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>

            {masteredStacks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-light mb-6">Mastered</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {masteredStacks.map((stack) => (
                    <Card
                      key={stack.id}
                      className="bg-white/5 border-white/10 hover:bg-white/8 transition-all cursor-pointer"
                      onClick={() => router.push(`/stack/${stack.id}`)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                          <Trophy className="h-6 w-6 text-green-500" />
                        </div>
                        <p className="text-sm font-light capitalize truncate">{stack.scenario}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'social' && (
          <div className="p-8 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <h1 className="text-4xl font-light mb-6">Social</h1>
              
              {/* Quick Links Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card 
                  className="bg-white/5 border-white/10 hover:bg-white/8 transition-all cursor-pointer"
                  onClick={() => router.push('/friends')}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xl font-light">Friends</p>
                      <p className="text-white/60 text-sm font-light">Manage connections</p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-white/5 border-white/10 hover:bg-white/8 transition-all cursor-pointer"
                  onClick={() => router.push('/leaderboard')}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xl font-light">Leaderboard</p>
                      <p className="text-white/60 text-sm font-light">See top learners</p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-white/5 border-white/10 hover:bg-white/8 transition-all cursor-pointer"
                  onClick={() => router.push('/challenges')}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Target className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xl font-light">Challenges</p>
                      <p className="text-white/60 text-sm font-light">Compete with friends</p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-white/5 border-white/10 hover:bg-white/8 transition-all cursor-pointer"
                  onClick={() => router.push('/activity')}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xl font-light">Activity</p>
                      <p className="text-white/60 text-sm font-light">See what's happening</p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-white/5 border-white/10 hover:bg-white/8 transition-all cursor-pointer"
                  onClick={() => router.push('/library')}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xl font-light">Library</p>
                      <p className="text-white/60 text-sm font-light">Browse shared stacks</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-8 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl font-light mb-8">Settings</h1>
              <div className="space-y-6">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-light mb-2">Account</h3>
                    <p className="text-white/60 text-sm font-light mb-4">{user.email}</p>
                    <div className="flex items-center gap-3">
                      <Badge className={profile?.is_premium ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/60'}>
                        {profile?.is_premium ? 'Premium' : 'Free'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/profile')}
                        className="border-white/20 text-white/80 hover:bg-white/10"
                      >
                        Edit Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                {!profile?.is_premium && (
                  <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-light mb-2">Upgrade to Premium</h3>
                      <p className="text-white/60 text-sm font-light mb-4">
                        Unlock unlimited stacks and advanced features
                      </p>
                      <Button
                        onClick={() => router.push('/pricing')}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 font-light"
                      >
                        View Plans
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>

    {/* Notes Modal */}
    <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white font-light flex items-center gap-2">
            <FileText className="h-5 w-5 text-yellow-400" />
            Test Notes - {selectedStackNotes?.scenario}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-3">
          {selectedStackNotes?.test_notes?.length === 0 ? (
            <p className="text-white/60 text-center py-8">No notes yet. Complete a test to see AI feedback here.</p>
          ) : (
            selectedStackNotes?.test_notes?.map((note: any, idx: number) => (
              <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-white font-medium">{note.targetPhrase}</p>
                  <Badge className={note.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                    {note.passed ? 'Passed' : 'Failed'}
                  </Badge>
                </div>
                <p className="text-white/60 text-sm mb-2">Your answer: {note.userAnswer}</p>
                {note.correction && (
                  <div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
                    <p className="text-yellow-400 text-sm">Correction: {note.correction}</p>
                  </div>
                )}
                {note.feedback && (
                  <p className="text-white/40 text-xs mt-2 italic">{note.feedback}</p>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
