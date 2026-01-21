'use client';

import { useState, useEffect } from 'react';

interface StreakSectionProps {
  currentStreak: number;
  dailyCardsLearned: number;
  dailyGoal?: number;
  className?: string;
}

// Get the current day of week (0 = Sunday, 1 = Monday, etc.)
const getDayOfWeek = () => new Date().getDay();

// Get days data for the week
const getWeekDays = (dailyCardsLearned: number, dailyGoal: number, currentStreak: number) => {
  const today = getDayOfWeek();
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  // Reorder to start from Monday
  const orderedDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const todayMondayBased = today === 0 ? 6 : today - 1; // Convert Sunday=0 to Monday-based
  const todayMetGoal = dailyCardsLearned >= dailyGoal;
  
  return orderedDays.map((day, index) => {
    const isToday = index === todayMondayBased;
    const isPast = index < todayMondayBased;
    const isFuture = index > todayMondayBased;
    
    // Calculate days ago from today (0 = today, 1 = yesterday, 2 = day before, etc.)
    const daysAgo = todayMondayBased - index;
    
    // Determine if this day should be marked as completed
    let isCompleted = false;
    if (isFuture) {
      isCompleted = false;
    } else if (isToday) {
      // Today is completed if goal is met
      isCompleted = todayMetGoal;
    } else if (isPast) {
      // For past days, show green circles matching the streak count
      // The streak represents consecutive completed days
      // If today is completed: streak includes today, so show previous (currentStreak - 1) days
      // If today is NOT completed: streak doesn't include today, so show previous currentStreak days
      // daysAgo will be positive for past days (1 = yesterday, 2 = day before, etc.)
      if (todayMetGoal) {
        // Today is completed, so streak includes today (counts as 1)
        // Show the previous (currentStreak - 1) days as green
        isCompleted = daysAgo > 0 && daysAgo <= (currentStreak - 1);
      } else {
        // Today is NOT completed, so streak doesn't include today
        // Show the previous currentStreak days as green
        isCompleted = daysAgo > 0 && daysAgo <= currentStreak;
      }
    }
    
    return {
      label: day,
      isToday,
      isPast,
      isFuture,
      isCompleted,
    };
  });
};

export default function StreakSection({ 
  currentStreak, 
  dailyCardsLearned,
  dailyGoal = 5,
  className = '' 
}: StreakSectionProps) {
  const [weekDays, setWeekDays] = useState(getWeekDays(dailyCardsLearned, dailyGoal, currentStreak));
  const [parrotMessage, setParrotMessage] = useState('Keep it up! 🔥');
  
  useEffect(() => {
    setWeekDays(getWeekDays(dailyCardsLearned, dailyGoal, currentStreak));
  }, [dailyCardsLearned, dailyGoal, currentStreak]);

  // Calculate streak circle progress (0-100%)
  const streakGoal = 7; // Weekly goal for visual representation
  const streakProgress = Math.min((currentStreak / streakGoal) * 100, 100);
  const circumference = 2 * Math.PI * 52; // radius of 52
  const strokeDashoffset = circumference - (streakProgress / 100) * circumference;

  // Parrot mood based on streak
  const getParrotMood = () => {
    if (currentStreak >= 7) return 'celebrating';
    if (currentStreak === 0) return 'sad';
    return '';
  };

  // Random messages on hover
  const messages = [
    "You're on fire! 🔥",
    "Keep it up! 🎯",
    "Amazing progress! ⭐",
    "Don't break the streak! 💪",
    "You're doing great! 🎉",
    "Learning champion! 🏆",
  ];

  const handleParrotHover = () => {
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setParrotMessage(randomMessage);
  };

  return (
    <div className={`streak-section flex items-center gap-8 bg-[var(--bg-card)] p-6 rounded-[20px] mb-6 border-2 border-[var(--border-color)] shadow-[var(--shadow-md)] relative overflow-hidden ${className}`}>
      {/* Background glow */}
      <div className="absolute -top-1/2 -right-[10%] w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(255,150,0,0.1),transparent_60%)] rounded-full pointer-events-none" />
      
      <div className="flex items-center gap-8 flex-1 relative z-10">
        {/* Streak Circle Display */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-[120px] h-[120px]">
            <svg className="transform -rotate-90" width="120" height="120" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff9600" />
                  <stop offset="100%" stopColor="#ffaa00" />
                </linearGradient>
              </defs>
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--bg-secondary)"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="url(#streakGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl animate-[flameFlicker_1.5s_ease-in-out_infinite]">🔥</span>
              <span className="text-[2.5rem] font-black bg-gradient-to-br from-[#ff9600] to-[#ffaa00] bg-clip-text text-transparent">
                {currentStreak}
              </span>
            </div>
          </div>
          <span className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">
            Day Streak
          </span>
        </div>

        {/* Weekly Calendar */}
        <div className="flex gap-3">
          {weekDays.map((day, index) => (
            <div key={day.label} className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                {day.label}
              </span>
              <div
                className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-xl transition-all duration-300 border-[3px] ${
                  day.isCompleted
                    ? 'bg-gradient-to-br from-[#58cc02] to-[#6cd302] border-[#58cc02] shadow-[0_4px_12px_rgba(88,204,2,0.3)] text-white'
                    : day.isToday
                    ? 'bg-[var(--bg-secondary)] border-[#ff9600] border-4 shadow-[0_0_0_4px_rgba(255,150,0,0.2)] animate-[todayPulse_2s_ease-in-out_infinite]'
                    : day.isFuture
                    ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-40'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                }`}
              >
                {day.isCompleted ? '✓' : day.isToday ? '●' : '○'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Animated Owl Mascot */}
      <div 
        className={`parrot-mascot w-[140px] h-[140px] relative z-10 animate-[parrotBob_3s_ease-in-out_infinite] ${getParrotMood()}`}
        onMouseEnter={handleParrotHover}
      >
        {/* Speech Bubble */}
        <div className="parrot-speech absolute -top-12 left-1/2 -translate-x-1/2 bg-white dark:bg-[var(--bg-card)] dark:border-2 dark:border-[var(--border-color)] text-[var(--text-primary)] px-4 py-2 rounded-2xl font-bold text-sm shadow-[var(--shadow-md)] whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          {parrotMessage}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-white dark:border-t-[var(--bg-card)]" />
        </div>
        
        {/* Owl SVG */}
        <svg width="140" height="140" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Body */}
          <ellipse cx="50" cy="60" rx="22" ry="27" fill="#7B8794"/>
          {/* Head */}
          <circle cx="50" cy="35" r="19" fill="#A0A8B0"/>
          {/* Belly/feet area */}
          <ellipse cx="50" cy="86" rx="11" ry="6" fill="#EF4444"/>
          {/* Face */}
          <ellipse cx="50" cy="37" rx="14" ry="15" fill="#F9FAFB"/>
          {/* Eyes */}
          <g id="owlEyes">
            <circle cx="43" cy="32" r="7" fill="white"/>
            <circle cx="57" cy="32" r="7" fill="white"/>
            <circle cx="43" cy="32" r="5" fill="#1F2937">
              <animate attributeName="cy" values="32;33;32" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="57" cy="32" r="5" fill="#1F2937">
              <animate attributeName="cy" values="32;33;32" dur="3s" repeatCount="indefinite"/>
            </circle>
            {/* Eye highlights */}
            <circle cx="41" cy="30" r="2" fill="white"/>
            <circle cx="55" cy="30" r="2" fill="white"/>
          </g>
          {/* Beak */}
          <ellipse cx="50" cy="42" rx="3" ry="4" fill="#FBBF24"/>
          {/* Eyebrows/Tufts */}
          <ellipse cx="35" cy="22" rx="4" ry="3" fill="#A0A8B0" transform="rotate(-30 35 22)"/>
          <ellipse cx="65" cy="22" rx="4" ry="3" fill="#A0A8B0" transform="rotate(30 65 22)"/>
          {/* Wing details */}
          <path d="M30 55 Q25 65 30 75" stroke="#6B7280" strokeWidth="2" fill="none"/>
          <path d="M70 55 Q75 65 70 75" stroke="#6B7280" strokeWidth="2" fill="none"/>
        </svg>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes flameFlicker {
          0%, 100% { 
            transform: scale(1) rotate(-5deg);
            filter: brightness(1);
          }
          25% { 
            transform: scale(1.1) rotate(5deg);
            filter: brightness(1.2);
          }
          50% { 
            transform: scale(0.95) rotate(-3deg);
            filter: brightness(0.9);
          }
          75% { 
            transform: scale(1.05) rotate(3deg);
            filter: brightness(1.1);
          }
        }
        
        @keyframes parrotBob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        
        @keyframes todayPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(255, 150, 0, 0.2); }
          50% { box-shadow: 0 0 0 8px rgba(255, 150, 0, 0.4); }
        }
        
        .parrot-mascot.celebrating {
          animation: parrotCelebrate 1s ease-in-out;
        }
        
        .parrot-mascot.sad {
          animation: parrotSad 2s ease-in-out infinite;
        }
        
        @keyframes parrotCelebrate {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          25% { transform: translateY(-20px) rotate(-15deg) scale(1.1); }
          75% { transform: translateY(-20px) rotate(15deg) scale(1.1); }
        }
        
        @keyframes parrotSad {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(5px) rotate(-5deg); }
        }
        
        .parrot-mascot:hover .parrot-speech {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
