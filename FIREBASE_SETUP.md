# Firebase Setup Guide for Igani

## Quick Setup Instructions

### 1. Enable Firestore Database
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `igani-78bbc` project
3. Go to **Firestore Database**
4. Click **Create database**
5. Choose **Start in test mode** (we'll add rules next)
6. Select your preferred region

### 2. Apply Security Rules
1. In Firebase Console, go to **Firestore Database**
2. Click the **Rules** tab
3. Replace the existing rules with the content from `firebase.rules` file
4. Click **Publish**

### 3. Test Your Setup
1. Submit a contact form on your website
2. Check Firebase Console → Firestore → `contactSubmissions` collection
3. Update settings in admin panel
4. Check Firebase Console → Firestore → `settings` collection

## Security Rules Explained

### Current Rules (Development-Friendly)
```javascript
// Settings Collection
- READ: ✅ Anyone (needed for displaying site info)
- WRITE: ✅ Temporary open (until 2025-12-31)

// Contact Submissions Collection  
- CREATE: ✅ Anyone (contact form submissions)
- READ/UPDATE: ✅ Temporary open (admin access)

// Future: Websites Collection
- READ: ✅ Anyone (portfolio display)
- WRITE: ✅ Temporary open (admin management)
```

### Production Rules (Secure)
When ready for production, update the rules to:

```javascript
// Replace temporary rules with:
allow write: if request.auth != null && 
             request.auth.token.admin == true;
```

## Collections Structure

### `settings` Collection
- Document ID: `main`
- Fields: companyName, tagline, description, etc.
- Usage: Site configuration

### `contactSubmissions` Collection
- Document ID: Auto-generated
- Fields: firstName, lastName, email, projectType, message, submittedAt, status
- Usage: Contact form submissions

## Troubleshooting

### Permission Denied Errors
1. Check if Firestore is enabled
2. Verify security rules are published
3. Check browser console for detailed errors

### Data Not Appearing
1. Check Firebase Console → Firestore for data
2. Verify environment variables in `.env.local`
3. Check network tab for failed requests

## Next Steps (Optional)

### Add Authentication
1. Enable **Authentication** in Firebase Console
2. Set up **Email/Password** provider
3. Update security rules to use `request.auth.uid`
4. Replace simple password check with Firebase Auth

### Add Real-time Updates
```javascript
import { onSnapshot } from 'firebase/firestore';

// Listen for real-time updates
onSnapshot(collection(db, 'contactSubmissions'), (snapshot) => {
  // Update UI automatically when data changes
});
```

### Add Website Management to Firebase
```javascript
// Add websites collection to Firebase instead of localStorage
const websitesCollection = collection(db, 'websites');
```