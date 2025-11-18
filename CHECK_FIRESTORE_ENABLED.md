# Check Firestore is Enabled

The test confirms your service account key is valid, but Firestore access is denied. Let's verify Firestore is enabled:

## Step 1: Check Firestore is Enabled

1. Go to: https://console.firebase.google.com/project/unisync-c46e7/firestore
2. **If you see "Get started" or "Create database":**
   - Click it
   - Choose "Start in test mode" (for development)
   - Select a location (choose closest to you)
   - Click "Enable"
   - Wait for it to finish setting up

3. **If you see a database already:**
   - Firestore is enabled, skip to Step 2

## Step 2: Verify Service Account Permissions

Even though you have the role, let's double-check:

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=unisync-c46e7
2. Find: `firebase-adminsdk-fbsvc@unisync-c46e7.iam.gserviceaccount.com`
3. Check what roles are listed
4. You should see: `Firebase Admin SDK Administrator Service Agent` or `Firebase Admin`

## Step 3: Wait for Permissions to Propagate

Sometimes permissions take a few minutes to propagate. After making changes:
- Wait 2-3 minutes
- Restart your API server
- Test again

## Step 4: Alternative - Use Firebase Console Service Account

If permissions still don't work, try generating a new key directly from Firebase Console (this ensures proper permissions):

1. Go to: https://console.firebase.google.com/project/unisync-c46e7/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Download the JSON
4. Test it locally with: `node test-service-account.js` (after replacing your serviceAccountKey.json)
5. If it works locally, update Render's FIREBASE_SERVICE_ACCOUNT environment variable

## Quick Test

After enabling Firestore, run the test again:
```powershell
cd C:\Users\LIAMn\AndroidStudioProjects\UniSyncPOE\api
node test-service-account.js
```

You should see: `✅ Firestore connection successful!`

