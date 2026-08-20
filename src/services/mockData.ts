import {
  User,
  StudentProfile,
  LecturerProfile,
  Department,
  Course,
  CourseRegistration,
  AttendanceSession,
  AttendanceRecord,
  AppNotification,
  AuditLog,
  SystemSettings
} from '../types';
import { getWATDateString } from '../utils/time';

export const INITIAL_SETTINGS: SystemSettings = {
  minAttendancePercentage: 75,
  enableLocationVerification: false,
  maxLocationRadiusMeters: 150,
  campusLatitude: 7.4435, // The Polytechnic, Ibadan North Campus
  campusLongitude: 3.8821,
  dynamicTokenRefreshSeconds: 20,
  currentAcademicSession: '2025/2026',
  currentSemester: 'First Semester',
  institutionName: 'The Polytechnic, Ibadan',
  institutionShortName: 'TPI',
  systemTimezone: 'West Africa Time (WAT / UTC+1)',
};

export const INITIAL_USERS: User[] = [];

export const INITIAL_DEPARTMENTS: Department[] = [];

export const INITIAL_STUDENTS: StudentProfile[] = [];

export const INITIAL_LECTURERS: LecturerProfile[] = [];

export const INITIAL_COURSES: Course[] = [];

export const INITIAL_REGISTRATIONS: CourseRegistration[] = [];

export const INITIAL_SESSIONS: AttendanceSession[] = [];

export const INITIAL_RECORDS: AttendanceRecord[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

