'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User } from 'lucide-react';

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
  onComplete: (displayName: string) => void;
}

export default function DisplayNameModal({ userId, onComplete }: DisplayNameModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      onComplete(trimmedName);
    } catch (err: any) {
      console.error('Error setting display name:', err);
      setError(err.message || 'Failed to set display name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 z-50">
      <Card className="w-full max-w-md bg-slate-900 border-slate-700">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl text-white">Choose Your Display Name</CardTitle>
          <CardDescription className="text-slate-400">
            This is how other users will see you. You can change it later in settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name..."
                className="bg-slate-800 border-slate-700 text-white text-lg py-6"
                maxLength={30}
                autoFocus
              />
              <p className="text-slate-500 text-xs mt-2">
                {displayName.length}/30 characters
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !displayName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
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

