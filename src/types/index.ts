export type UserRole = 'student' | 'lecturer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  status: 'active' | 'suspended';
  avatarUrl?: string;
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  matricNumber: string;
  email: string;
  phone: string;
  school: string; // e.g. "Faculty of Science" or "School of Applied Sciences"
  faculty?: string;
  department: string; // e.g. "Computer Science"
  programme: string; // "National Diploma" | "Higher National Diploma" | "Full-time"
  level: string; // "ND I" | "ND II" | "HND I" | "HND II"
  academicSession: string; // e.g. "2025/2026"
  status: 'active' | 'suspended';
  enrolledCourseIds: string[];
  avatarUrl?: string;
}

export interface LecturerProfile {
  id: string;
  userId: string;
  name: string;
  staffId: string;
  email: string;
  phone: string;
  department: string;
  title: string; // e.g. "Dr.", "Engr.", "Mr.", "Prof."
  status: 'active' | 'suspended';
  assignedCourseIds: string[];
  levelsTaking?: string[];
  avatarUrl?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  faculty: string;
  programmes: string[];
  headOfDepartment?: string;
}

export interface Course {
  id: string;
  code: string; // e.g. "CSC 401"
  title: string; // e.g. "Database Management Systems"
  units: number; // 2, 3, 4
  department: string; // "Computer Science"
  level: string; // "HND II"
  semester: 'First Semester' | 'Second Semester';
  academicSession: string; // "2025/2026"
  lecturerId: string;
  lecturerName: string;
  createdAt?: string;
}

export interface CourseRegistration {
  id: string;
  studentId: string;
  matricNumber: string;
  courseId: string;
  courseCode: string;
  academicSession: string;
  semester: string;
  registeredAt: string;
}

export interface AttendanceSession {
  id: string;
  sessionId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  lecturerId: string;
  lecturerName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // formatted WAT time string
  endTime?: string;
  expirationTime: number; // UNIX timestamp ms
  durationMinutes: number;
  status: 'active' | 'closed';
  qrToken: string;
  currentRollingToken?: string;
  requiresLocation?: boolean;
  allowedLatitude?: number;
  allowedLongitude?: number;
  radiusMeters?: number;
  totalRegistered: number;
  presentCount: number;
  absentCount: number;
  createdAt: string;
  closedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  attendanceId: string;
  sessionId: string;
  studentId: string;
  matricNumber: string;
  studentName: string;
  courseId: string;
  courseCode: string;
  lecturerId: string;
  date: string;
  checkInTime: string; // formatted WAT time string
  status: 'PRESENT' | 'ABSENT';
  locationVerified?: boolean;
  distanceMeters?: number;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string; // or 'all' or 'role:student'
  role?: UserRole | 'all';
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  read: boolean;
  timestamp: string;
  link?: string;
  level?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  userRole: string;
  details: string;
  ipAddress?: string;
}

export interface SystemSettings {
  minAttendancePercentage: number; // default 75%
  enableLocationVerification: boolean;
  maxLocationRadiusMeters: number; // default 100 meters
  campusLatitude: number; // Ibadan Poly latitude ~7.4435
  campusLongitude: number; // Ibadan Poly longitude ~3.8821
  dynamicTokenRefreshSeconds: number; // e.g. 20
  currentAcademicSession: string;
  currentSemester: 'First Semester' | 'Second Semester';
  institutionName: string;
  institutionShortName: string;
  systemTimezone: string;
}

export interface QRVerificationResult {
  success: boolean;
  error?: string;
  errorCode?: 'EXPIRED' | 'ALREADY_RECORDED' | 'NOT_REGISTERED' | 'SESSION_CLOSED' | 'INVALID_TOKEN' | 'OUTSIDE_RADIUS' | 'NOT_LOGGED_IN';
  record?: AttendanceRecord;
  session?: AttendanceSession;
}
