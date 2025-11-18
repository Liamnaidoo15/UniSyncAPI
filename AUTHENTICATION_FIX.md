# Authentication Fix - Invalid Credentials Issue

## Problem
Users created through the API registration endpoint were unable to login, receiving "invalid credentials" errors even with correct passwords.

## Root Cause
The issue was in the login flow:

1. **Registration**: When users are registered via API, passwords are hashed with bcrypt and stored in Firestore
2. **Login Flow**: The app attempts API login first, then falls back to Firestore if API fails
3. **Fallback Issue**: The Firestore fallback only checked plain-text demo passwords (student123, lecturer123, etc.), not bcrypt hashes
4. **Result**: If API login failed for any reason (timeout, connection error, or 401), the fallback couldn't verify bcrypt passwords, causing login to fail

## Solution
1. **Better Error Handling**: If API returns 401 (invalid credentials), the app now immediately returns the error instead of falling back to Firestore
2. **Enhanced Logging**: Added comprehensive logging to both API and app to track the authentication flow
3. **Password Validation**: Added explicit password requirement check during registration

## Changes Made

### API (`api/routes/auth.js`)
- Added logging to registration endpoint to track password hashing and storage
- Added logging to login endpoint to track password verification
- Added password requirement validation during registration

### App (`app/src/main/java/com/example/unisyncpoe/data/repository/AuthRepository.kt`)
- Added detailed logging for API login attempts
- Changed behavior: If API returns 401, immediately return error instead of falling back to Firestore
- This ensures API-registered users (with bcrypt passwords) must login through the API

## Testing
To verify the fix:

1. **Register a new user via API**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "name": "Test User",
       "role": "STUDENT",
       "password": "testpassword123"
     }'
   ```

2. **Check API logs** - You should see:
   - "Registration attempt for email: test@example.com"
   - "Hashing password..."
   - "Password hashed successfully"
   - "User saved successfully to Firestore"
   - "Verification: User saved with password: true"

3. **Login with the same credentials**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "testpassword123"
     }'
   ```

4. **Check API logs** - You should see:
   - "Login attempt for email: test@example.com"
   - "Checking password for user: test@example.com, has password: true"
   - "Password comparison result: true"
   - "Login successful for user: test@example.com"

5. **Test from the app** - Login should now work correctly

## Important Notes
- API-registered users **must** login through the API (they have bcrypt-hashed passwords)
- Demo accounts (with plain-text passwords) can still login through the Firestore fallback
- If the API is unreachable, API-registered users cannot login (this is expected behavior)
- Ensure the API server is running and accessible when testing

## Troubleshooting
If login still fails:

1. **Check API logs** for detailed error messages
2. **Verify password is being sent** - Check app logs for "Attempting API login for: [email]"
3. **Verify user exists in Firestore** - Check that the user document has a `password` field
4. **Check API connectivity** - Ensure the API server is running and accessible
5. **Verify password hash** - The password in Firestore should be a bcrypt hash (starts with `$2a$` or `$2b$`)

## Future Improvements
Consider adding:
- Password reset functionality
- Account lockout after multiple failed attempts
- More detailed error messages (without exposing security information)

