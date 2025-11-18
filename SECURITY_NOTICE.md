# ⚠️ SECURITY NOTICE: Service Account Keys

## Important: Never Commit Service Account Keys to Git

Service account keys contain sensitive credentials that give full access to your Firebase project. **Never commit them to version control.**

## What Was Done

1. ✅ Updated `.gitignore` to exclude all Firebase service account key files
2. ✅ Removed the old key file from git tracking
3. ✅ New key files are now ignored by git

## If You Already Pushed Keys to Git

If you've already pushed service account keys to a public repository:

1. **Immediately revoke the exposed key:**
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=unisync-c46e7
   - Find the service account
   - Click "Manage keys"
   - Delete the exposed key

2. **Generate a new key:**
   - Generate a completely new service account key
   - Update your environment variables
   - Never commit it to git

3. **Clean Git History (if needed):**
   - If the repository is public, consider using `git filter-branch` or BFG Repo-Cleaner to remove the key from history
   - Or create a new repository without the sensitive files

## Best Practices

✅ **DO:**
- Store keys in environment variables (like Render)
- Use `.gitignore` to exclude key files
- Use `.gitignore` patterns like `*firebase-adminsdk*.json`
- Keep keys only on your local machine and in secure environment variable storage

❌ **DON'T:**
- Commit service account keys to git
- Share keys in chat/messages
- Store keys in code comments
- Upload keys to public repositories

## Current Status

- ✅ `.gitignore` updated to exclude all Firebase keys
- ✅ Old key removed from git tracking
- ✅ New keys will be ignored automatically

## Files That Should NEVER Be Committed

- `serviceAccountKey.json`
- `*firebase-adminsdk*.json`
- `unisync-*-firebase-adminsdk-*.json`
- `.env` files
- Any file containing credentials

