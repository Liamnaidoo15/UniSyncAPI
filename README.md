# UniSync REST API

REST API backend for the UniSync University Management System.

## Features

- ✅ Authentication (Register, Login, Get Current User)
- ✅ User Management
- ✅ Announcements (CRUD)
- ✅ Assignments (CRUD + Submit)
- ✅ Attendance (Mark, Get, Statistics)
- ✅ Timetables (Create, Get)
- ✅ QR Code Generation & Scanning
- ✅ Network Posts (Create, Get, Like)
- ✅ JWT Authentication
- ✅ Role-based Access Control
- ✅ Firestore Integration

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase Project with Firestore enabled
- Firebase Admin SDK Service Account Key

## Setup Instructions

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the downloaded JSON file as `serviceAccountKey.json` in the `api/` directory

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and update:
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID
   - `JWT_SECRET`: A strong random string for JWT signing (use a secure random generator)
   - `PORT`: Server port (default: 3000)

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

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Users

- `GET /api/users/:id` - Get user by ID (requires auth)
- `PUT /api/users/:id` - Update user (requires auth)

### Announcements

- `GET /api/announcements` - Get all announcements (optional `?courseId=xxx`)
- `GET /api/announcements/:id` - Get announcement by ID
- `POST /api/announcements` - Create announcement (Lecturers/Coordinators/Admins only)
- `PUT /api/announcements/:id` - Update announcement
- `DELETE /api/announcements/:id` - Delete announcement

### Assignments

- `GET /api/assignments` - Get all assignments (optional `?courseId=xxx`)
- `GET /api/assignments/:id` - Get assignment by ID
- `POST /api/assignments` - Create assignment (Lecturers/Coordinators/Admins only)
- `PUT /api/assignments/:id` - Update assignment
- `PUT /api/assignments/:id/submit` - Submit assignment (Students only)

### Attendance

- `GET /api/attendance` - Get attendance records (optional `?studentId=xxx&courseId=xxx`)
- `POST /api/attendance` - Mark attendance (Lecturers/Coordinators/Admins only)
- `GET /api/attendance/stats/:studentId/:courseId` - Get attendance statistics

### Timetables

- `GET /api/timetables` - Get timetables (optional `?dayOfWeek=1`)
- `POST /api/timetables` - Create timetable (Lecturers/Coordinators/Admins only)

### QR Codes

- `POST /api/qr-codes/generate` - Generate QR code for attendance (Lecturers/Coordinators/Admins only)
- `POST /api/qr-codes/scan` - Scan QR code for attendance (Students only)

### Network Posts

- `GET /api/network/posts` - Get all network posts
- `POST /api/network/posts` - Create network post
- `POST /api/network/posts/:id/like` - Like/unlike a post

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained from the `/api/auth/login` endpoint and expire after 7 days.

## Response Format

All endpoints return responses in this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "message": null,
  "error": "Error message"
}
```

## User Roles

- `STUDENT` - Can view content, submit assignments, scan QR codes
- `LECTURER` - Can create announcements, assignments, mark attendance, generate QR codes
- `PROGRAM_COORDINATOR` - Can manage modules, approve content, view reports
- `ADMIN` - Full access to all features

## Testing the API

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university.edu",
    "name": "Admin User",
    "role": "ADMIN",
    "password": "admin123"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university.edu",
    "password": "admin123"
  }'
```

### 3. Use the Token

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

## Deployment

### Option 1: Firebase Functions (Recommended)

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize Firebase Functions: `firebase init functions`
3. Deploy: `firebase deploy --only functions`

### Option 2: Traditional Hosting

Deploy to platforms like:
- Heroku
- AWS EC2
- Google Cloud Run
- DigitalOcean
- Railway

Make sure to:
- Set environment variables
- Keep `serviceAccountKey.json` secure (use environment variables in production)
- Use a strong `JWT_SECRET`
- Enable HTTPS

## Security Notes

- ⚠️ **Never commit `serviceAccountKey.json` or `.env` to version control**
- ⚠️ Use strong, random `JWT_SECRET` in production
- ⚠️ Enable HTTPS in production
- ⚠️ Configure CORS properly for your domain
- ⚠️ Review Firestore security rules

## Troubleshooting

### Firebase Admin Error
- Ensure `serviceAccountKey.json` exists in the `api/` directory
- Verify the service account has proper permissions

### Port Already in Use
- Change `PORT` in `.env` file
- Or kill the process using the port

### Authentication Errors
- Verify JWT_SECRET is set correctly
- Check token expiration
- Ensure token is sent in Authorization header

## Support

For issues or questions, check the main project documentation or create an issue in the repository.

