# Generate New Service Account Key - Step by Step

Since your current key is valid but doesn't have Firestore access, let's generate a fresh one from Firebase Console.

## Steps:

### 1. Generate New Key from Firebase Console

1. **Go to Firebase Console:**
   - Open: https://console.firebase.google.com/project/unisync-c46e7/settings/serviceaccounts/adminsdk

2. **Generate Key:**
   - Click the **"Generate new private key"** button
   - A warning dialog will appear
   - Click **"Generate key"** to confirm
   - A JSON file will automatically download (usually named like `unisync-c46e7-firebase-adminsdk-xxxxx.json`)

### 2. Test the New Key Locally

1. **Backup your old key** (just in case):
   ```powershell
   copy serviceAccountKey.json serviceAccountKey.json.backup
   ```

2. **Replace with new key:**
   - Rename the downloaded file to `serviceAccountKey.json`
   - Or replace the content of your existing `serviceAccountKey.json` with the new one

3. **Test it:**
   ```powershell
   node test-service-account.js
   ```

4. **If you see `✅ Firestore connection successful!`**, the new key works!

### 3. Update Render Environment Variable

Once the new key works locally:

1. **Convert JSON to single line:**
   - Open the new JSON file
   - Use an online tool: https://jsonformatter.org/json-minify
   - Or manually remove line breaks (keep `\n` in private_key)

2. **Update Render:**
   - Go to Render dashboard → Your service → Environment
   - Find `FIREBASE_SERVICE_ACCOUNT`
   - Delete the old value
   - Paste the new single-line JSON
   - Save (Render will auto-redeploy)

3. **Check logs** - you should see:
   ```
   ✅ Firebase Admin initialized and Firestore connection verified
   ```

## Why This Works

Keys generated directly from Firebase Console automatically have:
- ✅ Proper permissions
- ✅ Valid credentials
- ✅ Correct project association
- ✅ All necessary roles

This is the most reliable way to get a working service account key.

