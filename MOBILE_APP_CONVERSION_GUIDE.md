# FlashDash Mobile App Conversion Guide

Converting your Next.js web app to iOS and Android apps using **Capacitor**.

---

## 🎯 Overview

**FlashDash** has many Next.js API routes that run server-side. These won't work inside a mobile app bundle. You'll need to:

1. **Host your API routes separately** (recommended: keep on Vercel/Netlify)
2. **Update API calls** in your app to use absolute URLs instead of relative paths
3. **Add Capacitor** to wrap your web app as a native app
4. **Test & Build** for iOS and Android

---

## 📋 Pre-Conversion Checklist

### ✅ Your Current Setup
- ✅ Next.js 14 with App Router
- ✅ Supabase backend (works great with mobile!)
- ✅ API routes: `/api/generate-stack`, `/api/text-to-speech`, etc.
- ✅ Already optimized for mobile (bottom nav, responsive design)

### ⚠️ What Needs to Change
1. **API Routes**: Must be hosted separately (Vercel/Netlify)
2. **API Calls**: Change from `/api/...` to `https://yourdomain.com/api/...`
3. **Environment Variables**: Need to handle differently in mobile
4. **Native Features**: Can add push notifications, camera, etc.

---

## 🚀 Step-by-Step Conversion

### Step 1: Set Up API Environment Variables

Create a file to detect your API base URL:

```typescript
// lib/api-config.ts
export function getApiBaseUrl(): string {
  // In mobile app (Capacitor), use your production API
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return process.env.NEXT_PUBLIC_API_URL || 'https://yourdomain.com';
  }
  
  // In browser (development), use relative URLs
  if (typeof window !== 'undefined') {
    return '';
  }
  
  // Server-side, use relative URLs
  return '';
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path}`;
}
```

---

### Step 2: Update API Calls Throughout Your App

**Before:**
```typescript
const response = await fetch('/api/generate-stack', { ... });
```

**After:**
```typescript
import { getApiUrl } from '@/lib/api-config';
const response = await fetch(getApiUrl('/api/generate-stack'), { ... });
```

**Files to update:**
- All components that call `/api/*`
- Check `components/stack/StackLearningClient.tsx`
- Check `components/dashboard/*`
- Check any other files making API calls

---

### Step 3: Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npx cap init
```

**When prompted:**
- **App name**: `FlashDash`
- **App ID**: `com.yourcompany.flashdash` (use your domain reversed)
- **Web dir**: `.next` (or `out` if using static export)

---

### Step 4: Configure Capacitor

Create `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.flashdash',
  appName: 'FlashDash',
  webDir: '.next',
  server: {
    // For development: point to your local dev server
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
```

---

### Step 5: Update Next.js Config

**Option A: Static Export** (simpler, but no SSR)
```javascript
// next.config.js
const nextConfig = {
  output: 'export', // Add this
  images: { unoptimized: true },
  // ... rest of config
};
```

**Option B: Keep SSR** (better for SEO, but need server)
- Keep current config
- API routes must be on a separate server
- App will call your hosted APIs

**Recommended**: Option B (keep SSR, host APIs separately)

---

### Step 6: Add Environment Variable

Create `.env.local` (add to `.gitignore`):
```env
NEXT_PUBLIC_API_URL=https://your-production-domain.vercel.app
```

In production (Vercel), set this to your actual domain.

---

### Step 7: Build and Sync

```bash
# Build your Next.js app
npm run build

# Sync with Capacitor (copies web files to native projects)
npx cap sync

# Open in Xcode (iOS) or Android Studio
npx cap open ios
npx cap open android
```

---

### Step 8: Configure iOS Project

1. **App Icon**: Add to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Need: 1024×1024 (App Store), plus all sizes Xcode asks for
   - No transparency, PNG format

2. **Bundle ID**: Match what you set in `capacitor.config.ts`

3. **Signing**: 
   - Xcode → Signing & Capabilities
   - Select your Apple Developer team
   - Enable "Automatically manage signing"

4. **Info.plist**: May need to add permissions (camera, microphone if you use them)

---

### Step 9: Configure Android Project

1. **App Icon**: Add to `android/app/src/main/res/` (mipmap folders)

2. **Package Name**: Match `appId` from `capacitor.config.ts`

3. **Signing**: 
   - Create a keystore: `keytool -genkey -v -keystore flashdash.keystore -alias flashdash -keyalg RSA -keysize 2048 -validity 10000`
   - Add to `android/app/build.gradle`

---

### Step 10: Test on Device

```bash
# iOS Simulator
npx cap run ios

# Android Emulator
npx cap run android
```

Or connect a physical device and run from Xcode/Android Studio.

---

## 🔧 Handling API Routes

### Option 1: Keep APIs on Vercel/Netlify (Recommended)

1. Deploy your Next.js app to Vercel (API routes work automatically)
2. Set `NEXT_PUBLIC_API_URL` to your Vercel URL
3. Mobile app calls `https://your-app.vercel.app/api/*`

**Pros:**
- ✅ No code changes to API routes
- ✅ Centralized backend
- ✅ Easy updates

### Option 2: Convert to Supabase Edge Functions

Move API logic to Supabase Edge Functions:

```typescript
// supabase/functions/generate-stack/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Your API logic here
  // ...
})
```

**Pros:**
- ✅ Serverless, scales well
- ✅ Close to your database

**Cons:**
- ⚠️ Need to rewrite API routes

---

## 📱 Adding Native Features (Optional)

### Push Notifications

```bash
npm install @capacitor/push-notifications
npx cap sync
```

### Camera

```bash
npm install @capacitor/camera
npx cap sync
```

### Share

```bash
npm install @capacitor/share
npx cap sync
```

---

## 🏪 App Store Submission

### iOS App Store

1. **App Store Connect**:
   - Create app listing
   - Upload screenshots (required sizes)
   - Write description, keywords
   - Set pricing, age rating

2. **Archive in Xcode**:
   - Product → Archive
   - Distribute to App Store Connect

3. **Submit for Review**:
   - Fill out compliance info
   - Add test account if needed
   - Submit

**Review time**: Usually 1-3 days

### Google Play Store

1. **Google Play Console**:
   - Create app listing
   - Upload APK/AAB
   - Add screenshots, description
   - Set content rating

2. **Build AAB**:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   Output: `android/app/build/outputs/bundle/release/app-release.aab`

3. **Upload & Submit**

**Review time**: Usually 1-7 days

---

## ⚠️ Common Issues & Solutions

### Issue: "API calls fail in mobile app"
**Solution**: Make sure `NEXT_PUBLIC_API_URL` is set correctly and APIs are accessible from mobile devices.

### Issue: "App feels like a website"
**Solution**: 
- Add native splash screens
- Use Capacitor plugins for native feel
- Optimize touch targets
- Add haptic feedback

### Issue: "App rejected by Apple"
**Solution**: 
- Make sure app uses native features (not just a webview)
- Add proper icons/splash screens
- Follow HIG (Human Interface Guidelines)
- Don't mention "web app" in description

### Issue: "Build fails"
**Solution**:
- Make sure Xcode/Android Studio are up to date
- Run `npx cap sync` after any dependency changes
- Check `capacitor.config.ts` paths are correct

---

## 📚 Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [NextNative.dev](https://nextnative.dev) - Next.js + Capacitor tutorials
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)

---

## 🎯 Next Steps

1. ✅ Review this guide
2. ✅ Set up `lib/api-config.ts`
3. ✅ Update API calls in your components
4. ✅ Install Capacitor
5. ✅ Test locally
6. ✅ Deploy to App Store / Play Store

**Need help?** This is a big project. Consider:
- Starting with a test build first
- Testing on device before submitting
- Getting feedback from beta testers

---

Good luck! 🚀
