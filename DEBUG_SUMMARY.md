# Comprehensive Debug System - Summary

## Overview

A complete debug logging system has been implemented across the entire codebase to track all operations, API calls, user interactions, and data flows.

## Debug Utility (`lib/debug.ts`)

### Client-Side Debug (`DEBUG`)
- **Categories**: AUTH, SESSION, NETWORK, TIMING, GENERATION, UI, STORAGE, API, ERROR
- **Methods**:
  - `DEBUG.auth(message, data?)` - Authentication events
  - `DEBUG.session(message, data?)` - Session operations
  - `DEBUG.network(message, data?)` - Network requests
  - `DEBUG.timing(label, startTime, data?)` - Performance metrics
  - `DEBUG.generation(message, data?)` - Stack generation
  - `DEBUG.ui(message, data?)` - UI interactions
  - `DEBUG.storage(message, data?)` - localStorage operations
  - `DEBUG.api(message, data?)` - API calls
  - Error variants: `authError`, `sessionError`, `networkError`, `apiError`, `generationError`
  - Utility methods: `checkSupabaseConfig()`, `checkSession()`, `checkUser()`

### Server-Side Debug (`DEBUG_SERVER`)
- **Methods**: `log()`, `error()`, `api()`, `apiError()`, `generation()`, `generationError()`, `timing()`
- Used in API routes and middleware

## Components with Debug Logging

### 1. **Authentication Components**
- ✅ `components/auth/AuthModal.tsx` - Login/signup flow
- ✅ `app/auth/login/page.tsx` - Login page
- ✅ `app/auth/signup/page.tsx` - Signup page
- ✅ `components/auth/AuthProvider.tsx` - Auth state management

**What's logged:**
- Login/signup attempts
- Session checks
- Auth state changes
- Redirects
- Timeouts and polling
- Profile/stats creation

### 2. **Homepage/Landing**
- ✅ `components/landing/CommandLanding.tsx` - Main landing page
- ✅ `app/page.tsx` - Landing page wrapper

**What's logged:**
- Component mount
- User authentication check
- Search input changes
- Content filtering
- Form submissions
- localStorage operations (language, level, card count)
- Trial generation requests
- API calls and responses

### 3. **Dashboard Components**
- ✅ `app/dashboard/page.tsx` - Dashboard page
- ✅ `components/dashboard/DashboardMain.tsx` - Main dashboard view
- ✅ `components/dashboard/DashboardTabs.tsx` - Tab navigation
- ✅ `components/dashboard/StackGenerationModal.tsx` - Stack generation modal

**What's logged:**
- Data loading (user, profile, stacks, stats)
- CEFR rank calculations
- Stack deletion operations
- Modal open/close
- Generation requests
- Card count selection
- localStorage persistence

### 4. **Stack Learning**
- ✅ `app/stack/[id]/page.tsx` - Stack page
- ✅ `components/stack/StackLearningClient.tsx` - Learning interface

**What's logged:**
- Stack loading
- Card fetching
- Card ratings
- Stack completion
- Phrase explanations
- Stack deletion
- Progress tracking

### 5. **API Routes**
- ✅ `app/api/generate-stack/route.ts` - Stack generation API
- ✅ `app/api/generate-trial/route.ts` - Trial generation API
- ✅ `app/api/explain-phrase/route.ts` - Phrase explanation API
- ✅ `app/api/auth/callback/route.ts` - OAuth callback
- ✅ `middleware.ts` - Route protection

**What's logged:**
- Request parameters
- User authentication
- Profile checks
- Rate limiting
- OpenAI API calls
- Database operations
- Response timing
- Errors and exceptions

### 6. **Infrastructure**
- ✅ `lib/supabase/client.ts` - Client creation
- ✅ `lib/supabase/server.ts` - Server client creation
- ✅ `middleware.ts` - Route protection

**What's logged:**
- Client creation
- Cookie operations
- Route classification
- User checks
- Redirects

## Debug Output Format

All logs follow this format:
```
[DEBUG:CATEGORY] TIMESTAMP - Message { data }
```

**Examples:**
```
[DEBUG:AUTH] 2024-12-23T02:30:15.123Z - === LOGIN ATTEMPT STARTED ===
[DEBUG:UI] 2024-12-23T02:30:16.456Z - Search input changed { length: 25, hasContent: true }
[DEBUG:API] 2024-12-23T02:30:17.789Z - API response received { status: 200, ok: true }
[DEBUG:TIMING] 2024-12-23T02:30:18.012Z - Total API request time (2345ms)
[DEBUG:NETWORK:ERROR] 2024-12-23T02:30:19.345Z - Stack deletion failed { error: "..." }
```

## What Gets Tracked

### User Interactions
- Form submissions
- Button clicks
- Input changes
- Modal open/close
- Tab switches
- Card ratings
- Stack deletions

### Data Operations
- Supabase queries
- Session checks
- Profile fetches
- Stack loading
- Card operations
- Stats updates

### API Operations
- Request parameters
- Response status
- Timing metrics
- Error handling
- OpenAI calls
- Database operations

### Performance
- Request durations
- Component load times
- Operation timing
- Total flow times

## How to Use

### 1. **Browser Console** (Client-side)
- Open DevTools (F12)
- Go to Console tab
- Filter by `[DEBUG:` to see all debug logs
- Filter by category: `[DEBUG:AUTH]`, `[DEBUG:API]`, etc.

### 2. **Server Console** (Server-side)
- Check terminal where `npm run dev` is running
- Look for `[DEBUG:SERVER]`, `[DEBUG:API]`, `[DEBUG:GENERATION]` logs

### 3. **Filtering Logs**
In browser console, you can filter:
- `[DEBUG:AUTH]` - Authentication events
- `[DEBUG:UI]` - User interface interactions
- `[DEBUG:API]` - API requests/responses
- `[DEBUG:NETWORK]` - Network operations
- `[DEBUG:GENERATION]` - Stack generation
- `[DEBUG:TIMING]` - Performance metrics
- `[DEBUG:STORAGE]` - localStorage operations
- `[DEBUG:ERROR]` - Errors (red in console)

## Debug Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **AUTH** | Authentication flow | Login, signup, session checks |
| **SESSION** | Session management | getSession(), getUser(), session state |
| **NETWORK** | Network requests | Supabase queries, API calls |
| **TIMING** | Performance | Request durations, operation times |
| **GENERATION** | Stack generation | OpenAI calls, card creation |
| **UI** | User interface | Component mounts, user interactions |
| **STORAGE** | localStorage | Saving/loading preferences |
| **API** | API operations | Request/response logging |
| **ERROR** | Error tracking | Exceptions, failures |

## Enabling/Disabling

Debug is automatically enabled when:
- `NODE_ENV === 'development'` OR
- `NEXT_PUBLIC_DEBUG === 'true'`

To disable, set `NEXT_PUBLIC_DEBUG=false` in `.env.local`

## Key Features

1. **Comprehensive Coverage** - All major components and API routes
2. **Structured Logging** - Consistent format with categories
3. **Performance Tracking** - Timing for all operations
4. **Error Tracking** - Detailed error logging with context
5. **Session Tracking** - Complete auth flow visibility
6. **Network Visibility** - All Supabase and API calls logged
7. **User Action Tracking** - All UI interactions logged

## Example Debug Flow

**Login Flow:**
```
[DEBUG:AUTH] === LOGIN ATTEMPT STARTED ===
[DEBUG:AUTH] Email: user@example.com
[DEBUG:AUTH] Supabase Config Check: { hasUrl: true, hasKey: true }
[DEBUG:SESSION] Session check result: { hasSession: false }
[DEBUG:AUTH] Starting signInWithPassword request...
[DEBUG:SESSION] Polling attempt #1
[DEBUG:SESSION] Polling attempt #2
[DEBUG:AUTH] Login successful! { userId: "...", email: "..." }
[DEBUG:TIMING] signInWithPassword response time (2345ms)
[DEBUG:AUTH] Redirecting to dashboard...
```

**Stack Generation Flow:**
```
[DEBUG:GENERATION] === Stack Generation Started ===
[DEBUG:UI] Scenario input changed { length: 25 }
[DEBUG:API] Sending generation request { stackSize: 25, difficulty: "B1" }
[DEBUG:API] API response received { status: 200, ok: true }
[DEBUG:GENERATION] Generation successful { stackId: "...", cardCount: 25 }
[DEBUG:TIMING] Total generation time (5678ms)
```

## Benefits

1. **Quick Debugging** - See exactly where issues occur
2. **Performance Monitoring** - Identify slow operations
3. **User Flow Tracking** - Understand user behavior
4. **Error Diagnosis** - Detailed error context
5. **Development Aid** - Faster development and testing

The entire codebase is now instrumented with comprehensive debug logging!








