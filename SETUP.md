# UniSync API Setup Guide

This guide will help you configure the API to work correctly with the UniSync Android app.

## Quick Start

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `api/` directory with the following content:

```env
# JWT Secret for token signing (REQUIRED)
# Generate a secure secret: openssl rand -base64 32
# Or use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port (default: 3000)
PORT=3000

# Node Environment (development, production)
NODE_ENV=development

# CORS Origin (optional, defaults to '*' for development)
# For production, set to your app's domain
# CORS_ORIGIN=http://localhost:3000
```

**Important:** 
- The API will work without a `.env` file in development (it will use a default secret), but this is **NOT SECURE** for production.
- For production, you **MUST** set a strong `JWT_SECRET`.

### 3. Verify Firebase Service Account

Ensure you have one of these files in the `api/` directory:
- `serviceAccountKey.json`
- `firebase-adminsdk-*.json` (any file matching this pattern)

The API will automatically detect and use the Firebase service account file.

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The API will be available at `http://localhost:3000/api`

## App Configuration

### Android Emulator

The app is configured to use `http://10.0.2.2:3000/api/` for Android emulator connections.

This is already set in `app/build.gradle.kts`:
```kotlin
buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000/api/\"")
```

### Physical Device

If testing on a physical device, you need to:

1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. Update `app/build.gradle.kts`:
   ```kotlin
   buildConfigField("String", "API_BASE_URL", "\"http://YOUR_IP_ADDRESS:3000/api/\"")
   ```

3. Ensure your computer and device are on the same network.

4. Make sure your firewall allows connections on port 3000.

## API Response Format

All API endpoints return responses in this format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "error": null
}
```

**Error:**
```json
{
  "success": false,
  "data": null,
  "message": null,
  "error": "Error message"
}
```

## Authentication

The API uses JWT tokens for authentication. After login, the app receives a token that must be included in subsequent requests:

```
Authorization: Bearer <token>
```

Tokens expire after 7 days.

## Testing the API

### 1. Health Check

```bash
curl http://localhost:3000/health
```

### 2. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.edu",
    "name": "Test User",
    "role": "STUDENT",
    "password": "test123"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.edu",
    "password": "test123"
  }'
```

Save the token from the response for authenticated requests.

### 4. Get Current User

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

## Troubleshooting

### API Server Won't Start

1. **Port already in use:**
   - Change `PORT` in `.env` file
   - Or kill the process using port 3000

2. **Firebase Admin Error:**
   - Ensure `serviceAccountKey.json` or `firebase-adminsdk-*.json` exists
   - Verify the service account has proper permissions

3. **JWT_SECRET Warning:**
   - Create a `.env` file with `JWT_SECRET=your-secret-key`
   - The API will work with a default secret in development, but this is not secure

### App Can't Connect to API

1. **Android Emulator:**
   - Ensure API is running on `localhost:3000`
   - Verify app uses `http://10.0.2.2:3000/api/`

2. **Physical Device:**
   - Check computer and device are on same network
   - Verify firewall allows port 3000
   - Update `API_BASE_URL` in `app/build.gradle.kts` with your computer's IP

3. **Connection Timeout:**
   - Check if API server is running
   - Verify network connectivity
   - Check firewall settings

### Authentication Errors

1. **Invalid Token:**
   - Token may have expired (7 days)
   - Re-login to get a new token

2. **Token Not Sent:**
   - Verify `AuthInterceptor` is adding the token to requests
   - Check that token is saved after login

## API Endpoints

All endpoints are prefixed with `/api`:

- **Auth:** `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Users:** `/api/users/:id` (GET, PUT)
- **Announcements:** `/api/announcements` (GET, POST), `/api/announcements/:id` (GET, PUT, DELETE)
- **Assignments:** `/api/assignments` (GET, POST), `/api/assignments/:id` (GET, PUT), `/api/assignments/:id/submit` (PUT)
- **Attendance:** `/api/attendance` (GET, POST), `/api/attendance/stats/:studentId/:courseId` (GET)
- **Timetables:** `/api/timetables` (GET, POST)
- **QR Codes:** `/api/qr-codes/generate` (POST), `/api/qr-codes/scan` (POST)
- **Network:** `/api/network/posts` (GET, POST), `/api/network/posts/:id/like` (POST)

## Security Notes

⚠️ **Important for Production:**

1. Set a strong, random `JWT_SECRET` in `.env`
2. Configure `CORS_ORIGIN` to your app's domain
3. Use HTTPS in production
4. Never commit `.env` or `serviceAccountKey.json` to version control
5. Review Firestore security rules
6. Consider rate limiting for API endpoints

## Support

For issues or questions, refer to the main project documentation or check the API logs for detailed error messages.

