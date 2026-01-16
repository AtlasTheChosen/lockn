'use client';

import { useMemo, useState, useEffect } from 'react';
import { Check, X, Lock } from 'lucide-react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';

interface WeeklyCalendarProps {
  currentStreak: number;
  cardsMasteredToday: number;
  dailyRequirement: number;
  lastMasteryDate?: string | null;
  className?: string;
}

interface DayStatus {
  day: string;
  shortDay: string;
  date: Date;
  status: 'completed' | 'missed' | 'today-complete' | 'today-partial' | 'today-empty' | 'future';
  isToday: boolean;
  progress?: number;
}

// Sparkle component for completed days
function Sparkle({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 bg-white rounded-full"
      style={{
        top: `${Math.random() * 60 + 20}%`,
        left: `${Math.random() * 60 + 20}%`,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
      transition={{
        duration: 1.5,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 2 + 1,
      }}
    />
  );
}

// Mini progress ring for partial today
function MiniProgressRing({ progress }: { progress: number }) {
  const radius = 18;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;

  const springProgress = useSpring(0, { stiffness: 50, damping: 15 });
  const strokeDashoffset = useTransform(springProgress, (p) => circumference - (p / 100) * circumference);

  useEffect(() => {
    springProgress.set(progress);
  }, [progress, springProgress]);

  return (
    <svg width="44" height="44" className="absolute inset-0 m-auto -rotate-90">
      <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255, 150, 0, 0.2)" strokeWidth={strokeWidth} />
      <motion.circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="#ff9600"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ strokeDashoffset }}
      />
    </svg>
  );
}

// Day Circle Component
function DayCircle({
  day,
  index,
  prevCompleted,
  nextCompleted,
}: {
  day: DayStatus;
  index: number;
  prevCompleted: boolean;
  nextCompleted: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const isCompleted = day.status === 'completed' || day.status === 'today-complete';
  const isToday = day.isToday;
  const isMissed = day.status === 'missed';
  const isFuture = day.status === 'future';
  const isTodayPartial = day.status === 'today-partial';
  const isTodayEmpty = day.status === 'today-empty';

  return (
    <div className="relative flex flex-col items-center">
      {/* Connection line to next day */}
      {index < 6 && isCompleted && nextCompleted && (
        <motion.div
          className="absolute top-[calc(50%+14px)] left-[calc(100%-4px)] h-1 z-0"
          style={{
            width: 'calc(100% - 8px)',
            background: 'linear-gradient(90deg, #58cc02 0%, #7ce830 100%)',
            borderRadius: '2px',
            transformOrigin: 'left',
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: (index + 1) * 0.08 + 0.2, duration: 0.3 }}
        />
      )}

      {/* Day label */}
      <motion.span
        className="text-xs font-bold uppercase mb-2 tracking-wide"
        style={{
          color: isToday ? '#ff9600' : isCompleted ? '#58cc02' : isMissed ? '#ff4b4b' : 'var(--text-muted)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.06 }}
      >
        {day.day}
      </motion.span>

      {/* Day circle container */}
      <motion.div
        className="relative cursor-default"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          delay: index * 0.08,
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
        whileHover={{ scale: 1.1, y: -4 }}
      >
        {/* Pulsing border for today (not complete) */}
        {(isTodayPartial || isTodayEmpty) && (
          <motion.div
            className="absolute -inset-0.5 rounded-full"
            style={{ border: '3px solid #ff9600' }}
            animate={{
              opacity: [1, 0.5, 1],
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Today complete ring */}
        {day.status === 'today-complete' && (
          <motion.div
            className="absolute -inset-1 rounded-full"
            style={{ border: '3px solid #ff9600' }}
          />
        )}

        {/* Main circle */}
        <motion.div
          className="relative w-[50px] h-[50px] rounded-full flex items-center justify-center overflow-hidden"
          style={{
            background: isCompleted
              ? 'linear-gradient(145deg, #58cc02 0%, #46a302 100%)'
              : isMissed
                ? 'linear-gradient(145deg, rgba(255,75,75,0.15) 0%, rgba(255,75,75,0.25) 100%)'
                : 'var(--bg-secondary)',
            border: isFuture
              ? '3px dashed var(--border-color)'
              : isCompleted
                ? '3px solid #46a302'
                : isMissed
                  ? '3px solid rgba(255,75,75,0.4)'
                  : '3px solid var(--border-color)',
            boxShadow: isCompleted
              ? '0 4px 16px rgba(88, 204, 2, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
              : isMissed
                ? 'inset 0 2px 4px rgba(255,75,75,0.1)'
                : 'inset 0 2px 4px rgba(0,0,0,0.05)',
          }}
          animate={
            isHovered && isCompleted
              ? {
                  boxShadow: [
                    '0 4px 16px rgba(88, 204, 2, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)',
                    '0 6px 24px rgba(88, 204, 2, 0.6), inset 0 2px 4px rgba(255,255,255,0.2)',
                    '0 4px 16px rgba(88, 204, 2, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)',
                  ],
                }
              : {}
          }
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {/* Sparkles for completed days */}
          {isCompleted && (
            <>
              <Sparkle delay={0} />
              <Sparkle delay={0.5} />
              <Sparkle delay={1} />
            </>
          )}

          {/* Mini progress ring for partial today */}
          {isTodayPartial && day.progress !== undefined && <MiniProgressRing progress={day.progress} />}

          {/* Content based on state */}
          {isCompleted && (
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: index * 0.08 + 0.2,
                type: 'spring',
                stiffness: 400,
                damping: 15,
              }}
            >
              <Check className="w-6 h-6 text-white drop-shadow-sm" strokeWidth={3} />
            </motion.div>
          )}

          {isMissed && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: index * 0.08 + 0.2 }}>
              <X className="w-5 h-5 text-[#ff4b4b] opacity-70" strokeWidth={2.5} />
            </motion.div>
          )}

          {isFuture && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: index * 0.08 + 0.2 }}>
              <Lock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </motion.div>
          )}

          {isTodayPartial && day.progress !== undefined && (
            <span className="text-xs font-bold text-[#ff9600] z-10">{Math.round(day.progress)}%</span>
          )}

          {isTodayEmpty && (
            <motion.div
              className="w-2 h-2 rounded-full bg-[#ff9600]"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function WeeklyCalendar({
  currentStreak,
  cardsMasteredToday,
  dailyRequirement,
  className = '',
}: WeeklyCalendarProps) {
  const days = useMemo(() => {
    const result: DayStatus[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const shortDayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      const isToday = date.getTime() === today.getTime();
      const isFuture = date > today;
      const dayOfWeek = date.getDay();

      let status: DayStatus['status'];
      let progress: number | undefined;

      if (isFuture) {
        status = 'future';
      } else if (isToday) {
        if (cardsMasteredToday >= dailyRequirement) {
          status = 'today-complete';
        } else if (cardsMasteredToday > 0) {
          status = 'today-partial';
          progress = Math.min(100, (cardsMasteredToday / dailyRequirement) * 100);
        } else {
          status = 'today-empty';
        }
      } else {
        const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        const todayMetGoal = cardsMasteredToday >= dailyRequirement;
        const effectiveStreak = todayMetGoal ? currentStreak : currentStreak;

        if (daysAgo < effectiveStreak) {
          status = 'completed';
        } else {
          status = 'missed';
        }
      }

      result.push({
        day: dayNames[dayOfWeek],
        shortDay: shortDayNames[dayOfWeek],
        date,
        status,
        isToday,
        progress,
      });
    }

    return result;
  }, [currentStreak, cardsMasteredToday, dailyRequirement]);

  const isCompleted = (status: DayStatus['status']) => status === 'completed' || status === 'today-complete';

  return (
    <div
      className={`flex items-end justify-between gap-1 sm:gap-3 px-2 ${className}`}
      role="group"
      aria-label="Weekly streak tracker"
    >
      {days.map((day, index) => (
        <DayCircle
          key={index}
          day={day}
          index={index}
          prevCompleted={index > 0 && isCompleted(days[index - 1].status)}
          nextCompleted={index < days.length - 1 && isCompleted(days[index + 1].status)}
        />
      ))}
    </div>
  );
}
