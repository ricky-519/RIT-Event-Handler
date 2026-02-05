import { Channel, Event, Period, User, ODRequest, UserRole } from "./types";

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Alex Student',
  role: UserRole.STUDENT,
  avatar: 'https://picsum.photos/seed/alex/100/100',
  campusCoins: 120,
  stats: {
    attendancePercentage: 87.5,
    eventsAttended: 12,
    arrears: 0,
    standing: 'Silver',
    cgpa: 8.9
  }
};

export const MOCK_TEACHER: User = {
  id: 't1',
  name: 'Prof. Johnson',
  role: UserRole.TEACHER,
  avatar: 'https://picsum.photos/seed/prof/100/100',
  campusCoins: 0
};

export const MOCK_CLUB_ADMIN: User = {
  id: 'c_admin1',
  name: 'AI Club Secretary',
  role: UserRole.CLUB_ADMIN,
  avatar: 'https://picsum.photos/seed/aiclub/100/100',
  campusCoins: 0
};

export const INITIAL_EVENTS: Event[] = [
  {
    id: 'e1',
    title: 'RIT TechNova Hackathon',
    description: 'Internal 24-hour hackathon. Solve campus problems using AI. Mentors from Alumni network.',
    date: '2024-11-15',
    time: '09:00 AM',
    location: 'Main Auditorium',
    category: 'TECHNICAL',
    type: 'INTERNAL',
    registrationLink: 'https://forms.gle/mock-internal-link',
    image: 'https://picsum.photos/seed/hackathon/800/600',
    organizer: 'AI Club',
    likes: 45
  },
  {
    id: 'e2',
    title: 'Inter-College Dance Fest',
    description: 'External competition at Anna University. Represent RIT in the group dance category.',
    date: '2024-11-20',
    time: '01:00 PM',
    location: 'Anna University, Chennai',
    category: 'CULTURAL',
    type: 'EXTERNAL',
    registrationLink: 'https://external-college.edu/register',
    image: 'https://picsum.photos/seed/dance/800/600',
    organizer: 'Student Council',
    likes: 128
  },
  {
    id: 'e3',
    title: 'Robotics Workshop',
    description: 'Hands-on workshop on Arduino. Kits provided. Open to all departments.',
    date: '2024-11-18',
    time: '11:00 AM',
    location: 'Lab Complex B',
    category: 'CLUB',
    type: 'INTERNAL',
    registrationLink: 'https://rit.edu/robotics-reg',
    image: 'https://picsum.photos/seed/robot/800/600',
    organizer: 'Robotics Society',
    likes: 32
  },
  {
    id: 'e4',
    title: 'Google Cloud Summit',
    description: 'External symposium for cloud enthusiasts. Transport provided by college bus.',
    date: '2024-11-25',
    time: '08:30 AM',
    location: 'Trade Center',
    category: 'TECHNICAL',
    type: 'EXTERNAL',
    registrationLink: 'https://cloud.google.com/summit',
    image: 'https://picsum.photos/seed/cloud/800/600',
    organizer: 'Dept of CSE',
    likes: 89
  }
];

export const CHANNELS: Channel[] = [
  { id: 'c1', name: 'general', type: 'PUBLIC', category: 'GENERAL' },
  { id: 'c2', name: 'lost-and-found', type: 'PUBLIC', category: 'GENERAL' },
  { id: 'c3', name: 'ai-club', type: 'PUBLIC', category: 'CLUBS' },
  { id: 'c4', name: 'dance-troupe', type: 'PUBLIC', category: 'CLUBS' },
  { id: 'c5', name: 'robotics-society', type: 'PUBLIC', category: 'CLUBS' },
  { id: 'c10', name: 'google-developer-club', type: 'PUBLIC', category: 'CLUBS' },
  { id: 'c11', name: 'entrepreneurship-cell', type: 'PUBLIC', category: 'CLUBS' },
  { id: 'c12', name: 'national-service-scheme', type: 'PUBLIC', category: 'CLUBS' },
  { id: 'c13', name: 'red-cross', type: 'PUBLIC', category: 'CLUBS' },
  { id: 'c6', name: 'cse-dept-official', type: 'PUBLIC', category: 'ACADEMIC' },
  { id: 'c7', name: 'exam-doubts', type: 'PUBLIC', category: 'ACADEMIC' },
  { id: 'c14', name: 'placement-prep', type: 'PUBLIC', category: 'ACADEMIC' },
  { id: 'c8', name: 'faculty-lounge', type: 'TEACHER_ONLY', category: 'FACULTY' },
  { id: 'c9', name: 'lesson-planning', type: 'TEACHER_ONLY', category: 'FACULTY' },
];

export const INITIAL_MESSAGES: Record<string, any[]> = {
  'c1': [
    { 
      id: 'm1', 
      senderId: 't1', 
      senderName: 'Prof. Johnson', 
      content: 'Welcome to RIT EventHandler! Please check the pinned guidelines for OD requests.', 
      timestamp: '10:00 AM', 
      role: UserRole.TEACHER,
      reactions: { '👍': ['u1', 'u2'] },
      replies: [
        {
          id: 'r1',
          senderId: 'u1',
          senderName: 'Alex Student',
          content: 'Noted, Professor. Is the new Hackathon event live?',
          timestamp: '10:05 AM',
          role: UserRole.STUDENT,
          reactions: {},
          replies: []
        }
      ]
    },
  ]
};

export const DAILY_TIMETABLE: Period[] = [
  { id: 1, startTime: '09:00 AM', endTime: '10:00 AM', subject: 'Data Structures' },
  { id: 2, startTime: '10:00 AM', endTime: '11:00 AM', subject: 'Calculus II' },
  { id: 3, startTime: '11:00 AM', endTime: '12:00 PM', subject: 'Digital Logic' },
  { id: 4, startTime: '12:00 PM', endTime: '01:00 PM', subject: 'Lunch Break' },
  { id: 5, startTime: '01:00 PM', endTime: '02:00 PM', subject: 'Physics Lab' },
  { id: 6, startTime: '02:00 PM', endTime: '03:00 PM', subject: 'Physics Lab' },
  { id: 7, startTime: '03:00 PM', endTime: '04:00 PM', subject: 'Library Hour' },
];

export const WEEKLY_TIMETABLE: Record<string, Period[]> = {
  'Monday': DAILY_TIMETABLE,
  'Tuesday': [
    { id: 1, startTime: '09:00 AM', endTime: '10:00 AM', subject: 'Circuit Theory' },
    { id: 2, startTime: '10:00 AM', endTime: '11:00 AM', subject: 'Electronics I' },
    { id: 3, startTime: '11:00 AM', endTime: '12:00 PM', subject: 'Maths III' },
    { id: 4, startTime: '12:00 PM', endTime: '01:00 PM', subject: 'Lunch Break' },
    { id: 5, startTime: '01:00 PM', endTime: '02:00 PM', subject: 'Programming Lab' },
    { id: 6, startTime: '02:00 PM', endTime: '03:00 PM', subject: 'Programming Lab' },
    { id: 7, startTime: '03:00 PM', endTime: '04:00 PM', subject: 'Sports' },
  ],
  'Wednesday': DAILY_TIMETABLE,
  'Thursday': [
    { id: 1, startTime: '09:00 AM', endTime: '10:00 AM', subject: 'DBMS' },
    { id: 2, startTime: '10:00 AM', endTime: '11:00 AM', subject: 'Operating Systems' },
    { id: 3, startTime: '11:00 AM', endTime: '12:00 PM', subject: 'Software Eng.' },
    { id: 4, startTime: '12:00 PM', endTime: '01:00 PM', subject: 'Lunch Break' },
    { id: 5, startTime: '01:00 PM', endTime: '02:00 PM', subject: 'Library' },
    { id: 6, startTime: '02:00 PM', endTime: '03:00 PM', subject: 'Seminar' },
    { id: 7, startTime: '03:00 PM', endTime: '04:00 PM', subject: 'Free' },
  ],
  'Friday': [
    { id: 1, startTime: '09:00 AM', endTime: '10:00 AM', subject: 'Mentoring' },
    { id: 2, startTime: '10:00 AM', endTime: '11:00 AM', subject: 'Data Structures' },
    { id: 3, startTime: '11:00 AM', endTime: '12:00 PM', subject: 'Digital Logic' },
    { id: 4, startTime: '12:00 PM', endTime: '01:00 PM', subject: 'Lunch Break' },
    { id: 5, startTime: '01:00 PM', endTime: '02:00 PM', subject: 'Project Work' },
    { id: 6, startTime: '02:00 PM', endTime: '03:00 PM', subject: 'Project Work' },
    { id: 7, startTime: '03:00 PM', endTime: '04:00 PM', subject: 'Club Activities' },
  ]
};

export const INITIAL_OD_REQUESTS: ODRequest[] = [];
