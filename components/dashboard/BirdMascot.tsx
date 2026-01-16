'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

type BirdState = 
  | 'idle' 
  | 'perking' 
  | 'excited' 
  | 'celebrating' 
  | 'frozen' 
  | 'proud' 
  | 'sad' 
  | 'pointing';

interface BirdMascotProps {
  state?: BirdState;
  cardsMasteredToday?: number;
  dailyRequirement?: number;
  currentStreak?: number;
  isFrozen?: boolean;
  hasPendingTest?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showSpeechBubble?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 40,
  md: 60,
  lg: 80,
};

// Auto-determine state from props
function determineState(props: BirdMascotProps): BirdState {
  if (props.state) return props.state;
  
  const { cardsMasteredToday = 0, dailyRequirement = 5, currentStreak = 0, isFrozen, hasPendingTest } = props;
  
  if (isFrozen) return 'frozen';
  if (hasPendingTest) return 'pointing';
  if (currentStreak >= 7) return 'proud';
  if (cardsMasteredToday >= dailyRequirement) return 'celebrating';
  if (cardsMasteredToday >= dailyRequirement * 0.8) return 'excited';
  if (cardsMasteredToday >= dailyRequirement * 0.4) return 'perking';
  if (cardsMasteredToday > 0) return 'perking';
  return 'idle';
}

// Get message based on state
function getMessage(state: BirdState, cardsMasteredToday: number, dailyRequirement: number, currentStreak: number): string {
  const remaining = dailyRequirement - cardsMasteredToday;
  
  switch (state) {
    case 'idle':
      return "Let's learn some cards!";
    case 'perking':
      return `${remaining} more to hit your goal!`;
    case 'excited':
      return "Almost there! Keep going!";
    case 'celebrating':
      return "Amazing! Daily goal crushed!";
    case 'frozen':
      return "Brrr! Complete a test to thaw!";
    case 'proud':
      return `${currentStreak} days strong! 🔥`;
    case 'sad':
      return "You got this! Try again!";
    case 'pointing':
      return "A test is waiting for you!";
    default:
      return "Keep learning!";
  }
}

// Get animation class based on state
function getAnimationClass(state: BirdState): string {
  switch (state) {
    case 'idle':
      return 'animate-bounce-slow';
    case 'perking':
      return 'animate-wiggle-slow';
    case 'excited':
      return 'animate-bounce';
    case 'celebrating':
      return 'animate-bounce scale-110';
    case 'frozen':
      return 'animate-shiver filter brightness-110 saturate-50';
    case 'proud':
      return 'animate-pulse-slow scale-105';
    case 'sad':
      return 'opacity-80 grayscale-[30%]';
    case 'pointing':
      return 'animate-wiggle';
    default:
      return '';
  }
}

export default function BirdMascot({
  state: propState,
  cardsMasteredToday = 0,
  dailyRequirement = 5,
  currentStreak = 0,
  isFrozen = false,
  hasPendingTest = false,
  size = 'md',
  showSpeechBubble = false,
  className = '',
}: BirdMascotProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const state = determineState({
    state: propState,
    cardsMasteredToday,
    dailyRequirement,
    currentStreak,
    isFrozen,
    hasPendingTest,
  });
  
  const pixelSize = sizeMap[size];
  const message = getMessage(state, cardsMasteredToday, dailyRequirement, currentStreak);
  const animationClass = getAnimationClass(state);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Bird Image with Animations */}
      <div 
        className={`relative transition-all duration-500 ${animationClass} ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <Image
          src="/images/bird logo.png"
          alt="FlashDash Bird Mascot"
          width={pixelSize}
          height={pixelSize}
          className="object-contain drop-shadow-lg"
          priority
        />
        
        {/* Celebration particles */}
        {state === 'celebrating' && (
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            <span className="absolute -top-2 -left-2 text-lg animate-float-up">✨</span>
            <span className="absolute -top-1 -right-2 text-lg animate-float-up delay-100">🎉</span>
            <span className="absolute -bottom-1 left-0 text-sm animate-float-up delay-200">⭐</span>
          </div>
        )}
        
        {/* Frozen effect */}
        {state === 'frozen' && (
          <div className="absolute inset-0 pointer-events-none">
            <span className="absolute -top-1 -right-1 text-lg animate-pulse">❄️</span>
          </div>
        )}
        
        {/* Proud medal */}
        {state === 'proud' && currentStreak >= 7 && (
          <div className="absolute -bottom-1 -right-1 text-lg animate-pulse">
            🏅
          </div>
        )}
      </div>
      
      {/* Speech Bubble */}
      {showSpeechBubble && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-[var(--bg-card)] rounded-xl px-3 py-1.5 shadow-[var(--shadow-md)] border-2 border-[var(--border-color)] relative">
            <p className="text-xs font-bold text-[var(--text-primary)]">{message}</p>
            {/* Speech bubble tail */}
            <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[var(--bg-card)] rotate-45 border-r-2 border-b-2 border-[var(--border-color)]" />
          </div>
        </div>
      )}
    </div>
  );
}
