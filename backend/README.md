# RIT Event Handler - Backend

A Node.js/Express backend for college event management system with OD (On-Duty) approval workflow.

## Features

- User authentication (Students, Teachers, Club Admins, Event Coordinators)
- Event creation and management
- Event registration
- OD request submission and approval workflow
- QR code and unique code generation for attendance verification
- Forum/discussion posts for events
- Role-based access control

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **QR Code Generation**: qrcode

## Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (local or MongoDB Atlas)
- npm

### Steps

1. **Install dependencies**
```bash
cd backend
npm install
```

2. **Create .env file**
```bash
cp .env.example .env
```

3. **Configure environment variables**
Edit `.env` and add:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rit-eventhandler
JWT_SECRET=your_secure_secret_key_here
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

4. **Start the server**
```bash
npm run dev
```

Server will run on `http://localhost:5000`

## API Documentation

### Authentication Endpoints

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@rit.edu",
  "password": "password123",
  "role": "STUDENT",
  "department": "CSE",
  "registrationNumber": "21BCS001",
  "phone": "9876543210"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@rit.edu",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGc...",
  "user": {...}
}
```

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>
```

### Event Endpoints

#### Create Event (Club Admin/Admin only)
```
POST /api/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Annual Hackathon",
  "description": "24-hour coding competition",
  "category": "TECHNICAL",
  "type": "INTERNAL",
  "date": "2024-03-15",
  "time": "09:00 AM",
  "location": "Main Auditorium",
  "capacity": 200,
  "registrationDeadline": "2024-03-10"
}
```

#### Get All Events
```
GET /api/events?type=INTERNAL&category=TECHNICAL
```

#### Get Event Details
```
GET /api/events/:eventId
```

#### Register for Event
```
POST /api/events/register/:eventId
Authorization: Bearer <token>
```

### OD Request Endpoints

#### Submit OD Request (Student only)
```
POST /api/od
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventId": "648a5f1234567890abcdef",
  "teacherId": "648a5f1234567890abcdef",
  "reason": "Attending college event"
}
```

#### Get My OD Requests (Student)
```
GET /api/od/my-requests
Authorization: Bearer <token>
```

#### Get OD Requests (Teacher)
```
GET /api/od/teacher/requests
Authorization: Bearer <token>
```

#### Approve OD Request (Teacher)
```
PUT /api/od/:odRequestId/approve
Authorization: Bearer <token>

Response: Includes QR code and unique code
```

#### Reject OD Request (Teacher)
```
PUT /api/od/:odRequestId/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Low attendance record"
}
```

#### Verify Attendance (Event Coordinator)
```
POST /api/od/verify-attendance
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "ABC12345"  // or QR code data
}
```

### Forum Endpoints

#### Create Forum Post (Teacher)
```
POST /api/forum
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventId": "648a5f1234567890abcdef",
  "content": "Important announcement about the event"
}
```

#### Get Forum Posts
```
GET /api/forum/:eventId
Authorization: Bearer <token>
```

#### Add Comment
```
POST /api/forum/:postId/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great post!"
}
```

#### Like/Unlike Post
```
PUT /api/forum/:postId/like
Authorization: Bearer <token>
```

## Database Schema

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: STUDENT|TEACHER|CLUB_ADMIN|EVENT_COORDINATOR|ADMIN,
  department: String,
  registrationNumber: String,
  phone: String,
  profileImage: String,
  isVerified: Boolean,
  createdAt: Date
}
```

### Event
```javascript
{
  title: String,
  description: String,
  category: TECHNICAL|CULTURAL|SPORTS|WORKSHOP|SEMINAR|OTHER,
  type: INTERNAL|EXTERNAL,
  date: Date,
  time: String,
  location: String,
  capacity: Number,
  createdBy: ObjectId (User),
  registeredStudents: [ObjectId (User)],
  registrationDeadline: Date,
  createdAt: Date
}
```

### ODRequest
```javascript
{
  student: ObjectId (User),
  event: ObjectId (Event),
  teacher: ObjectId (User),
  status: PENDING|APPROVED|REJECTED,
  qrCode: String,
  uniqueCode: String (unique),
  attendanceVerified: Boolean,
  verifiedBy: ObjectId (User),
  verifiedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,
  createdAt: Date
}
```

## User Roles

1. **STUDENT** - Can register for events, submit OD requests, view forum posts
2. **TEACHER** - Can approve/reject OD requests, post in forum
3. **CLUB_ADMIN** - Can create events, manage club activities
4. **EVENT_COORDINATOR** - Can verify attendance via QR/code
5. **ADMIN** - Full access to all operations

## Deployment

### Deploy to Render.com

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Set environment variables in Render
5. Deploy

### Deploy to Railway.app

1. Push code to GitHub
2. Create new project on Railway
3. Add MongoDB database
4. Connect GitHub repository
5. Deploy

## Environment Variables for Production

```
NODE_ENV=production
PORT=5000
MONGODB_URI=<your_mongodb_uri>
JWT_SECRET=<strong_random_key>
FRONTEND_URL=<your_frontend_url>
```

## Future Enhancements

- Email notifications for OD approval/rejection
- SMS notifications
- College SSO integration
- Attendance analytics
- Timetable management
- Mobile app

## License

ISC

## Support

For issues and questions, contact the development team.
