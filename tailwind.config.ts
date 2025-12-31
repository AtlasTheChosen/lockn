import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-quicksand)', 'Quicksand', 'sans-serif'],
        display: ['var(--font-fredoka)', 'Fredoka', 'sans-serif'],
      },
      colors: {
        // LOCKN theme colors
        talka: {
          purple: '#a78bfa',
          pink: '#fb7185',
          orange: '#fb923c',
          yellow: '#fbbf24',
          green: '#4ade80',
          blue: '#60a5fa',
          cyan: '#22d3ee',
        },
        // Shadcn colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-purple-pink': 'linear-gradient(135deg, #a78bfa, #fb7185)',
        'gradient-green-cyan': 'linear-gradient(135deg, #4ade80, #22d3ee)',
        'gradient-orange-yellow': 'linear-gradient(135deg, #fb923c, #fbbf24)',
        'gradient-blue-purple': 'linear-gradient(135deg, #60a5fa, #a78bfa)',
        'gradient-cyan-blue': 'linear-gradient(135deg, #22d3ee, #60a5fa)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'talka-sm': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'talka-md': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'talka-lg': '0 8px 32px rgba(0, 0, 0, 0.16)',
        'purple': '0 4px 12px rgba(167, 139, 250, 0.4)',
        'pink': '0 4px 12px rgba(251, 113, 133, 0.4)',
        'green': '0 4px 12px rgba(74, 222, 128, 0.4)',
        'orange': '0 4px 12px rgba(251, 146, 60, 0.3)',
        'blue': '0 4px 12px rgba(96, 165, 250, 0.3)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-10deg)' },
          '75%': { transform: 'rotate(10deg)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'fade-in': 'fade-in 0.6s ease both',
        'slide-in-right': 'slide-in-right 0.5s ease both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
