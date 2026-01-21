'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, Sparkles, BookOpen } from 'lucide-react';

// Banned words list (lowercase) - comprehensive list of slurs and offensive terms
const BANNED_WORDS = [
  // Racial slurs
  'nigger', 'nigga', 'negro', 'coon', 'spic', 'spick', 'wetback', 'beaner', 'chink', 
  'gook', 'slope', 'zipperhead', 'jap', 'paki', 'raghead', 'towelhead', 'camel jockey',
  'kike', 'heeb', 'hymie', 'cracker', 'honky', 'gringo', 'redskin', 'injun', 'squaw',
  'darkie', 'sambo', 'jiggaboo', 'porchmonkey', 'Uncle Tom',
  // Homophobic slurs
  'faggot', 'fag', 'dyke', 'homo', 'queer', 'tranny', 'shemale',
  // Other slurs and offensive terms
  'retard', 'retarded', 'cunt', 'twat', 'whore', 'slut', 'bitch',
  // Explicit terms
  'fuck', 'shit', 'ass', 'asshole', 'dick', 'cock', 'pussy', 'penis', 'vagina',
  // Nazi/hate group references
  'nazi', 'hitler', 'kkk', 'white power', 'heil',
];

// Character substitutions for leetspeak detection
const CHAR_SUBSTITUTIONS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '2': 'z',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '|': 'i',
  '+': 't',
  '€': 'e',
  '£': 'l',
  '¥': 'y',
  '©': 'c',
  '®': 'r',
  '†': 't',
  'ñ': 'n',
  'ü': 'u',
  'ö': 'o',
  'ä': 'a',
  'ß': 'ss',
  'æ': 'ae',
  'ø': 'o',
  'å': 'a',
};

// Normalize text to catch leetspeak and special characters
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  
  // Replace character substitutions
  for (const [char, replacement] of Object.entries(CHAR_SUBSTITUTIONS)) {
    normalized = normalized.split(char).join(replacement);
  }
  
  // Remove spaces, underscores, dashes, dots, and other separators
  normalized = normalized.replace(/[\s_\-\.·•‧]+/g, '');
  
  // Remove repeated characters (e.g., "niggggger" -> "niger")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');
  
  return normalized;
}

// Check if text contains any banned words
function containsBannedWord(text: string): boolean {
  const normalized = normalizeText(text);
  
  for (const word of BANNED_WORDS) {
    const normalizedWord = normalizeText(word);
    if (normalized.includes(normalizedWord)) {
      return true;
    }
  }
  
  return false;
}

interface DisplayNameModalProps {
  userId: string;
  onComplete: (displayName: string, showTutorial?: boolean) => void;
}

export default function DisplayNameModal({ userId, onComplete }: DisplayNameModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [savedDisplayName, setSavedDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = displayName.trim();
    
    if (!trimmedName) {
      setError('Please enter a display name');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 30) {
      setError('Display name must be 30 characters or less');
      return;
    }

    // Check for inappropriate content
    if (containsBannedWord(trimmedName)) {
      setError('This display name contains inappropriate content. Please choose another.');
      return;
    }

    // Only allow alphanumeric, spaces, underscores, and dashes
    if (!/^[a-zA-Z0-9\s_\-]+$/.test(trimmedName)) {
      setError('Display name can only contain letters, numbers, spaces, underscores, and dashes');
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      // Check if display name is already taken (case-insensitive)
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .ilike('display_name', trimmedName)
        .neq('id', userId)
        .maybeSingle();

      if (existing) {
        setError('This display name is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // Update the user's profile with the display name
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ display_name: trimmedName })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Save name and show tutorial prompt
      setSavedDisplayName(trimmedName);
      setShowTutorialPrompt(true);
    } catch (err: any) {
      console.error('Error setting display name:', err);
      setError(err.message || 'Failed to set display name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show tutorial prompt after display name is saved
  if (showTutorialPrompt) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-6 z-[101]" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <Card className="w-full max-w-md border-0 rounded-3xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
          <CardHeader className="text-center pt-8">
            <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(to bottom right, var(--accent-green), var(--accent-blue))', boxShadow: '0 8px 20px rgba(88, 204, 2, 0.3)' }}>
              <BookOpen className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Welcome, {savedDisplayName}! 🎉</CardTitle>
            <CardDescription className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              Would you like a quick tour of how the app works?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-8">
            <Button
              onClick={() => onComplete(savedDisplayName, true)}
              className="w-full hover:opacity-90 text-white font-bold py-6 text-lg rounded-2xl transition-all hover:-translate-y-0.5 active:translate-y-1"
              style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Show me around
            </Button>
            <Button
              onClick={() => onComplete(savedDisplayName, false)}
              variant="ghost"
              className="w-full py-6 text-lg rounded-2xl font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              Skip for now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-6 z-[101]" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <Card className="w-full max-w-md border-0 rounded-3xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
        <CardHeader className="text-center pt-8">
          <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(to bottom right, var(--accent-blue), var(--accent-green))', boxShadow: '0 8px 20px rgba(28, 176, 246, 0.3)' }}>
            <User className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Choose Your Display Name</CardTitle>
          <CardDescription className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            This is how other users will see you. You can change it later in settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name..."
                className="text-lg py-6 rounded-2xl focus:ring-0"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
                maxLength={30}
                autoFocus
              />
              <p className="text-xs mt-2 text-right" style={{ color: 'var(--text-muted)' }}>
                {displayName.length}/30 characters
              </p>
            </div>

            {error && (
              <p className="text-sm text-center font-medium" style={{ color: 'var(--accent-red)' }}>{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !displayName.trim()}
              className="w-full hover:opacity-90 text-white font-bold py-6 text-lg rounded-2xl transition-all hover:-translate-y-0.5 disabled:opacity-50 active:translate-y-1"
              style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

