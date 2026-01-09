# Firebase API Key Restrictions Guide

## Overview

Firebase API keys are exposed in client-side code (this is expected and necessary for Firebase client SDK). However, these keys should be restricted in the Firebase Console to prevent unauthorized usage.

## Why Restrict API Keys?

- **Prevent Abuse**: Without restrictions, anyone can use your API key
- **Quota Protection**: Prevent quota exhaustion from unauthorized usage
- **Cost Control**: Avoid unexpected charges from API abuse
- **Security**: Add an additional layer of protection

## How to Restrict Firebase API Keys

### Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`plannercli`)
3. Click the gear icon ⚙️ → **Project Settings**

### Step 2: Find Your API Keys

1. Scroll down to **"Your apps"** section
2. Find your web app configuration
3. Note the **API Key** (starts with `AIza...`)

### Step 3: Restrict the API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** → **Credentials**
4. Find your API key in the list
5. Click on the API key to edit it

### Step 4: Configure Restrictions

#### Application Restrictions

**For Web Applications:**
1. Under **Application restrictions**, select **HTTP referrers (web sites)**
2. Click **Add an item**
3. Add your domain(s):
   ```
   https://yourdomain.com/*
   https://*.yourdomain.com/*
   http://localhost:3000/* (for development)
   ```
4. Click **Save**

**For Production:**
- Add your production domain
- Remove `localhost` restrictions in production
- Use environment-specific API keys if possible

#### API Restrictions

1. Under **API restrictions**, select **Restrict key**
2. Select only the APIs you need:
   - ✅ **Firebase Installations API**
   - ✅ **Firebase Remote Config API**
   - ✅ **Identity Toolkit API** (for Authentication)
   - ✅ **Cloud Firestore API**
   - ❌ Uncheck all other APIs
3. Click **Save**

### Step 5: Enable App Check (Recommended)

App Check provides additional protection:

1. In Firebase Console, go to **Build** → **App Check**
2. Click **Get started**
3. Select your web app
4. Choose **reCAPTCHA v3** as the provider
5. Follow the setup instructions
6. Enable enforcement for:
   - ✅ Cloud Firestore
   - ✅ Firebase Authentication

## Verification

### Test Restrictions

1. Try accessing Firebase from an unauthorized domain
2. The request should be blocked
3. Check browser console for restriction errors

### Monitor Usage

1. In Google Cloud Console, go to **APIs & Services** → **Dashboard**
2. Monitor API usage
3. Set up alerts for unusual activity

## Best Practices

### 1. Separate Keys for Environments

- **Development**: `localhost` restrictions
- **Staging**: Staging domain restrictions
- **Production**: Production domain restrictions

### 2. Rotate Keys Regularly

- Rotate API keys every 90 days
- Update restrictions before rotating
- Test thoroughly after rotation

### 3. Monitor and Alert

- Set up usage alerts
- Monitor for unusual patterns
- Review access logs regularly

### 4. Use Environment Variables

Keep API keys in `.env.local` (already implemented):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

### 5. Never Commit Keys

- ✅ `.env.local` is in `.gitignore` (already configured)
- ❌ Never commit `.env.local` to Git
- ✅ Use different keys for different environments

## Current Status

- ✅ Environment variables configured
- ✅ `.env.local` in `.gitignore`
- ⚠️ **Action Required**: Restrict API keys in Firebase Console
- ⚠️ **Action Required**: Enable App Check

## Additional Resources

- [Firebase API Key Best Practices](https://firebase.google.com/docs/projects/api-keys)
- [Google Cloud API Key Restrictions](https://cloud.google.com/docs/authentication/api-keys#restricting_api_keys)
- [Firebase App Check](https://firebase.google.com/docs/app-check)

## Security Checklist

- [ ] API keys restricted to specific domains
- [ ] API restrictions configured (only necessary APIs enabled)
- [ ] App Check enabled and enforced
- [ ] Different keys for dev/staging/production
- [ ] Usage monitoring set up
- [ ] Alerts configured for unusual activity
- [ ] Keys rotated regularly (every 90 days)

---

**Last Updated**: 2024  
**Maintained By**: Development Team

