# 🔥 Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication with email verification in your Trend Fiver application.

## 📋 Prerequisites

1. A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
2. Node.js and npm installed
3. Your existing Trend Fiver application

## 🚀 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "trend-fiver-auth")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## 🔧 Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication:
   - Click on "Email/Password"
   - Toggle "Enable"
   - **Important**: Enable "Email link (passwordless sign-in)" if you want passwordless authentication
   - Click "Save"

## 📧 Step 3: Configure Email Templates

1. In Authentication > Settings > Templates
2. Customize the "Verification email" template:
   - **Subject**: "Verify your Trend Fiver account"
   - **Message**: Customize the email content
   - **Action URL**: Set to your app's verification page (e.g., `https://yourdomain.com/auth?verify=true`)
3. Customize the "Password reset" template if needed
4. Click "Save"

## 🔑 Step 4: Get Firebase Configuration

1. In your Firebase project, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and choose "Web"
4. Register your app with a nickname (e.g., "Trend Fiver Web")
5. Copy the Firebase configuration object

## ⚙️ Step 5: Configure Environment Variables

Create or update your `.env` file in the client directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# Optional: Use Firebase emulator in development
VITE_USE_FIREBASE_EMULATOR=false
```

## 🔄 Step 6: Update Your App Structure

### 6.1 Update Main App Component

Update your `client/src/App.tsx` to include Firebase Auth Provider:

```tsx
import { FirebaseAuthProvider } from '@/hooks/use-firebase-auth';

function App() {
  return (
    <FirebaseAuthProvider>
      {/* Your existing providers */}
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            {/* Your app content */}
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </FirebaseAuthProvider>
  );
}
```

### 6.2 Protect Routes

Wrap your protected pages with the Firebase Protected Route:

```tsx
import { FirebaseProtectedRoute } from '@/components/firebase-protected-route';

// In your route components
function DashboardPage() {
  return (
    <FirebaseProtectedRoute requireEmailVerification={true}>
      <div>Your dashboard content</div>
    </FirebaseProtectedRoute>
  );
}
```

### 6.3 Update Auth Page

Update your `client/src/pages/auth-page.tsx` to use Firebase authentication:

```tsx
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';

export default function AuthPage() {
  const { 
    registerMutation, 
    loginMutation, 
    sendVerificationMutation,
    sendPasswordResetMutation 
  } = useFirebaseAuth();

  // Use these mutations instead of your existing auth functions
  const handleRegister = (data) => {
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      username: data.username
    });
  };

  const handleLogin = (data) => {
    loginMutation.mutate({
      email: data.email,
      password: data.password
    });
  };

  // ... rest of your component
}
```

## 🔒 Step 7: Backend Integration (Optional)

If you want to keep your existing backend for user profiles and data:

### 7.1 Create Firebase Token Verification Middleware

```typescript
// server/middleware/firebase-auth.ts
import { auth } from 'firebase-admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const firebaseAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 7.2 Update Your Routes

```typescript
// server/routes.ts
import { firebaseAuthMiddleware } from './middleware/firebase-auth';

// Use Firebase auth middleware instead of JWT
router.post('/predictions', firebaseAuthMiddleware, async (req, res) => {
  // Your prediction logic
});
```

## 🧪 Step 8: Testing

### 8.1 Test Registration Flow

1. Register a new user
2. Check that verification email is sent
3. Verify email by clicking the link
4. Try to log in (should work after verification)

### 8.2 Test Protected Routes

1. Try to access protected pages without login (should redirect)
2. Try to access protected pages with unverified email (should show verification screen)
3. Access protected pages with verified email (should work)

### 8.3 Test Password Reset

1. Click "Forgot Password" on login page
2. Enter email address
3. Check that reset email is sent
4. Click reset link and set new password

## 🚨 Security Considerations

1. **Environment Variables**: Never commit Firebase config to version control
2. **Domain Restrictions**: Configure authorized domains in Firebase Console
3. **Email Templates**: Customize email templates to match your brand
4. **Rate Limiting**: Firebase handles rate limiting automatically
5. **Token Expiration**: Firebase tokens expire automatically

## 🔧 Troubleshooting

### Common Issues:

1. **"Firebase App named '[DEFAULT]' already exists"**
   - Solution: Check if Firebase is initialized multiple times

2. **"auth/email-already-in-use"**
   - Solution: User already exists, handle in your UI

3. **"auth/invalid-email"**
   - Solution: Validate email format before sending to Firebase

4. **"auth/weak-password"**
   - Solution: Implement password strength requirements

5. **Verification emails not received**
   - Check spam folder
   - Verify email template configuration
   - Check Firebase project settings

### Debug Mode:

Enable Firebase debug mode in development:

```typescript
// In your firebase.ts
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase config:', firebaseConfig);
}
```

## 📚 Additional Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

## 🎯 Next Steps

1. **Custom Claims**: Add custom user roles and permissions
2. **Social Auth**: Enable Google, Facebook, Twitter login
3. **Phone Auth**: Add SMS verification
4. **Multi-factor Auth**: Enable 2FA for enhanced security
5. **Analytics**: Track authentication events

---

**Need Help?** Check the Firebase documentation or create an issue in your project repository. 