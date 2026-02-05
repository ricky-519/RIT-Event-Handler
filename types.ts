
export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  CLUB_ADMIN = 'CLUB_ADMIN' // Represents Club Coordinators/Staff managing a club
}

export interface UserStats {
  attendancePercentage: number;
  eventsAttended: number;
  arrears: number;
  standing: 'Gold' | 'Silver' | 'Bronze';
  cgpa: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  campusCoins: number;
  stats?: UserStats;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: 'CULTURAL' | 'TECHNICAL' | 'CLUB' | 'SPORTS';
  type: 'INTERNAL' | 'EXTERNAL';
  registrationLink: string;
  image: string;
  organizer: string;
  likes: number;
  isStudentPost?: boolean;
}

export interface Registration {
  id: string;
  eventId: string;
  studentId: string;
  collegeName?: string;
  proofUrl?: string;
  timestamp: string;
}

export interface ODRequest {
  id: string;
  studentId: string;
  studentName: string;
  eventId: string;
  eventTitle: string;
  eventTime: string;
  status: 'PENDING' | 'TEACHER_APPROVED' | 'REJECTED' | 'EVENT_ATTENDED' | 'ABSENT';
  timestamp: string;
  qrCodeData?: string; // Optional: Generated only after Teacher Approval
  uniqueCode?: string; // Optional: 6-digit code for manual verification
  aiAnalysis?: string; // AI Recommendation text
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  role: UserRole;
  reactions: Record<string, string[]>; // emoji -> array of userIds
  replies: Message[];
}

export interface Channel {
  id: string;
  name: string;
  type: 'PUBLIC' | 'PRIVATE' | 'TEACHER_ONLY';
  category: 'GENERAL' | 'CLUBS' | 'ACADEMIC' | 'FACULTY';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Period {
  id: number;
  startTime: string;
  endTime: string;
  subject: string;
}