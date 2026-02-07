# RIT Event Handler - Complete Setup Guide

## Quick Start (Development)

### 1. Clone Repository
```bash
git clone https://github.com/ricky-519/RIT-Event-Handler.git
cd RIT-Event-Handler
```

### 2. MongoDB Setup (Choose One)

#### Option A: MongoDB Atlas (Recommended for College Deployment)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a new cluster (free tier)
4. Get connection string
5. Replace in `backend/.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rit-eventhandler?retryWrites=true&w=majority
```

#### Option B: Local MongoDB
```bash
# Install MongoDB Community Edition
# Windows: Download from https://www.mongodb.com/try/download/community

# Start MongoDB
mongod

# Update .env
MONGODB_URI=mongodb://localhost:27017/rit-eventhandler
```

### 3. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI
npm install
npm run dev
```

Server runs on: `http://localhost:5000`

### 4. Setup Frontend

```bash
# In another terminal, from root directory
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000/RIT-Event-Handler/`

### 5. Test API

Create test user:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@rit.edu",
    "password": "password123",
    "role": "STUDENT",
    "department": "CSE",
    "registrationNumber": "21BCS001"
  }'
```

## Architecture

```
Frontend (React + Vite)
    ↓ (API calls via axios/fetch)
Backend (Express + Node.js)
    ↓ (Database operations)
MongoDB (Data storage)
```

## Project Structure

### Frontend
- `App.tsx` - Main React component
- `components/` - Reusable UI components
- `services/` - API calls
- `types.ts` - TypeScript interfaces

### Backend
- `server.js` - Express app
- `config/` - Database connection
- `models/` - MongoDB schemas
- `controllers/` - Business logic
- `routes/` - API endpoints
- `middleware/` - Authentication & authorization

## Key Features

### 1. User Roles
- **STUDENT** - Register for events, submit OD
- **TEACHER** - Approve/reject OD
- **CLUB_ADMIN** - Create events
- **EVENT_COORDINATOR** - Verify attendance
- **ADMIN** - Full access

### 2. Event Management
- Create internal/external events
- Register for events
- Track capacity
- Category filtering

### 3. OD System (Main Feature)
- Students submit OD requests
- Teachers approve/reject with reasons
- **QR code generation** for verification
- **Unique code generation** for manual entry
- Event coordinators scan to verify attendance

### 4. Forum
- Teachers post announcements
- Students comment and like posts

## API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### Events
```
GET    /api/events
GET    /api/events/:id
POST   /api/events              (Club Admin)
PUT    /api/events/:id          (Creator)
DELETE /api/events/:id          (Creator)
POST   /api/events/register/:id (Student)
```

### OD Requests
```
POST   /api/od                           (Student)
GET    /api/od/my-requests               (Student)
GET    /api/od/teacher/requests          (Teacher)
PUT    /api/od/:id/approve               (Teacher)
PUT    /api/od/:id/reject                (Teacher)
POST   /api/od/verify-attendance         (Event Coordinator)
```

### Forum
```
POST   /api/forum                (Teacher)
GET    /api/forum/:eventId
POST   /api/forum/:postId/comments
PUT    /api/forum/:postId/like
```

## Deployment

### Deploy Backend to Render.com

1. Create account at https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Add environment variables:
   ```
   MONGODB_URI=<your_mongodb_atlas_uri>
   JWT_SECRET=<strong_random_key>
   NODE_ENV=production
   FRONTEND_URL=<your_frontend_url>
   ```
5. Deploy

### Deploy Frontend to GitHub Pages (Already Done)
- Frontend automatically deploys when pushed to main
- URL: https://ricky-519.github.io/RIT-Event-Handler/

## Environment Variables

### Development (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rit-eventhandler
JWT_SECRET=dev_secret_key
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Production (.env on server)
```
PORT=5000
MONGODB_URI=<Atlas_URI>
JWT_SECRET=<strong_random_key>
NODE_ENV=production
FRONTEND_URL=<production_url>
```

## Testing

### Test Registration & Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@rit.edu",
    "password": "password123",
    "role": "STUDENT",
    "department": "CSE",
    "registrationNumber": "21BCS001"
  }'

# Login (save the token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@rit.edu",
    "password": "password123"
  }'

# Use token for other requests
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Test Event Creation
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Annual Hackathon",
    "description": "24-hour coding event",
    "category": "TECHNICAL",
    "type": "INTERNAL",
    "date": "2024-03-15",
    "time": "09:00 AM",
    "location": "Main Hall",
    "capacity": 200,
    "registrationDeadline": "2024-03-10"
  }'
```

## Troubleshooting

### Backend won't start
- Check if port 5000 is in use
- Ensure MongoDB is running/connected
- Check .env file exists with correct values

### Frontend can't connect to backend
- Ensure backend is running on port 5000
- Check FRONTEND_URL in backend .env
- Check API URLs in frontend services

### OD QR code not generating
- Ensure qrcode package is installed
- Check nodemailer is configured if email needed

## Future Enhancements

- [ ] Email notifications for OD approval/rejection
- [ ] SMS notifications
- [ ] College SSO/LDAP integration
- [ ] Attendance analytics dashboard
- [ ] Timetable management
- [ ] Mobile app (React Native)
- [ ] Export attendance reports
- [ ] Venue management

## Support & Team

**Project:** RIT Event Management System
**Team Members:** 4 CSE Students
**Supervisor:** Faculty Advisor
**Repository:** https://github.com/ricky-519/RIT-Event-Handler

## License

ISC License - See LICENSE file for details
