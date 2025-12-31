'use client';

import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';

export interface Theme {
  id: string;
  name: string;
  bgColor: string;
  textColor: string;
}

export const THEMES: Theme[] = [
  { id: 'electric-teal', name: 'Electric Teal', bgColor: '#00D4FF', textColor: '#000000' },
  { id: 'neon-coral', name: 'Neon Coral', bgColor: '#FF6B6B', textColor: '#FFFFFF' },
  { id: 'vibrant-lime', name: 'Vibrant Lime', bgColor: '#A0FF6B', textColor: '#000000' },
  { id: 'cosmic-purple', name: 'Cosmic Purple', bgColor: '#9B59FF', textColor: '#FFFFFF' },
  { id: 'sunset-magenta', name: 'Sunset Magenta', bgColor: '#FF4DA6', textColor: '#FFFFFF' },
  { id: 'midnight-black', name: 'Midnight Black', bgColor: '#121212', textColor: '#FFFFFF' },
  { id: 'pure-snow-white', name: 'Pure Snow White', bgColor: '#FFFFFF', textColor: '#000000' },
  { id: 'storm-grey', name: 'Storm Grey', bgColor: '#4A5568', textColor: '#FFFFFF' },
  { id: 'ocean-turquoise', name: 'Ocean Turquoise', bgColor: '#2DD4BF', textColor: '#000000' },
  { id: 'golden-amber', name: 'Golden Amber', bgColor: '#FFB340', textColor: '#000000' },
];

interface ThemeSelectorProps {
  userId?: string;
}

export default function ThemeSelector({ userId }: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState<string>('midnight-black');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadThemePreference();
  }, [userId]);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const loadThemePreference = async () => {
    // If no userId, just load from localStorage
    if (!userId) {
      const savedTheme = localStorage.getItem('talka-theme');
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
      return;
    }

    try {
      // Check if user_preferences table exists, if not fall back to localStorage
      const { data, error: queryError } = await supabase
        .from('user_preferences')
        .select('theme_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (queryError) {
        // Table doesn't exist or query failed - use localStorage
        console.warn('Theme: user_preferences query failed, using localStorage:', queryError.message);
        const savedTheme = localStorage.getItem('talka-theme');
        if (savedTheme) {
          setCurrentTheme(savedTheme);
        }
        return;
      }

      if (data?.theme_id) {
        setCurrentTheme(data.theme_id);
      } else {
        const savedTheme = localStorage.getItem('talka-theme');
        if (savedTheme) {
          setCurrentTheme(savedTheme);
        }
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      const savedTheme = localStorage.getItem('talka-theme');
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
    }
  };

  const applyTheme = (themeId: string) => {
    const theme = THEMES.find((t) => t.id === themeId);
    if (theme) {
      document.documentElement.style.setProperty('--theme-bg', theme.bgColor);
      document.documentElement.style.setProperty('--theme-text', theme.textColor);
      localStorage.setItem('talka-theme', themeId);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    setIsLoading(true);
    setCurrentTheme(themeId);

    // Always save to localStorage
    localStorage.setItem('talka-theme', themeId);

    // Only save to database if userId is provided
    if (userId) {
      try {
        const { data: existingPref, error: queryError } = await supabase
          .from('user_preferences')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (queryError) {
          // Table doesn't exist - just use localStorage (already saved above)
          console.warn('Theme: user_preferences table not available, using localStorage only:', queryError.message);
          return;
        }

        if (existingPref) {
          await supabase
            .from('user_preferences')
            .update({ theme_id: themeId, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        } else {
          await supabase.from('user_preferences').insert({
            user_id: userId,
            theme_id: themeId,
          });
        }
      } catch (error) {
        // Silent fail - theme is already saved to localStorage
        console.warn('Theme: Error saving to database, using localStorage only:', error);
      }
    }
    
    setIsLoading(false);
  };

  const selectedTheme = THEMES.find((t) => t.id === currentTheme) || THEMES[5];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading} className="gap-2">
          <Palette className="h-4 w-4" />
          <span
            className="w-4 h-4 rounded-full border border-slate-300"
            style={{ backgroundColor: selectedTheme.bgColor }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold text-slate-700">Choose Theme</div>
        {THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full border border-slate-300"
                style={{ backgroundColor: theme.bgColor }}
              />
              <span>{theme.name}</span>
            </div>
            {currentTheme === theme.id && <Check className="h-4 w-4 text-blue-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
