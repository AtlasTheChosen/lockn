# Supabase Configuration Guide

## Required Settings in Supabase Dashboard

To ensure proper authentication flow, configure the following in your Supabase project:

### 1. Site URL
Navigate to: **Authentication > URL Configuration**

Set your **Site URL** to:
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

### 2. Redirect URLs
Navigate to: **Authentication > URL Configuration**

Add the following to **Redirect URLs**:
- Development: `http://localhost:3000/auth/callback`
- Production: `https://your-domain.com/auth/callback`

### 3. Email Confirmation (Optional)
Navigate to: **Authentication > Providers > Email**

For development, you can disable email confirmation:
- Set **Enable email confirmations** to `OFF`

This allows users to sign up and immediately access the dashboard without email verification.

## How Authentication Works

1. User signs up or logs in via `/auth/login` or `/auth/signup`
2. After successful authentication, Supabase redirects to `/auth/callback`
3. The callback route:
   - Exchanges the auth code for a session
   - Creates user profile and stats records if they don't exist
   - Redirects to `/dashboard`
4. Middleware protects routes and redirects unauthenticated users to login

## Protected Routes

The following routes require authentication (configured in `middleware.ts`):
- `/dashboard` - User dashboard
- `/stack/*` - Flashcard stacks
- `/admin` - Admin panel
- `/leaderboard` - Leaderboard

Users trying to access these without authentication are redirected to `/auth/login`.
