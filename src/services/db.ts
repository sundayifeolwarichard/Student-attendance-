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
  SystemSettings,
  QRVerificationResult
} from '../types';
import {
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_STUDENTS,
  INITIAL_LECTURERS,
  INITIAL_COURSES,
  INITIAL_REGISTRATIONS,
  INITIAL_SESSIONS,
  INITIAL_RECORDS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from './mockData';
import { db as firestore } from './firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  onSnapshot
} from 'firebase/firestore';
import { formatWATTime, formatWATDate, getWATDateString, getWATDate } from '../utils/time';

const STORAGE_KEYS = {
  SETTINGS: 'tpi_attendance_settings',
  USERS: 'tpi_attendance_users',
  DEPARTMENTS: 'tpi_attendance_departments',
  STUDENTS: 'tpi_attendance_students',
  LECTURERS: 'tpi_attendance_lecturers',
  COURSES: 'tpi_attendance_courses',
  REGISTRATIONS: 'tpi_attendance_registrations',
  SESSIONS: 'tpi_attendance_sessions',
  RECORDS: 'tpi_attendance_records',
  NOTIFICATIONS: 'tpi_attendance_notifications',
  AUDIT_LOGS: 'tpi_attendance_audit_logs',
  ACTIVE_USER_ID: 'tpi_attendance_active_user_id',
};

// Automatic version check to force-purge legacy mock data from browser LocalStorage
const DB_VERSION_KEY = 'tpi_attendance_db_version';
const CURRENT_DB_VERSION = 'v3_complete_wipe_all_mock';

try {
  if (typeof localStorage !== 'undefined') {
    const existingVer = localStorage.getItem(DB_VERSION_KEY);
    if (existingVer !== CURRENT_DB_VERSION) {
      Object.values(STORAGE_KEYS).forEach(k => {
        if (k !== STORAGE_KEYS.SETTINGS) {
          localStorage.removeItem(k);
        }
      });
      localStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);
    }
  }
} catch (e) {
  console.warn("Error running local storage version migration:", e);
}

// Event listener mechanism for real-time reactivity
type EventCallback = (data?: any) => void;
class EventEmitter {
  private listeners: { [event: string]: EventCallback[] } = {};

  on(event: string, callback: EventCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }
}

export const dbEvents = new EventEmitter();

function loadItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (data === null) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    const parsed = JSON.parse(data);
    return parsed as T;
  } catch (err) {
    console.error(`Error loading key ${key}:`, err);
    return fallback;
  }
}

function saveItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving key ${key}:`, err);
  }
}

// Helper to sanitize objects for Firestore (removes undefined values which cause setDoc to fail)
function cleanForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore);
  }
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = cleanForFirestore(val);
    }
  }
  return result;
}

// Background firestore sync helper with robust sanitization and logging
async function syncToFirestore(colName: string, docId: string, data: any): Promise<boolean> {
  try {
    if (firestore && docId) {
      const sanitized = cleanForFirestore(data);
      await setDoc(doc(firestore, colName, docId), sanitized, { merge: true });
      return true;
    }
    return false;
  } catch (err) {
    console.error(`syncToFirestore error for ${colName}/${docId}:`, err);
    return false;
  }
}

async function deleteFromFirestore(colName: string, docId: string): Promise<boolean> {
  try {
    if (firestore && docId) {
      await deleteDoc(doc(firestore, colName, docId));
      return true;
    }
    return false;
  } catch (err) {
    console.error(`deleteFromFirestore error for ${colName}/${docId}:`, err);
    return false;
  }
}

// Helper to race a promise with a timeout
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

let isClosingExpired = false;

export const db = {
  // Direct firestore sync exporter
  syncToFirestore,

  // Direct fetch for specific user profile from Firestore
  syncUserProfileFromFirestore: async (userId: string): Promise<User | null> => {
    try {
      if (!firestore || !userId) return null;
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        const users = db.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index >= 0) {
          users[index] = { ...users[index], ...userData };
        } else {
          users.push(userData);
        }
        saveItem(STORAGE_KEYS.USERS, users);

        // Also fetch profile
        if (userData.role === 'student') {
          const studentDoc = await getDoc(doc(firestore, 'students', userId));
          if (studentDoc.exists()) {
            const studentData = studentDoc.data() as StudentProfile;
            const students = db.getStudents();
            const sIndex = students.findIndex(s => s.id === userId || s.userId === userId);
            if (sIndex >= 0) {
              students[sIndex] = { ...students[sIndex], ...studentData };
            } else {
              students.push(studentData);
            }
            saveItem(STORAGE_KEYS.STUDENTS, students);
          }
        } else if (userData.role === 'lecturer') {
          const lecturerDoc = await getDoc(doc(firestore, 'lecturers', userId));
          if (lecturerDoc.exists()) {
            const lecturerData = lecturerDoc.data() as LecturerProfile;
            const lecturers = db.getLecturers();
            const lIndex = lecturers.findIndex(l => l.id === userId || l.userId === userId);
            if (lIndex >= 0) {
              lecturers[lIndex] = { ...lecturers[lIndex], ...lecturerData };
            } else {
              lecturers.push(lecturerData);
            }
            saveItem(STORAGE_KEYS.LECTURERS, lecturers);
          }
        }

        dbEvents.emit('users_updated');
        return userData;
      }
    } catch (e) {
      console.warn("Direct user sync error:", e);
    }
    return null;
  },

  // Start real-time Firestore listeners for instant admin dashboard sync across all devices
  startRealtimeListeners: () => {
    if (!firestore) return;
    const collectionsToListen = [
      { col: 'students', key: STORAGE_KEYS.STUDENTS, event: 'students_updated', fallback: INITIAL_STUDENTS },
      { col: 'lecturers', key: STORAGE_KEYS.LECTURERS, event: 'lecturers_updated', fallback: INITIAL_LECTURERS },
      { col: 'users', key: STORAGE_KEYS.USERS, event: 'users_updated', fallback: INITIAL_USERS },
      { col: 'records', key: STORAGE_KEYS.RECORDS, event: 'records_updated', fallback: INITIAL_RECORDS },
      { col: 'sessions', key: STORAGE_KEYS.SESSIONS, event: 'sessions_updated', fallback: INITIAL_SESSIONS },
    ];

    collectionsToListen.forEach(item => {
      try {
        onSnapshot(collection(firestore, item.col), (snapshot) => {
          if (!snapshot.empty) {
            const docsData: any[] = [];
            snapshot.forEach(doc => docsData.push(doc.data()));
            saveItem(item.key, docsData);
            dbEvents.emit(item.event, docsData);
          } else {
            saveItem(item.key, []);
            dbEvents.emit(item.event, []);
          }
        }, () => {});
      } catch (e) {
        // ignore
      }
    });
  },

  // Sync all data from Firestore to localStorage for cross-browser synchronization
  initializeFromFirestore: async (targetUserId?: string): Promise<boolean> => {
    try {
      if (!firestore) return false;

      // Start real-time listeners for instant synchronization
      db.startRealtimeListeners();

      // If a user ID is specified, sync their user profile immediately
      if (targetUserId) {
        await db.syncUserProfileFromFirestore(targetUserId);
      }

      const collectionsToSync = [
        { col: 'users', key: STORAGE_KEYS.USERS, fallback: INITIAL_USERS },
        { col: 'students', key: STORAGE_KEYS.STUDENTS, fallback: INITIAL_STUDENTS },
        { col: 'lecturers', key: STORAGE_KEYS.LECTURERS, fallback: INITIAL_LECTURERS },
        { col: 'departments', key: STORAGE_KEYS.DEPARTMENTS, fallback: INITIAL_DEPARTMENTS },
        { col: 'courses', key: STORAGE_KEYS.COURSES, fallback: INITIAL_COURSES },
        { col: 'registrations', key: STORAGE_KEYS.REGISTRATIONS, fallback: INITIAL_REGISTRATIONS },
        { col: 'sessions', key: STORAGE_KEYS.SESSIONS, fallback: INITIAL_SESSIONS },
        { col: 'records', key: STORAGE_KEYS.RECORDS, fallback: INITIAL_RECORDS },
        { col: 'notifications', key: STORAGE_KEYS.NOTIFICATIONS, fallback: INITIAL_NOTIFICATIONS },
        { col: 'audit_logs', key: STORAGE_KEYS.AUDIT_LOGS, fallback: INITIAL_AUDIT_LOGS },
      ];

      let didFetchAny = false;

      // Special handling for settings with a realistic timeout
      try {
        const settingsSnap = await withTimeout(
          getDoc(doc(firestore, 'settings', 'system_config')),
          4000,
          null
        );
        if (settingsSnap && settingsSnap.exists()) {
          saveItem(STORAGE_KEYS.SETTINGS, settingsSnap.data());
          didFetchAny = true;
        } else if (!settingsSnap) {
          // Initialize settings in firestore if missing
          syncToFirestore('settings', 'system_config', INITIAL_SETTINGS);
        }
      } catch (e) {
        console.warn("Failed to sync settings:", e);
      }

      // Sync each collection
      for (const item of collectionsToSync) {
        try {
          const querySnapshot = await withTimeout(
            getDocs(collection(firestore, item.col)),
            5000,
            null
          );
          if (querySnapshot && !querySnapshot.empty) {
            const docsData: any[] = [];
            querySnapshot.forEach((doc) => {
              docsData.push(doc.data());
            });
            saveItem(item.key, docsData);
            didFetchAny = true;
          } else {
            saveItem(item.key, []);
          }
        } catch (e) {
          console.warn(`Failed to sync collection ${item.col}:`, e);
        }
      }

      if (didFetchAny) {
        dbEvents.emit('data_reset');
        dbEvents.emit('auth_changed', db.getActiveUserId());
        dbEvents.emit('users_updated');
        dbEvents.emit('courses_updated');
        dbEvents.emit('records_updated');
        dbEvents.emit('sessions_updated');
      }

      return true;
    } catch (err) {
      console.warn("Error in initializeFromFirestore:", err);
      return false;
    }
  },

  // Reset/wipe all data completely from LocalStorage and Firestore
  resetToDefaults: async () => {
    saveItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    saveItem(STORAGE_KEYS.USERS, []);
    saveItem(STORAGE_KEYS.DEPARTMENTS, []);
    saveItem(STORAGE_KEYS.STUDENTS, []);
    saveItem(STORAGE_KEYS.LECTURERS, []);
    saveItem(STORAGE_KEYS.COURSES, []);
    saveItem(STORAGE_KEYS.REGISTRATIONS, []);
    saveItem(STORAGE_KEYS.SESSIONS, []);
    saveItem(STORAGE_KEYS.RECORDS, []);
    saveItem(STORAGE_KEYS.NOTIFICATIONS, []);
    saveItem(STORAGE_KEYS.AUDIT_LOGS, []);
    saveItem(STORAGE_KEYS.ACTIVE_USER_ID, '');

    // Delete all records from Firestore collections
    try {
      if (firestore) {
        const collectionsToClear = [
          'users', 'departments', 'students', 'lecturers',
          'courses', 'registrations', 'sessions', 'records',
          'notifications', 'audit_logs'
        ];
        for (const colName of collectionsToClear) {
          const snapshot = await getDocs(collection(firestore, colName));
          snapshot.forEach(docSnap => {
            deleteFromFirestore(colName, docSnap.id);
          });
        }
        await syncToFirestore('settings', 'system_config', INITIAL_SETTINGS);
      }
    } catch (e) {
      console.warn("Error wiping Firestore during reset:", e);
    }

    dbEvents.emit('data_reset');
    dbEvents.emit('auth_changed');
    dbEvents.emit('users_updated');
    dbEvents.emit('courses_updated');
    dbEvents.emit('records_updated');
    dbEvents.emit('sessions_updated');
  },

  // -------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------
  getSettings: (): SystemSettings => {
    return loadItem<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  },
  updateSettings: (partial: Partial<SystemSettings>): SystemSettings => {
    const current = db.getSettings();
    const updated = { ...current, ...partial };
    saveItem(STORAGE_KEYS.SETTINGS, updated);
    syncToFirestore('settings', 'system_config', updated);
    dbEvents.emit('settings_updated', updated);
    return updated;
  },

  // -------------------------------------------------------------
  // Users & Auth
  // -------------------------------------------------------------
  getUsers: (): User[] => {
    return loadItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },
  getUserById: (id: string): User | undefined => {
    return db.getUsers().find(u => u.id === id);
  },
  getUserByEmail: (email: string): User | undefined => {
    return db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  getActiveUserId: (): string => {
    return loadItem<string>(STORAGE_KEYS.ACTIVE_USER_ID, '');
  },
  getActiveUser: (): User | null => {
    const activeId = db.getActiveUserId();
    if (!activeId) return null;
    return db.getUserById(activeId) || null;
  },
  setActiveUserId: (userId: string | null): void => {
    if (!userId) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
      dbEvents.emit('auth_changed', null);
      dbEvents.emit('users_updated');
      return;
    }
    saveItem(STORAGE_KEYS.ACTIVE_USER_ID, userId);
    dbEvents.emit('auth_changed', userId);
    dbEvents.emit('users_updated');
  },
  switchUserByRole: (role: string): User | null => {
    const users = db.getUsers();
    const match = users.find(u => u.role === role && u.status === 'active');
    if (match) {
      db.setActiveUserId(match.id);
      return match;
    }
    return null;
  },
  updateUserStatus: (userId: string, status: 'active' | 'suspended'): User | null => {
    const user = db.updateUser(userId, { status });
    if (user?.role === 'student') {
      const student = db.getStudentByUserId(userId);
      if (student) db.updateStudent(student.id, { status });
    } else if (user?.role === 'lecturer') {
      const lecturer = db.getLecturerByUserId(userId);
      if (lecturer) db.updateLecturer(lecturer.id, { status });
    }
    db.addAuditLog('User Status Updated', `Account status for ${user?.name || userId} changed to ${status}.`, 'Administrator');
    return user;
  },
  getCurrentUser: (): User | null => {
    return db.getActiveUser();
  },
  createUser: (userData: Omit<User, 'createdAt'> | (Omit<User, 'id' | 'createdAt'> & {id?: string})): User => {
    const users = db.getUsers();
    const newUser: User = {
      ...userData,
      id: ('id' in userData && userData.id) ? userData.id : `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveItem(STORAGE_KEYS.USERS, users);
    syncToFirestore('users', newUser.id, newUser);
    dbEvents.emit('users_updated', users);
    return newUser;
  },
  updateUser: (id: string, partial: Partial<User>): User | null => {
    const users = db.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...partial };
    saveItem(STORAGE_KEYS.USERS, users);
    syncToFirestore('users', id, users[index]);
    dbEvents.emit('users_updated', users);
    return users[index];
  },
  deleteUser: (id: string): boolean => {
    let users = db.getUsers();
    const initialLen = users.length;
    users = users.filter(u => u.id !== id);
    if (users.length !== initialLen) {
      saveItem(STORAGE_KEYS.USERS, users);
      deleteFromFirestore('users', id);
      dbEvents.emit('users_updated', users);
      return true;
    }
    return false;
  },

  // -------------------------------------------------------------
  // Students
  // -------------------------------------------------------------
  getStudents: (): StudentProfile[] => {
    return loadItem<StudentProfile[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  },
  getStudentById: (id: string): StudentProfile | undefined => {
    return db.getStudents().find(s => s.id === id || s.userId === id);
  },
  getLecturerTakenCourseIds: (): string[] => {
    const courseIds = new Set<string>();
    try {
      const lecturers = loadItem<LecturerProfile[]>(STORAGE_KEYS.LECTURERS, INITIAL_LECTURERS);
      lecturers.forEach(l => {
        if (l.assignedCourseIds && Array.isArray(l.assignedCourseIds)) {
          l.assignedCourseIds.forEach(id => {
            if (id && typeof id === 'string') courseIds.add(id);
          });
        }
      });

      const courses = loadItem<Course[]>(STORAGE_KEYS.COURSES, INITIAL_COURSES);
      courses.forEach(c => {
        if (c.lecturerId && typeof c.lecturerId === 'string' && c.lecturerId.trim() !== '' && c.lecturerId.toLowerCase() !== 'unassigned') {
          courseIds.add(c.id);
        }
      });

      const sessions = loadItem<AttendanceSession[]>(STORAGE_KEYS.SESSIONS, INITIAL_SESSIONS);
      sessions.forEach(s => {
        if (s.courseId && typeof s.courseId === 'string') {
          courseIds.add(s.courseId);
        }
      });
    } catch (e) {
      console.warn("Error getting lecturer taken courses:", e);
    }
    return Array.from(courseIds);
  },
  getMatchingCoursesForStudent: (department?: string, level?: string): string[] => {
    const allCourses = db.getCourses();
    if (allCourses.length === 0) return [];

    const targetDept = (department || 'Computer Science').trim().toLowerCase();
    const targetLevel = (level || 'HND II').trim().toUpperCase();

    const normalizeLevel = (l: string) => l.toUpperCase().replace(/\s+/g, '').replace('2', 'II').replace('1', 'I');
    const normTargetLevel = normalizeLevel(targetLevel);

    let matches = allCourses.filter(c => {
      const deptMatch = c.department.trim().toLowerCase() === targetDept;
      const levelMatch = normalizeLevel(c.level) === normTargetLevel;
      return deptMatch && levelMatch;
    });

    if (matches.length === 0) {
      matches = allCourses.filter(c => c.department.trim().toLowerCase() === targetDept);
    }

    if (matches.length === 0) {
      matches = allCourses;
    }

    const matchedIds = matches.map(c => c.id);
    const lecturerTakenIds = db.getLecturerTakenCourseIds();

    const combined = new Set<string>([...matchedIds, ...lecturerTakenIds]);
    return Array.from(combined);
  },
  getStudentByUserId: (userId: string): StudentProfile | undefined => {
    const students = db.getStudents();
    let found = students.find(s => s.userId === userId || s.id === userId);
    const lecturerTakenIds = db.getLecturerTakenCourseIds();

    if (found) {
      if (lecturerTakenIds.length > 0) {
        const missing = lecturerTakenIds.filter(cid => !found!.enrolledCourseIds.includes(cid));
        if (missing.length > 0) {
          found.enrolledCourseIds = Array.from(new Set([...found.enrolledCourseIds, ...missing]));
          saveItem(STORAGE_KEYS.STUDENTS, students);
          syncToFirestore('students', found.id, found);
          missing.forEach(cid => {
            db.registerStudentForCourse(found!.id, cid);
          });
        }
      }
      return found;
    }

    // Fallback: search by user email
    const users = db.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      found = students.find(s => s.email.toLowerCase() === user.email.toLowerCase());
      if (found) {
        found.userId = user.id;
        if (lecturerTakenIds.length > 0) {
          const missing = lecturerTakenIds.filter(cid => !found!.enrolledCourseIds.includes(cid));
          if (missing.length > 0) {
            found.enrolledCourseIds = Array.from(new Set([...found.enrolledCourseIds, ...missing]));
            missing.forEach(cid => {
              db.registerStudentForCourse(found!.id, cid);
            });
          }
        }
        saveItem(STORAGE_KEYS.STUDENTS, students);
        return found;
      }

      // If user is a student, automatically construct & persist a complete StudentProfile
      if (user.role === 'student') {
        const defaultCourses = db.getMatchingCoursesForStudent('Computer Science', 'HND II');
        const enrolledCourses = Array.from(new Set([...defaultCourses, ...lecturerTakenIds]));

        const newStudent: StudentProfile = {
          id: `student_${user.id}`,
          userId: user.id,
          name: user.name || 'Student User',
          email: user.email,
          matricNumber: `ND/CS/25/${Math.floor(100 + Math.random() * 900)}`,
          school: 'School of Science & Technology',
          department: 'Computer Science',
          programme: 'Higher National Diploma',
          level: 'HND II',
          academicSession: '2025/2026',
          phone: user.phone || '+234 800 000 0000',
          status: 'active',
          enrolledCourseIds: enrolledCourses,
          avatarUrl: user.avatarUrl,
        };

        students.push(newStudent);
        saveItem(STORAGE_KEYS.STUDENTS, students);
        syncToFirestore('students', newStudent.id, newStudent);

        // Auto-register courses
        enrolledCourses.forEach(cid => {
          db.registerStudentForCourse(newStudent.id, cid);
        });

        return newStudent;
      }
    }

    // Secondary fallback: if students list is empty or any student exists
    if (students.length > 0) {
      return students[0];
    }

    return undefined;
  },
  getStudentByMatric: (matric: string): StudentProfile | undefined => {
    return db.getStudents().find(s => s.matricNumber.trim().toUpperCase() === matric.trim().toUpperCase());
  },
  createStudent: (profileData: Omit<StudentProfile, 'id'>, password = 'password123'): StudentProfile => {
    let user = db.getUserByEmail(profileData.email);
    if (!user) {
      user = db.createUser({
        id: profileData.userId, // Pass the Firebase UID if provided
        name: profileData.name,
        email: profileData.email,
        role: 'student',
        phone: profileData.phone,
        status: 'active',
      });
    }

    const students = db.getStudents();
    const baseCourses = profileData.enrolledCourseIds && profileData.enrolledCourseIds.length > 0
      ? profileData.enrolledCourseIds
      : db.getMatchingCoursesForStudent(profileData.department, profileData.level);

    const lecturerTakenIds = db.getLecturerTakenCourseIds();
    const enrolledCourses = Array.from(new Set([...baseCourses, ...lecturerTakenIds]));

    const newStudent: StudentProfile = {
      ...profileData,
      id: profileData.userId || `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      enrolledCourseIds: enrolledCourses,
    };

    students.push(newStudent);
    saveItem(STORAGE_KEYS.STUDENTS, students);
    syncToFirestore('students', newStudent.id, newStudent);

    // Auto create course registrations
    enrolledCourses.forEach(cid => {
      db.registerStudentForCourse(newStudent.id, cid);
    });

    db.addAuditLog('Student Created', `New student profile registered for ${newStudent.name} (${newStudent.matricNumber}).`, 'Administrator');
    dbEvents.emit('students_updated', students);
    return newStudent;
  },
  updateStudent: (id: string, partial: Partial<StudentProfile>): StudentProfile | null => {
    const students = db.getStudents();
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return null;

    students[index] = { ...students[index], ...partial };
    saveItem(STORAGE_KEYS.STUDENTS, students);
    syncToFirestore('students', id, students[index]);

    // If user info updated, sync User object
    if (partial.name || partial.email || partial.phone) {
      db.updateUser(students[index].userId, {
        ...(partial.name && { name: partial.name }),
        ...(partial.email && { email: partial.email }),
        ...(partial.phone && { phone: partial.phone }),
      });
    }

    dbEvents.emit('students_updated', students);
    return students[index];
  },
  deleteStudent: (id: string): boolean => {
    let students = db.getStudents();
    const student = students.find(s => s.id === id);
    if (!student) return false;

    students = students.filter(s => s.id !== id);
    saveItem(STORAGE_KEYS.STUDENTS, students);
    deleteFromFirestore('students', id);
    db.deleteUser(student.userId);

    // Remove registrations and purge from Firestore
    const allRegs = loadItem<CourseRegistration[]>(STORAGE_KEYS.REGISTRATIONS, INITIAL_REGISTRATIONS);
    const regsToDelete = allRegs.filter(r => r.studentId === id);
    regsToDelete.forEach(r => deleteFromFirestore('registrations', r.id));

    let regs = allRegs.filter(r => r.studentId !== id);
    saveItem(STORAGE_KEYS.REGISTRATIONS, regs);

    db.addAuditLog('Student Deleted', `Student record for ${student.name} (${student.matricNumber}) was deleted.`, 'Administrator');
    dbEvents.emit('students_updated', students);
    dbEvents.emit('registrations_updated', regs);
    return true;
  },

  // -------------------------------------------------------------
  // Lecturers
  // -------------------------------------------------------------
  getLecturers: (): LecturerProfile[] => {
    return loadItem<LecturerProfile[]>(STORAGE_KEYS.LECTURERS, INITIAL_LECTURERS);
  },
  getLecturerById: (id: string): LecturerProfile | undefined => {
    return db.getLecturers().find(l => l.id === id);
  },
  getLecturerByUserId: (userId: string): LecturerProfile | undefined => {
    const lecturers = db.getLecturers();
    let found = lecturers.find(l => l.userId === userId || l.id === userId);
    if (found) return found;

    const users = db.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      found = lecturers.find(l => l.email.toLowerCase() === user.email.toLowerCase());
      if (found) {
        found.userId = user.id;
        saveItem(STORAGE_KEYS.LECTURERS, lecturers);
        return found;
      }

      if (user.role === 'lecturer') {
        const allCourses = db.getCourses();
        const defaultCourseIds = allCourses.slice(0, 2).map(c => c.id);
        const newLecturer: LecturerProfile = {
          id: `lecturer_${user.id}`,
          userId: user.id,
          name: user.name || 'Lecturer Staff',
          email: user.email,
          staffId: `TPI/ST/2026/${Math.floor(100 + Math.random() * 900)}`,
          title: 'Dr.',
          department: 'Computer Science',
          phone: user.phone || '+234 800 000 0000',
          status: 'active',
          assignedCourseIds: defaultCourseIds,
          levelsTaking: ['HND II', 'ND II'],
          avatarUrl: user.avatarUrl,
        };

        lecturers.push(newLecturer);
        saveItem(STORAGE_KEYS.LECTURERS, lecturers);
        syncToFirestore('lecturers', newLecturer.id, newLecturer);
        return newLecturer;
      }
    }

    if (lecturers.length > 0) {
      return lecturers[0];
    }

    return undefined;
  },
  getLecturerByStaffId: (staffId: string): LecturerProfile | undefined => {
    return db.getLecturers().find(l => l.staffId.trim().toUpperCase() === staffId.trim().toUpperCase());
  },
  createLecturer: (profileData: Omit<LecturerProfile, 'id'>, password = 'password123'): LecturerProfile => {
    let user = db.getUserByEmail(profileData.email);
    if (!user) {
      user = db.createUser({
        id: profileData.userId, // Pass the Firebase UID if provided
        name: `${profileData.title} ${profileData.name}`,
        email: profileData.email,
        role: 'lecturer',
        phone: profileData.phone,
        status: 'active',
      });
    }

    const lecturers = db.getLecturers();
    
    // Strictly validate that courses are not already assigned to someone else
    const validatedCourseIds: string[] = [];
    if (profileData.assignedCourseIds && profileData.assignedCourseIds.length > 0) {
      profileData.assignedCourseIds.forEach(courseId => {
        const course = db.getCourseById(courseId);
        if (course && (!course.lecturerId || course.lecturerId === '')) {
          validatedCourseIds.push(courseId);
        }
      });
    }

    const newLecturer: LecturerProfile = {
      ...profileData,
      id: profileData.userId || `lecturer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      assignedCourseIds: validatedCourseIds,
    };

    lecturers.push(newLecturer);
    saveItem(STORAGE_KEYS.LECTURERS, lecturers);
    syncToFirestore('lecturers', newLecturer.id, newLecturer);

    // Update the courses to reflect the assigned lecturer and auto-enroll existing students
    if (newLecturer.assignedCourseIds && newLecturer.assignedCourseIds.length > 0) {
      const fullTitleName = `${newLecturer.title} ${newLecturer.name}`;
      newLecturer.assignedCourseIds.forEach(courseId => {
        db.updateCourse(courseId, { 
          lecturerId: newLecturer.id, 
          lecturerName: fullTitleName 
        });
      });

      const allStudents = db.getStudents();
      let studentsChanged = false;
      allStudents.forEach(s => {
        let studentUpdated = false;
        newLecturer.assignedCourseIds.forEach(cid => {
          if (!s.enrolledCourseIds.includes(cid)) {
            s.enrolledCourseIds.push(cid);
            studentUpdated = true;
            db.registerStudentForCourse(s.id, cid);
          }
        });
        if (studentUpdated) {
          studentsChanged = true;
          syncToFirestore('students', s.id, s);
        }
      });
      if (studentsChanged) {
        saveItem(STORAGE_KEYS.STUDENTS, allStudents);
        dbEvents.emit('students_updated', allStudents);
      }
    }

    db.addAuditLog('Lecturer Created', `New lecturer added: ${newLecturer.title} ${newLecturer.name} (${newLecturer.staffId}).`, 'Administrator');
    dbEvents.emit('lecturers_updated', lecturers);
    return newLecturer;
  },
  updateLecturer: (id: string, partial: Partial<LecturerProfile>): LecturerProfile | null => {
    const lecturers = db.getLecturers();
    const index = lecturers.findIndex(l => l.id === id);
    if (index === -1) return null;

    lecturers[index] = { ...lecturers[index], ...partial };
    saveItem(STORAGE_KEYS.LECTURERS, lecturers);
    syncToFirestore('lecturers', id, lecturers[index]);

    if (partial.name || partial.email || partial.phone || partial.title) {
      const fullTitleName = `${lecturers[index].title} ${lecturers[index].name}`;
      db.updateUser(lecturers[index].userId, {
        name: fullTitleName,
        ...(partial.email && { email: partial.email }),
        ...(partial.phone && { phone: partial.phone }),
      });
    }

    dbEvents.emit('lecturers_updated', lecturers);
    return lecturers[index];
  },
  deleteLecturer: (id: string): boolean => {
    let lecturers = db.getLecturers();
    const lecturer = lecturers.find(l => l.id === id);
    if (!lecturer) return false;

    lecturers = lecturers.filter(l => l.id !== id);
    saveItem(STORAGE_KEYS.LECTURERS, lecturers);
    deleteFromFirestore('lecturers', id);
    db.deleteUser(lecturer.userId);

    // Unassign courses
    const courses = db.getCourses();
    courses.forEach(c => {
      if (c.lecturerId === id) {
        db.updateCourse(c.id, { lecturerId: '', lecturerName: 'Unassigned' });
      }
    });

    db.addAuditLog('Lecturer Deleted', `Lecturer ${lecturer.title} ${lecturer.name} removed.`, 'Administrator');
    dbEvents.emit('lecturers_updated', lecturers);
    return true;
  },

  // -------------------------------------------------------------
  // Departments
  // -------------------------------------------------------------
  getDepartments: (): Department[] => {
    const depts = loadItem<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    const filtered = depts.filter(d => d.name === 'Computer Science' || d.code === 'CS');
    if (filtered.length !== depts.length) {
      saveItem(STORAGE_KEYS.DEPARTMENTS, filtered);
    }
    return filtered;
  },
  getDepartmentById: (id: string): Department | undefined => {
    return db.getDepartments().find(d => d.id === id);
  },
  getDepartmentByCode: (code: string): Department | undefined => {
    return db.getDepartments().find(d => d.code.toUpperCase() === code.toUpperCase());
  },
  createDepartment: (deptData: Omit<Department, 'id'>): Department => {
    const depts = db.getDepartments();
    const newDept: Department = {
      ...deptData,
      id: `dept_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    depts.push(newDept);
    saveItem(STORAGE_KEYS.DEPARTMENTS, depts);
    syncToFirestore('departments', newDept.id, newDept);
    db.addAuditLog('Department Created', `Department ${newDept.name} (${newDept.code}) added.`, 'Administrator');
    dbEvents.emit('departments_updated', depts);
    return newDept;
  },
  updateDepartment: (id: string, partial: Partial<Department>): Department | null => {
    const depts = db.getDepartments();
    const index = depts.findIndex(d => d.id === id);
    if (index === -1) return null;
    depts[index] = { ...depts[index], ...partial };
    saveItem(STORAGE_KEYS.DEPARTMENTS, depts);
    syncToFirestore('departments', id, depts[index]);
    dbEvents.emit('departments_updated', depts);
    return depts[index];
  },
  deleteDepartment: (id: string): boolean => {
    let depts = db.getDepartments();
    const initialLen = depts.length;
    depts = depts.filter(d => d.id !== id);
    if (depts.length !== initialLen) {
      saveItem(STORAGE_KEYS.DEPARTMENTS, depts);
      deleteFromFirestore('departments', id);
      dbEvents.emit('departments_updated', depts);
      return true;
    }
    return false;
  },

  // -------------------------------------------------------------
  // Courses
  // -------------------------------------------------------------
  getCourses: (): Course[] => {
    return loadItem<Course[]>(STORAGE_KEYS.COURSES, INITIAL_COURSES);
  },
  getCourseById: (id: string): Course | undefined => {
    return db.getCourses().find(c => c.id === id);
  },
  getCourseByCode: (code: string): Course | undefined => {
    return db.getCourses().find(c => c.code.replace(/\s+/g, '').toUpperCase() === code.replace(/\s+/g, '').toUpperCase());
  },
  getCoursesByLecturer: (lecturerId: string): Course[] => {
    const lecturer = db.getLecturerById(lecturerId) || db.getLecturerByUserId(lecturerId);
    const possibleIds = new Set([lecturerId, lecturer?.id, lecturer?.userId].filter(Boolean));
    return db.getCourses().filter(c => 
      possibleIds.has(c.lecturerId) || 
      (lecturer?.assignedCourseIds && lecturer.assignedCourseIds.includes(c.id))
    );
  },
  getCoursesByDepartment: (department: string): Course[] => {
    return db.getCourses().filter(c => c.department.toLowerCase() === department.toLowerCase());
  },
  getCoursesByLevel: (level: string): Course[] => {
    return db.getCourses().filter(c => c.level === level);
  },
  createCourse: (courseData: Omit<Course, 'id' | 'createdAt'>): Course => {
    const courses = db.getCourses();
    const newCourse: Course = {
      ...courseData,
      id: `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    courses.push(newCourse);
    saveItem(STORAGE_KEYS.COURSES, courses);
    syncToFirestore('courses', newCourse.id, newCourse);

    // Auto assign course to lecturer profile if specified
    if (newCourse.lecturerId) {
      const lecturer = db.getLecturerById(newCourse.lecturerId);
      if (lecturer && !lecturer.assignedCourseIds.includes(newCourse.id)) {
        db.updateLecturer(lecturer.id, {
          assignedCourseIds: [...lecturer.assignedCourseIds, newCourse.id],
        });
      }
    }

    db.addAuditLog('Course Created', `New course created: ${newCourse.code} - ${newCourse.title}.`, 'Administrator');
    dbEvents.emit('courses_updated', courses);
    return newCourse;
  },
  updateCourse: (id: string, partial: Partial<Course>): Course | null => {
    const courses = db.getCourses();
    const index = courses.findIndex(c => c.id === id);
    if (index === -1) return null;

    const oldCourse = courses[index];
    courses[index] = { ...courses[index], ...partial };
    saveItem(STORAGE_KEYS.COURSES, courses);
    syncToFirestore('courses', id, courses[index]);

    // Handle lecturer change
    if (partial.lecturerId && partial.lecturerId !== oldCourse.lecturerId) {
      const oldLecturer = db.getLecturerById(oldCourse.lecturerId);
      if (oldLecturer) {
        db.updateLecturer(oldLecturer.id, {
          assignedCourseIds: oldLecturer.assignedCourseIds.filter(cid => cid !== id),
        });
      }
      const newLecturer = db.getLecturerById(partial.lecturerId);
      if (newLecturer && !newLecturer.assignedCourseIds.includes(id)) {
        db.updateLecturer(newLecturer.id, {
          assignedCourseIds: [...newLecturer.assignedCourseIds, id],
        });
      }
    }

    dbEvents.emit('courses_updated', courses);
    return courses[index];
  },
  deleteCourse: (id: string): boolean => {
    let courses = db.getCourses();
    const course = courses.find(c => c.id === id);
    if (!course) return false;

    courses = courses.filter(c => c.id !== id);
    saveItem(STORAGE_KEYS.COURSES, courses);
    deleteFromFirestore('courses', id);

    // Cleanup registrations and purge from Firestore
    const allRegs = loadItem<CourseRegistration[]>(STORAGE_KEYS.REGISTRATIONS, INITIAL_REGISTRATIONS);
    const regsToDelete = allRegs.filter(r => r.courseId === id);
    regsToDelete.forEach(r => deleteFromFirestore('registrations', r.id));

    let regs = allRegs.filter(r => r.courseId !== id);
    saveItem(STORAGE_KEYS.REGISTRATIONS, regs);

    db.addAuditLog('Course Deleted', `Course ${course.code} - ${course.title} removed from system.`, 'Administrator');
    dbEvents.emit('courses_updated', courses);
    dbEvents.emit('registrations_updated', regs);
    return true;
  },

  // -------------------------------------------------------------
  // Course Registrations
  // -------------------------------------------------------------
  getRegistrations: (): CourseRegistration[] => {
    let regs = loadItem<CourseRegistration[]>(STORAGE_KEYS.REGISTRATIONS, INITIAL_REGISTRATIONS);
    const courses = db.getCourses();
    const validCourseIds = new Set(courses.map(c => c.id));
    const students = db.getStudents();
    const validStudentIds = new Set(students.map(s => s.id));

    // Filter out orphan registrations pointing to deleted courses or non-existent students
    const validRegs = regs.filter(r => validCourseIds.has(r.courseId) && validStudentIds.has(r.studentId));

    // If orphan registrations were detected, clean them up from local storage and Firestore
    if (validRegs.length !== regs.length) {
      const orphans = regs.filter(r => !validCourseIds.has(r.courseId) || !validStudentIds.has(r.studentId));
      orphans.forEach(o => deleteFromFirestore('registrations', o.id));
      saveItem(STORAGE_KEYS.REGISTRATIONS, validRegs);
    }

    return validRegs;
  },
  getStudentRegistrations: (studentId: string): CourseRegistration[] => {
    return db.getRegistrations().filter(r => r.studentId === studentId);
  },
  getCourseRegistrations: (courseId: string): CourseRegistration[] => {
    const validRegs = db.getRegistrations().filter(r => r.courseId === courseId);
    const activeStudentIds = new Set(db.getStudents().map(s => s.id));
    return validRegs.filter(r => activeStudentIds.has(r.studentId));
  },
  isStudentRegisteredForCourse: (studentId: string, courseId: string): boolean => {
    return db.getRegistrations().some(r => r.studentId === studentId && r.courseId === courseId);
  },
  registerStudentForCourse: (studentId: string, courseId: string): CourseRegistration | null => {
    const student = db.getStudentById(studentId);
    const course = db.getCourseById(courseId);
    if (!student || !course) return null;

    const registrations = db.getRegistrations();
    const exists = registrations.find(r => r.studentId === studentId && r.courseId === courseId);
    if (exists) return exists;

    const settings = db.getSettings();
    const newReg: CourseRegistration = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentId: student.id,
      matricNumber: student.matricNumber,
      courseId: course.id,
      courseCode: course.code,
      academicSession: course.academicSession || settings.currentAcademicSession,
      semester: course.semester || settings.currentSemester,
      registeredAt: getWATDateString(),
    };
    registrations.push(newReg);
    saveItem(STORAGE_KEYS.REGISTRATIONS, registrations);
    syncToFirestore('registrations', newReg.id, newReg);

    if (!student.enrolledCourseIds.includes(courseId)) {
      db.updateStudent(student.id, {
        enrolledCourseIds: [...student.enrolledCourseIds, courseId],
      });
    }

    dbEvents.emit('registrations_updated', registrations);
    return newReg;
  },
  unregisterStudentFromCourse: (studentId: string, courseId: string): boolean => {
    let registrations = db.getRegistrations();
    const initialLen = registrations.length;
    registrations = registrations.filter(r => !(r.studentId === studentId && r.courseId === courseId));
    if (registrations.length !== initialLen) {
      saveItem(STORAGE_KEYS.REGISTRATIONS, registrations);
      const student = db.getStudentById(studentId);
      if (student) {
        db.updateStudent(student.id, {
          enrolledCourseIds: student.enrolledCourseIds.filter(cid => cid !== courseId),
        });
      }
      dbEvents.emit('registrations_updated', registrations);
      return true;
    }
    return false;
  },

  // -------------------------------------------------------------
  // Attendance Sessions
  // -------------------------------------------------------------
  getSessions: (): AttendanceSession[] => {
    let sessions = loadItem<AttendanceSession[]>(STORAGE_KEYS.SESSIONS, INITIAL_SESSIONS);
    if (!isClosingExpired) {
      const now = Date.now();
      const expiredActiveSessions = sessions.filter(s => s.status === 'active' && s.expirationTime <= now);
      if (expiredActiveSessions.length > 0) {
        isClosingExpired = true;
        try {
          expiredActiveSessions.forEach(s => {
            db.closeSession(s.id);
          });
        } catch (err) {
          console.error("Error auto-closing expired sessions:", err);
        } finally {
          isClosingExpired = false;
        }
        sessions = loadItem<AttendanceSession[]>(STORAGE_KEYS.SESSIONS, INITIAL_SESSIONS);
      }
    }

    // Sort newest first
    return sessions.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.expirationTime;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.expirationTime;
      return timeB - timeA;
    });
  },
  getSessionById: (id: string): AttendanceSession | undefined => {
    return db.getSessions().find(s => s.id === id || s.sessionId === id);
  },
  getActiveSessions: (): AttendanceSession[] => {
    const now = Date.now();
    return db.getSessions().filter(s => s.status === 'active' && s.expirationTime > now);
  },
  getActiveSessionForCourse: (courseId: string): AttendanceSession | undefined => {
    const now = Date.now();
    return db.getSessions().find(s => s.courseId === courseId && s.status === 'active' && s.expirationTime > now);
  },
  createSession: (params: {
    courseId: string;
    lecturerId: string;
    durationMinutes: number;
    requiresLocation?: boolean;
  }): AttendanceSession => {
    const course = db.getCourseById(params.courseId);
    const lecturer = db.getLecturerById(params.lecturerId);
    if (!course || !lecturer) {
      throw new Error('Course or Lecturer not found');
    }

    // Auto-close any previous active session for this course
    const activeOld = db.getActiveSessionForCourse(params.courseId);
    if (activeOld) {
      db.closeSession(activeOld.id);
    }

    const sessions = db.getSessions();
    const now = Date.now();
    const durationMs = params.durationMinutes * 60 * 1000;
    const expirationTime = now + durationMs;
    const dateStr = getWATDateString();
    const startTimeStr = formatWATTime(now);

    const registeredStudents = db.getCourseRegistrations(params.courseId);
    const uniqueSessionToken = `TPI_STATIC_SESSION_${course.code.replace(/\s+/g, '')}_${Date.now()}`;
    const settings = db.getSettings();

    const newSession: AttendanceSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: `TPI-${course.code.replace(/\s+/g, '')}-${dateStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      lecturerId: lecturer.id,
      lecturerName: `${lecturer.title} ${lecturer.name}`,
      date: dateStr,
      startTime: startTimeStr,
      expirationTime,
      durationMinutes: params.durationMinutes,
      status: 'active',
      qrToken: uniqueSessionToken,
      requiresLocation: params.requiresLocation ?? settings.enableLocationVerification,
      allowedLatitude: settings.campusLatitude,
      allowedLongitude: settings.campusLongitude,
      radiusMeters: settings.maxLocationRadiusMeters,
      totalRegistered: registeredStudents.length,
      presentCount: 0,
      absentCount: 0,
      createdAt: new Date().toISOString(),
    };

    sessions.unshift(newSession);
    saveItem(STORAGE_KEYS.SESSIONS, sessions);
    syncToFirestore('sessions', newSession.id, newSession);

    // Notify registered students
    registeredStudents.forEach(reg => {
      const student = db.getStudentById(reg.studentId);
      if (student) {
        db.createNotification({
          userId: student.userId,
          role: 'student',
          title: `Attendance Active: ${course.code}`,
          message: `${course.code} (${course.title}) attendance is active for the next ${params.durationMinutes} minutes. Open your scanner now!`,
          type: 'info',
          link: '/student/scan',
        });
      }
    });

    // Broadcast notification to all students so it appears as the first notification immediately
    db.createNotification({
      userId: 'all',
      role: 'student',
      title: `🚨 Attendance Live: ${course.code}`,
      message: `${lecturer.title} ${lecturer.name} just started an attendance session for ${course.code} (${course.title}). Open your scanner now!`,
      type: 'info',
      link: '/student/scan',
    });

    // Notify hosting lecturer specifically
    db.createNotification({
      userId: lecturer.userId,
      role: 'lecturer',
      title: `Session Live: ${course.code}`,
      message: `Your live session for ${course.code} (${course.title}) has started and is active.`,
      type: 'info',
      link: '/lecturer/session',
    });

    db.addAuditLog('Attendance Started', `Lecturer ${lecturer.title} ${lecturer.name} started attendance for ${course.code} (${params.durationMinutes} mins).`, 'Lecturer');
    dbEvents.emit('session_created', newSession);
    dbEvents.emit('sessions_updated', sessions);
    return newSession;
  },
  closeSession: (sessionId: string): AttendanceSession | null => {
    const sessions = db.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId || s.sessionId === sessionId);
    if (index === -1) return null;

    const session = sessions[index];
    if (session.status === 'closed') return session;

    const endTimeStr = formatWATTime();
    session.status = 'closed';
    session.endTime = endTimeStr;
    session.closedAt = new Date().toISOString();

    const registered = db.getCourseRegistrations(session.courseId);
    const checkedInRecords = db.getRecordsForSession(session.id);
    const checkedInStudentIds = new Set(checkedInRecords.map(r => r.studentId));
    const records = db.getRecords();
    let absentCount = 0;

    registered.forEach(reg => {
      if (!checkedInStudentIds.has(reg.studentId)) {
        const student = db.getStudentById(reg.studentId);
        if (student) {
          const absentRecord: AttendanceRecord = {
            id: `rec_absent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            attendanceId: `ATT-${session.date.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
            sessionId: session.id,
            studentId: student.id,
            matricNumber: student.matricNumber,
            studentName: student.name,
            courseId: session.courseId,
            courseCode: session.courseCode,
            lecturerId: session.lecturerId,
            date: session.date,
            checkInTime: '—',
            status: 'ABSENT',
            createdAt: new Date().toISOString(),
          };
          records.push(absentRecord);
          syncToFirestore('records', absentRecord.id, absentRecord);
          absentCount++;

          db.createNotification({
            userId: student.userId,
            role: 'student',
            title: `Missed Class Attendance: ${session.courseCode}`,
            message: `You were marked ABSENT for ${session.courseCode} lecture on ${formatWATDate(session.date)}.`,
            type: 'warning',
          });
        }
      }
    });

    session.presentCount = checkedInRecords.length;
    session.absentCount = absentCount;
    session.totalRegistered = registered.length;

    saveItem(STORAGE_KEYS.RECORDS, records);
    saveItem(STORAGE_KEYS.SESSIONS, sessions);
    syncToFirestore('sessions', session.id, session);

    db.addAuditLog('Attendance Ended', `Session for ${session.courseCode} closed. Present: ${session.presentCount}, Absent: ${session.absentCount}.`, 'Lecturer');
    dbEvents.emit('session_closed', session);
    dbEvents.emit('sessions_updated', sessions);
    dbEvents.emit('records_updated', records);
    return session;
  },

  // -------------------------------------------------------------
  // Attendance Records & Scanning Logic
  // -------------------------------------------------------------
  getRecords: (): AttendanceRecord[] => {
    return loadItem<AttendanceRecord[]>(STORAGE_KEYS.RECORDS, INITIAL_RECORDS);
  },
  getRecordsForSession: (sessionId: string): AttendanceRecord[] => {
    return db.getRecords().filter(r => (r.sessionId === sessionId) && r.status === 'PRESENT');
  },
  getAllRecordsForSession: (sessionId: string): AttendanceRecord[] => {
    return db.getRecords().filter(r => r.sessionId === sessionId);
  },
  getRecordsForStudent: (studentId: string): AttendanceRecord[] => {
    return db.getRecords().filter(r => r.studentId === studentId);
  },
  getRecordsForCourse: (courseId: string): AttendanceRecord[] => {
    return db.getRecords().filter(r => r.courseId === courseId);
  },

  verifyAndRecordAttendance: (params: {
    qrRawValue: string;
    studentUserId: string;
    userLatitude?: number;
    userLongitude?: number;
  }): QRVerificationResult => {
    const student = db.getStudentByUserId(params.studentUserId);
    if (!student) {
      return {
        success: false,
        error: 'Student account not found or not logged in.',
        errorCode: 'NOT_LOGGED_IN',
      };
    }

    if (student.status === 'suspended') {
      return {
        success: false,
        error: 'Your student account has been suspended. Please contact administrator.',
        errorCode: 'NOT_LOGGED_IN',
      };
    }

    const token = params.qrRawValue.trim();
    if (!token) {
      return {
        success: false,
        error: 'Invalid attendance QR code.',
        errorCode: 'INVALID_TOKEN',
      };
    }

    const sessions = db.getSessions();
    const session = sessions.find(s => 
      s.qrToken === token || 
      token.includes(s.qrToken) || 
      token.includes(s.sessionId) ||
      (s.currentRollingToken && s.currentRollingToken === token)
    );

    if (!session) {
      return {
        success: false,
        error: 'Invalid attendance QR code or session not found.',
        errorCode: 'INVALID_TOKEN',
      };
    }

    if (session.status !== 'active') {
      return {
        success: false,
        error: 'This attendance session has already ended.',
        errorCode: 'SESSION_CLOSED',
        session,
      };
    }

    const now = Date.now();
    if (session.expirationTime <= now) {
      db.closeSession(session.id);
      return {
        success: false,
        error: 'This attendance QR code has expired.',
        errorCode: 'EXPIRED',
        session,
      };
    }

    const isRegistered = db.isStudentRegisteredForCourse(student.id, session.courseId);
    if (!isRegistered) {
      return {
        success: false,
        error: 'You are not registered for this course.',
        errorCode: 'NOT_REGISTERED',
        session,
      };
    }

    const existingRecords = db.getRecords();
    const compositeRecordId = `rec_${session.id}_${student.id}`;
    const alreadyAttended = existingRecords.find(
      r => r.id === compositeRecordId || (r.sessionId === session.id && r.studentId === student.id && r.status === 'PRESENT')
    );
    if (alreadyAttended) {
      return {
        success: false,
        error: 'You have already recorded attendance for this session! Duplicate scanning is not allowed.',
        errorCode: 'ALREADY_RECORDED',
        record: alreadyAttended,
        session,
      };
    }

    let locationVerified = false;
    let distanceMeters: number | undefined;

    if (session.requiresLocation && session.allowedLatitude && session.allowedLongitude) {
      if (params.userLatitude !== undefined && params.userLongitude !== undefined) {
        const R = 6371e3;
        const phi1 = (session.allowedLatitude * Math.PI) / 180;
        const phi2 = (params.userLatitude * Math.PI) / 180;
        const deltaPhi = ((params.userLatitude - session.allowedLatitude) * Math.PI) / 180;
        const deltaLambda = ((params.userLongitude - session.allowedLongitude) * Math.PI) / 180;

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceMeters = Math.round(R * c);

        const allowedRadius = session.radiusMeters || 150;
        if (distanceMeters > allowedRadius) {
          return {
            success: false,
            error: `You are outside the permitted lecture hall (${distanceMeters}m away, max ${allowedRadius}m allowed).`,
            errorCode: 'OUTSIDE_RADIUS',
            session,
          };
        }
        locationVerified = true;
      }
    }

    const checkInWAT = formatWATTime(now);
    const newRecord: AttendanceRecord = {
      id: compositeRecordId, // Unique composite key preventing write conflicts in Firestore
      attendanceId: `ATT-${session.date.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      sessionId: session.id,
      studentId: student.id,
      matricNumber: student.matricNumber,
      studentName: student.name,
      courseId: session.courseId,
      courseCode: session.courseCode,
      lecturerId: session.lecturerId,
      date: session.date,
      checkInTime: checkInWAT,
      status: 'PRESENT',
      locationVerified,
      distanceMeters,
      createdAt: new Date().toISOString(),
    };

    existingRecords.push(newRecord);
    saveItem(STORAGE_KEYS.RECORDS, existingRecords);
    syncToFirestore('records', newRecord.id, newRecord);

    const sessionIndex = sessions.findIndex(s => s.id === session.id);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].presentCount = (sessions[sessionIndex].presentCount || 0) + 1;
      saveItem(STORAGE_KEYS.SESSIONS, sessions);
      syncToFirestore('sessions', session.id, sessions[sessionIndex]);
    }

    db.createNotification({
      userId: student.userId,
      role: 'student',
      title: 'Attendance Recorded Successfully',
      message: `Your attendance for ${session.courseCode} (${session.courseTitle}) was verified at ${checkInWAT} WAT.`,
      type: 'success',
    });

    const lecturer = db.getLecturerById(session.lecturerId);
    if (lecturer) {
      db.createNotification({
        userId: lecturer.userId,
        role: 'lecturer',
        title: 'Student Checked In',
        message: `${student.name} (${student.matricNumber}) verified check-in for ${session.courseCode}.`,
        type: 'info',
      });
    }

    db.addAuditLog(
      'Attendance Recorded',
      `Student ${student.name} (${student.matricNumber}) verified for ${session.courseCode} at ${checkInWAT}.`,
      'Student'
    );

    dbEvents.emit('attendance_recorded', { record: newRecord, session });
    dbEvents.emit('records_updated', existingRecords);
    dbEvents.emit('sessions_updated', sessions);

    return {
      success: true,
      record: newRecord,
      session,
    };
  },

  recordAttendance: (
    sessionId: string,
    studentId: string,
    qrToken?: string,
    method: 'qr_scan' | 'manual' = 'manual',
    location?: { lat: number; lng: number },
    notes?: string
  ): AttendanceRecord => {
    const session = db.getSessionById(sessionId);
    const student = db.getStudentById(studentId);
    if (!session || !student) {
      throw new Error('Session or student not found.');
    }

    const existingRecords = db.getRecords();
    const compositeRecordId = `rec_${session.id}_${student.id}`;
    const existing = existingRecords.find(
      r => r.id === compositeRecordId || (r.sessionId === session.id && r.studentId === student.id && r.status === 'PRESENT')
    );
    if (existing) {
      return existing;
    }

    const checkInWAT = formatWATTime();
    const newRecord: AttendanceRecord = {
      id: compositeRecordId, // Unique composite key preventing write conflicts in Firestore
      attendanceId: `ATT-${session.date.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      sessionId: session.id,
      studentId: student.id,
      matricNumber: student.matricNumber,
      studentName: student.name,
      courseId: session.courseId,
      courseCode: session.courseCode,
      lecturerId: session.lecturerId,
      date: session.date,
      checkInTime: checkInWAT,
      status: 'PRESENT',
      locationVerified: true,
      createdAt: new Date().toISOString(),
    };

    existingRecords.push(newRecord);
    saveItem(STORAGE_KEYS.RECORDS, existingRecords);
    syncToFirestore('records', newRecord.id, newRecord);

    const sessions = db.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === session.id);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].presentCount = (sessions[sessionIndex].presentCount || 0) + 1;
      saveItem(STORAGE_KEYS.SESSIONS, sessions);
      syncToFirestore('sessions', session.id, sessions[sessionIndex]);
    }

    dbEvents.emit('attendance_recorded', { record: newRecord, session });
    dbEvents.emit('records_updated', existingRecords);
    dbEvents.emit('sessions_updated', sessions);
    return newRecord;
  },

  getActiveSessionByToken: (token: string): AttendanceSession | undefined => {
    const active = db.getActiveSessions();
    return active.find(
      s => s.qrToken === token || token.includes(s.qrToken) || (s.currentRollingToken && s.currentRollingToken === token)
    );
  },

  createAttendanceSession: (
    courseId: string,
    lecturerId: string,
    durationMinutes: number,
    venue?: string
  ): AttendanceSession => {
    return db.createSession({
      courseId,
      lecturerId,
      durationMinutes,
    });
  },

  registerStudentAsync: async (profileData: Partial<StudentProfile>, password = 'password123'): Promise<User> => {
    const uid = profileData.userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const studentLevel = profileData.level || 'HND II';
    const studentDept = profileData.department || 'Computer Science';
    const initialCourseIds = profileData.enrolledCourseIds && profileData.enrolledCourseIds.length > 0
      ? profileData.enrolledCourseIds
      : db.getMatchingCoursesForStudent(studentDept, studentLevel);

    // 1. Create / Update User
    const newUser: User = {
      id: uid,
      name: profileData.name || 'New Student',
      email: (profileData.email || 'student@polyibadan.edu.ng').toLowerCase().trim(),
      role: 'student',
      phone: profileData.phone || '+234 800 000 0000',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const users = db.getUsers();
    const existingUserIndex = users.findIndex(u => u.id === uid || u.email.toLowerCase() === newUser.email.toLowerCase());
    if (existingUserIndex >= 0) {
      users[existingUserIndex] = { ...users[existingUserIndex], ...newUser };
    } else {
      users.push(newUser);
    }
    saveItem(STORAGE_KEYS.USERS, users);

    // 2. Create / Update StudentProfile
    const newStudent: StudentProfile = {
      id: uid,
      userId: uid,
      name: profileData.name || 'New Student',
      matricNumber: (profileData.matricNumber || 'ND/CS/25/001').toUpperCase().trim(),
      email: (profileData.email || 'student@polyibadan.edu.ng').toLowerCase().trim(),
      phone: profileData.phone || '+234 800 000 0000',
      school: 'Faculty of Science & Computing',
      department: profileData.department || 'Computer Science',
      faculty: profileData.faculty || 'Science',
      programme: profileData.programme || (studentLevel.startsWith('ND') ? 'National Diploma' : 'Higher National Diploma'),
      level: studentLevel,
      academicSession: profileData.academicSession || '2025/2026',
      status: 'active',
      enrolledCourseIds: initialCourseIds,
      avatarUrl: profileData.avatarUrl,
    };

    const students = db.getStudents();
    const existingStudentIndex = students.findIndex(s => s.id === uid || s.userId === uid || s.email.toLowerCase() === newStudent.email.toLowerCase());
    if (existingStudentIndex >= 0) {
      students[existingStudentIndex] = { ...students[existingStudentIndex], ...newStudent };
    } else {
      students.push(newStudent);
    }
    saveItem(STORAGE_KEYS.STUDENTS, students);

    // 3. Create course registrations
    const newRegistrations: CourseRegistration[] = [];
    initialCourseIds.forEach(cid => {
      const reg = db.registerStudentForCourse(newStudent.id, cid);
      if (reg) newRegistrations.push(reg);
    });

    // 4. Direct Firestore sync in background (non-blocking for instant responsiveness)
    Promise.allSettled([
      syncToFirestore('users', uid, newUser),
      syncToFirestore('students', uid, newStudent),
      ...newRegistrations.map(reg => syncToFirestore('registrations', reg.id, reg))
    ]).catch(err => console.warn("Background student sync note:", err));

    db.addAuditLog('Student Registered', `New student registered: ${newStudent.name} (${newStudent.matricNumber}).`, 'System');
    dbEvents.emit('users_updated', users);
    dbEvents.emit('students_updated', students);
    return newUser;
  },

  registerStudent: (profileData: Partial<StudentProfile>, password = 'password123'): User => {
    const studentLevel = profileData.level || 'HND II';
    const studentDept = profileData.department || 'Computer Science';
    const initialCourseIds = profileData.enrolledCourseIds && profileData.enrolledCourseIds.length > 0
      ? profileData.enrolledCourseIds
      : db.getMatchingCoursesForStudent(studentDept, studentLevel);

    const newStudent = db.createStudent({
      userId: profileData.userId || '',
      name: profileData.name || 'New Student',
      matricNumber: profileData.matricNumber || 'ND/CS/25/001',
      email: profileData.email || 'student@polyibadan.edu.ng',
      phone: profileData.phone || '+234 800 000 0000',
      school: 'Faculty of Science & Computing',
      department: 'Computer Science',
      programme: profileData.programme || (studentLevel.startsWith('ND') ? 'National Diploma' : 'Higher National Diploma'),
      level: studentLevel,
      academicSession: profileData.academicSession || '2025/2026',
      status: 'active',
      enrolledCourseIds: initialCourseIds,
    }, password);

    return db.getUserById(newStudent.userId)!;
  },

  registerLecturerAsync: async (profileData: Partial<LecturerProfile>, password = 'password123'): Promise<User> => {
    const uid = profileData.userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const currentYear = new Date().getFullYear();
    const fullTitleName = `${profileData.title || 'Dr.'} ${profileData.name || 'New Lecturer'}`;

    // 1. Create / Update User
    const newUser: User = {
      id: uid,
      name: fullTitleName,
      email: (profileData.email || 'lecturer@staff.polyibadan.edu.ng').toLowerCase().trim(),
      role: 'lecturer',
      phone: profileData.phone || '+234 800 000 0000',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const users = db.getUsers();
    const existingUserIndex = users.findIndex(u => u.id === uid || u.email.toLowerCase() === newUser.email.toLowerCase());
    if (existingUserIndex >= 0) {
      users[existingUserIndex] = { ...users[existingUserIndex], ...newUser };
    } else {
      users.push(newUser);
    }
    saveItem(STORAGE_KEYS.USERS, users);

    // 2. Create / Update LecturerProfile
    const assignedCourses = profileData.assignedCourseIds || [];
    const newLecturer: LecturerProfile = {
      id: uid,
      userId: uid,
      name: profileData.name || 'New Lecturer',
      staffId: (profileData.staffId || `TPI/ST/${currentYear}/${Math.floor(100 + Math.random() * 900)}`).toUpperCase().trim(),
      email: (profileData.email || 'lecturer@staff.polyibadan.edu.ng').toLowerCase().trim(),
      phone: profileData.phone || '+234 800 000 0000',
      department: profileData.department || 'Computer Science',
      title: profileData.title || 'Dr.',
      status: 'active',
      assignedCourseIds: assignedCourses,
      levelsTaking: profileData.levelsTaking || [],
      avatarUrl: profileData.avatarUrl,
    };

    const lecturers = db.getLecturers();
    const existingLecturerIndex = lecturers.findIndex(l => l.id === uid || l.userId === uid || l.email.toLowerCase() === newLecturer.email.toLowerCase());
    if (existingLecturerIndex >= 0) {
      lecturers[existingLecturerIndex] = { ...lecturers[existingLecturerIndex], ...newLecturer };
    } else {
      lecturers.push(newLecturer);
    }
    saveItem(STORAGE_KEYS.LECTURERS, lecturers);

    // 3. Direct Firestore sync in background (non-blocking for instant responsiveness)
    Promise.allSettled([
      syncToFirestore('users', uid, newUser),
      syncToFirestore('lecturers', uid, newLecturer),
      ...assignedCourses.map(async cid => {
        db.updateCourse(cid, { lecturerId: newLecturer.id, lecturerName: fullTitleName });
        const updatedCourse = db.getCourseById(cid);
        if (updatedCourse) {
          await syncToFirestore('courses', cid, updatedCourse);
        }
      })
    ]).catch(err => console.warn("Background lecturer sync note:", err));

    // Auto-enroll all existing students in the lecturer's assigned courses
    if (assignedCourses.length > 0) {
      const allStudents = db.getStudents();
      let studentsChanged = false;
      allStudents.forEach(s => {
        let studentUpdated = false;
        assignedCourses.forEach(cid => {
          if (!s.enrolledCourseIds.includes(cid)) {
            s.enrolledCourseIds.push(cid);
            studentUpdated = true;
            db.registerStudentForCourse(s.id, cid);
          }
        });
        if (studentUpdated) {
          studentsChanged = true;
          syncToFirestore('students', s.id, s);
        }
      });
      if (studentsChanged) {
        saveItem(STORAGE_KEYS.STUDENTS, allStudents);
        dbEvents.emit('students_updated', allStudents);
      }
    }

    db.addAuditLog('Lecturer Registered', `New academic staff registered: ${fullTitleName} (${newLecturer.staffId}).`, 'System');
    dbEvents.emit('users_updated', users);
    dbEvents.emit('lecturers_updated', lecturers);
    return newUser;
  },

  registerAdminAsync: async (adminData: { name: string; email: string; phone?: string; staffId?: string; designation?: string; userId?: string }, password = 'password123'): Promise<User> => {
    const uid = adminData.userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const currentYear = new Date().getFullYear();
    const adminStaffId = (adminData.staffId || `TPI/ADM/${currentYear}/${Math.floor(100 + Math.random() * 900)}`).toUpperCase().trim();

    const newUser: User = {
      id: uid,
      name: adminData.name || 'System Administrator',
      email: (adminData.email || 'admin@polyibadan.edu.ng').toLowerCase().trim(),
      role: 'admin',
      phone: adminData.phone || '+234 800 000 0000',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const users = db.getUsers();
    const existingIndex = users.findIndex(u => u.id === uid || u.email.toLowerCase() === newUser.email.toLowerCase());
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...newUser };
    } else {
      users.push(newUser);
    }
    saveItem(STORAGE_KEYS.USERS, users);

    Promise.allSettled([
      syncToFirestore('users', uid, newUser)
    ]).catch(err => console.warn("Background admin sync note:", err));

    db.addAuditLog('Admin Registered', `New administrator account created: ${newUser.name} (${adminData.designation || 'System Overseer'} - ${adminStaffId}).`, 'System');
    dbEvents.emit('users_updated', users);
    return newUser;
  },

  registerLecturer: (profileData: Partial<LecturerProfile>, password = 'password123'): User => {
    const currentYear = new Date().getFullYear();
    const newLecturer = db.createLecturer({
      userId: profileData.userId || '',
      name: profileData.name || 'New Lecturer',
      staffId: profileData.staffId || `TPI/ST/${currentYear}/${Math.floor(100 + Math.random() * 900)}`,
      email: profileData.email || 'lecturer@staff.polyibadan.edu.ng',
      phone: profileData.phone || '+234 800 000 0000',
      department: profileData.department || 'Computer Science',
      title: profileData.title || 'Dr.',
      status: 'active',
      assignedCourseIds: profileData.assignedCourseIds || [],
      levelsTaking: profileData.levelsTaking || [],
    });

    return db.getUserById(newLecturer.userId)!;
  },

  // -------------------------------------------------------------
  // Attendance Calculations & Statistics
  // -------------------------------------------------------------
  getStudentAttendanceStats: (studentId: string) => {
    const student = db.getStudentById(studentId);
    if (!student) {
      return {
        totalCourses: 0,
        totalClassesAttended: 0,
        totalClassesMissed: 0,
        totalSessions: 0,
        overallAttendanceRate: 0,
        coursesStats: [],
      };
    }

    const registrations = db.getStudentRegistrations(studentId);
    const registeredCourseIds = new Set(registrations.map(r => r.courseId));
    const allSessions = db.getSessions();
    const allRecords = db.getRecords();

    const coursesStats = Array.from(registeredCourseIds).map(courseId => {
      const course = db.getCourseById(courseId);
      const courseSessions = allSessions.filter(s => s.courseId === courseId);
      const attendedCount = allRecords.filter(
        r => r.courseId === courseId && r.studentId === studentId && r.status === 'PRESENT'
      ).length;
      const missedCount = allRecords.filter(
        r => r.courseId === courseId && r.studentId === studentId && r.status === 'ABSENT'
      ).length;
      
      const totalCourseClasses = courseSessions.length || (attendedCount + missedCount);
      const percentage = totalCourseClasses > 0 ? Math.round((attendedCount / totalCourseClasses) * 100) : 100;

      return {
        courseId,
        courseCode: course?.code || 'Unknown',
        courseTitle: course?.title || 'Unknown Course',
        units: course?.units || 3,
        attendedCount,
        missedCount,
        totalSessions: totalCourseClasses,
        percentage,
        isWarning: percentage < 75 && totalCourseClasses > 0,
      };
    });

    const totalClassesAttended = coursesStats.reduce((sum, c) => sum + c.attendedCount, 0);
    const totalClassesMissed = coursesStats.reduce((sum, c) => sum + c.missedCount, 0);
    const totalSessions = totalClassesAttended + totalClassesMissed;
    const overallAttendanceRate = totalSessions > 0 ? Math.round((totalClassesAttended / totalSessions) * 100) : 100;

    return {
      totalCourses: registeredCourseIds.size,
      totalClassesAttended,
      totalClassesMissed,
      totalSessions,
      overallAttendanceRate,
      coursesStats,
    };
  },

  getLecturerAttendanceStats: (lecturerId: string) => {
    const courses = db.getCoursesByLecturer(lecturerId);
    const courseIds = new Set(courses.map(c => c.id));
    const sessions = db.getSessions().filter(s => courseIds.has(s.courseId));
    const records = db.getRecords().filter(r => courseIds.has(r.courseId) && r.status === 'PRESENT');
    const now = Date.now();
    const activeSessions = sessions.filter(s => s.status === 'active' && s.expirationTime > now);
    
    const activeStudents = db.getStudents().filter(s => s.status !== 'suspended');
    const registeredStudentIds = new Set<string>();

    // 1. Direct registrations
    const allRegistrations = db.getRegistrations().filter(r => courseIds.has(r.courseId));
    allRegistrations.forEach(r => {
      const student = activeStudents.find(s => s.id === r.studentId || s.userId === r.studentId);
      if (student) {
        registeredStudentIds.add(student.id);
      }
    });

    // 2. Student profile enrolledCourseIds (with auto-sync)
    activeStudents.forEach(s => {
      const enrolled = s.enrolledCourseIds || [];
      if (enrolled.some(cid => courseIds.has(cid))) {
        registeredStudentIds.add(s.id);
        enrolled.forEach(cid => {
          if (courseIds.has(cid) && !db.isStudentRegisteredForCourse(s.id, cid)) {
            db.registerStudentForCourse(s.id, cid);
          }
        });
      }
    });

    const totalPossibleAttendances = sessions.reduce((sum, s) => sum + (s.totalRegistered || 0), 0);
    const totalPresent = records.length;
    const attendanceRate = totalPossibleAttendances > 0 
      ? Math.round((totalPresent / totalPossibleAttendances) * 100) 
      : 88;

    return {
      totalCourses: courses.length,
      todaysClasses: sessions.filter(s => s.date === getWATDateString()).length,
      activeSessions: activeSessions.length,
      totalStudents: registeredStudentIds.size,
      attendanceRate,
      courses,
      sessions,
    };
  },

  getAdminDashboardStats: (): any => {
    const students = db.getStudents();
    const lecturers = db.getLecturers();
    const courses = db.getCourses();
    const departments = db.getDepartments();
    const sessions = db.getSessions();
    const records = db.getRecords().filter(r => r.status === 'PRESENT');
    const auditLogs = db.getAuditLogs();
    const settings = db.getSettings();

    const today = getWATDateString();
    const todaysAttendanceCount = records.filter(r => r.date === today).length;
    const activeSessionsCount = db.getActiveSessions().length;

    const totalPossible = sessions.reduce((sum, s) => sum + (s.totalRegistered || 0), 0);
    const overallRate = totalPossible > 0 ? Math.round((records.length / totalPossible) * 100) : 85;

    const departmentBreakdown = departments.map(d => {
      const deptStudents = students.filter(s => s.department === d.name);
      const deptCourses = courses.filter(c => c.department === d.name);
      const deptCourseIds = new Set(deptCourses.map(c => c.id));
      const deptSessions = sessions.filter(s => deptCourseIds.has(s.courseId));
      const deptRecords = records.filter(r => deptCourseIds.has(r.courseId));
      const possible = deptSessions.reduce((sum, s) => sum + (s.totalRegistered || 0), 0);
      const rate = possible > 0 ? Math.round((deptRecords.length / possible) * 100) : 86;

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        faculty: d.faculty,
        studentCount: deptStudents.length,
        courseCount: deptCourses.length,
        avgAttendanceRate: rate,
      };
    });

    return {
      totalStudents: students.length,
      totalLecturers: lecturers.length,
      totalCourses: courses.length,
      totalDepartments: departments.length,
      todaysAttendance: todaysAttendanceCount,
      activeSessions: activeSessionsCount,
      systemAttendanceRate: overallRate,
      systemTimezone: settings.systemTimezone || 'West Africa Time (WAT / UTC+1)',
      departmentBreakdown,
      students,
      lecturers,
      courses,
      departments,
      recentAuditLogs: auditLogs.slice(0, 50),
    };
  },

  getAdminStats: (): any => {
    const students = db.getStudents();
    const lecturers = db.getLecturers();
    const courses = db.getCourses();
    const departments = db.getDepartments();
    const sessions = db.getSessions();
    const records = db.getRecords().filter(r => r.status === 'PRESENT');
    
    const today = getWATDateString();
    const todaysAttendanceCount = records.filter(r => r.date === today).length;
    const activeSessionsCount = db.getActiveSessions().length;

    const totalPossible = sessions.reduce((sum, s) => sum + (s.totalRegistered || 0), 0);
    const overallRate = totalPossible > 0 ? Math.round((records.length / totalPossible) * 100) : 85;

    return {
      totalStudents: students.length,
      totalLecturers: lecturers.length,
      totalCourses: courses.length,
      totalDepartments: departments.length,
      todaysAttendance: todaysAttendanceCount,
      activeSessions: activeSessionsCount,
      overallAttendanceRate: overallRate,
    };
  },

  // -------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------
  getNotifications: (userId?: string, role?: string): Promise<AppNotification[]> & AppNotification[] => {
    const allNotifs = loadItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    let filtered = allNotifs;
    if (userId || role) {
      filtered = allNotifs.filter(n => {
        // 1. Strict Role Boundary: if notification specifies a role, user role MUST match
        if (n.role && n.role !== 'all' && role && n.role !== role) {
          return false;
        }

        // 2. Strict User Account Boundary: if notification is assigned to a specific userId, user ID MUST match
        if (n.userId && n.userId !== 'all') {
          return n.userId === userId;
        }

        return true;
      });
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    // Make return value both an Array and a Promise so synchronous callers and .then() callers work seamlessly!
    const promise = Promise.resolve(filtered) as any;
    Object.assign(promise, filtered);
    // Provide array methods and iterators on promise so spread operators and Array.from work seamlessly
    promise.filter = (fn: any) => filtered.filter(fn);
    promise.map = (fn: any) => filtered.map(fn);
    promise.length = filtered.length;
    if (typeof (filtered as any)[Symbol.iterator] === 'function') {
      promise[Symbol.iterator] = (filtered as any)[Symbol.iterator].bind(filtered);
    }
    return promise;
  },
  createNotification: (data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification => {
    const notifs = loadItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const newNotif: AppNotification = {
      ...data,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    notifs.unshift(newNotif);
    saveItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
    syncToFirestore('notifications', newNotif.id, newNotif);
    dbEvents.emit('notifications_updated');
    return newNotif;
  },
  markNotificationRead: (id: string): void => {
    const notifs = loadItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const item = notifs.find(n => n.id === id);
    if (item) {
      item.read = true;
      saveItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
      syncToFirestore('notifications', id, { read: true });
      dbEvents.emit('notifications_updated');
    }
  },
  markAllNotificationsRead: (userId?: string, role?: string): void => {
    const notifs = loadItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    notifs.forEach(n => {
      const matchesRole = !n.role || n.role === 'all' || (role && n.role === role);
      const matchesUser = !n.userId || n.userId === 'all' || (userId && n.userId === userId);
      if (matchesRole && matchesUser) {
        n.read = true;
        syncToFirestore('notifications', n.id, { read: true });
      }
    });
    saveItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
    dbEvents.emit('notifications_updated');
  },

  // -------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------
  getAuditLogs: (): AuditLog[] => {
    return loadItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },
  addAuditLog: (action: string, details: string, userRole = 'System'): AuditLog => {
    const currentUser = db.getCurrentUser();
    const logs = db.getAuditLogs();
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      performedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'System',
      userRole: currentUser ? currentUser.role : userRole,
      details,
    };
    logs.unshift(newLog);
    saveItem(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 100)); // Keep recent 100
    syncToFirestore('audit_logs', newLog.id, newLog);
    dbEvents.emit('audit_logs_updated');
    return newLog;
  },

  // Seed sample institutional data into local storage and sync directly to Firestore
  seedSampleDataAsync: async (): Promise<{ studentsCount: number; lecturersCount: number; coursesCount: number; departmentsCount: number }> => {
    const sampleDepts: Department[] = [
      {
        id: 'dept_cs',
        name: 'Computer Science',
        code: 'CS',
        faculty: 'Faculty of Science & Technology',
        programmes: ['National Diploma', 'Higher National Diploma'],
        headOfDepartment: 'Dr. O. R. Sunday',
      },
      {
        id: 'dept_eee',
        name: 'Electrical & Electronics Engineering',
        code: 'EEE',
        faculty: 'Faculty of Engineering',
        programmes: ['National Diploma', 'Higher National Diploma'],
        headOfDepartment: 'Engr. M. Adebayo',
      },
      {
        id: 'dept_slt',
        name: 'Science Laboratory Technology',
        code: 'SLT',
        faculty: 'Faculty of Science & Technology',
        programmes: ['National Diploma', 'Higher National Diploma'],
        headOfDepartment: 'Dr. (Mrs) F. A. Ogun',
      }
    ];

    const sampleCourses: Course[] = [
      {
        id: 'course_com311',
        code: 'COM 311',
        title: 'Operating Systems I',
        department: 'Computer Science',
        level: 'HND I',
        semester: 'First Semester',
        units: 3,
        lecturerId: 'user_lecturer_1',
        lecturerName: 'Dr. Sunday OLATUNJI',
        academicSession: '2025/2026',
      },
      {
        id: 'course_com312',
        code: 'COM 312',
        title: 'Database Design I',
        department: 'Computer Science',
        level: 'HND I',
        semester: 'First Semester',
        units: 3,
        lecturerId: 'user_lecturer_1',
        lecturerName: 'Dr. Sunday OLATUNJI',
        academicSession: '2025/2026',
      },
      {
        id: 'course_com411',
        code: 'COM 411',
        title: 'Software Engineering',
        department: 'Computer Science',
        level: 'HND II',
        semester: 'First Semester',
        units: 4,
        lecturerId: 'user_lecturer_1',
        lecturerName: 'Dr. Sunday OLATUNJI',
        academicSession: '2025/2026',
      },
      {
        id: 'course_com412',
        code: 'COM 412',
        title: 'Computer Architecture',
        department: 'Computer Science',
        level: 'HND II',
        semester: 'First Semester',
        units: 3,
        lecturerId: 'user_lecturer_2',
        lecturerName: 'Engr. Michael ADEBAYO',
        academicSession: '2025/2026',
      }
    ];

    const lecturer1User: User = {
      id: 'user_lecturer_1',
      name: 'Dr. Sunday OLATUNJI',
      email: 's.olatunji@staff.polyibadan.edu.ng',
      role: 'lecturer',
      status: 'active',
      createdAt: new Date().toISOString(),
      phone: '+234 803 111 2233',
    };
    const lecturer1Profile: LecturerProfile = {
      id: 'lecturer_1',
      userId: 'user_lecturer_1',
      name: 'Dr. Sunday OLATUNJI',
      email: 's.olatunji@staff.polyibadan.edu.ng',
      staffId: 'TPI/ST/2026/010',
      title: 'Dr.',
      department: 'Computer Science',
      phone: '+234 803 111 2233',
      status: 'active',
      assignedCourseIds: ['course_com311', 'course_com312', 'course_com411'],
      levelsTaking: ['HND I', 'HND II'],
    };

    const lecturer2User: User = {
      id: 'user_lecturer_2',
      name: 'Engr. Michael ADEBAYO',
      email: 'm.adebayo@staff.polyibadan.edu.ng',
      role: 'lecturer',
      status: 'active',
      createdAt: new Date().toISOString(),
      phone: '+234 802 444 5566',
    };
    const lecturer2Profile: LecturerProfile = {
      id: 'lecturer_2',
      userId: 'user_lecturer_2',
      name: 'Engr. Michael ADEBAYO',
      email: 'm.adebayo@staff.polyibadan.edu.ng',
      staffId: 'TPI/ST/2026/012',
      title: 'Engr.',
      department: 'Computer Science',
      phone: '+234 802 444 5566',
      status: 'active',
      assignedCourseIds: ['course_com411', 'course_com412'],
      levelsTaking: ['HND II'],
    };

    const student1User: User = {
      id: 'user_student_1',
      name: 'ADEWALE John Babatunde',
      email: 'j.adewale@polyibadan.edu.ng',
      role: 'student',
      status: 'active',
      createdAt: new Date().toISOString(),
      phone: '+234 810 555 6677',
    };
    const student1Profile: StudentProfile = {
      id: 'student_1',
      userId: 'user_student_1',
      name: 'ADEWALE John Babatunde',
      email: 'j.adewale@polyibadan.edu.ng',
      matricNumber: 'ND/CS/25/001',
      school: 'School of Science & Technology',
      department: 'Computer Science',
      programme: 'Higher National Diploma',
      level: 'HND II',
      academicSession: '2025/2026',
      phone: '+234 810 555 6677',
      status: 'active',
      enrolledCourseIds: ['course_com411', 'course_com412'],
    };

    const student2User: User = {
      id: 'user_student_2',
      name: 'OGUNLEYE Blessing Toyin',
      email: 'b.ogunleye@polyibadan.edu.ng',
      role: 'student',
      status: 'active',
      createdAt: new Date().toISOString(),
      phone: '+234 813 888 9900',
    };
    const student2Profile: StudentProfile = {
      id: 'student_2',
      userId: 'user_student_2',
      name: 'OGUNLEYE Blessing Toyin',
      email: 'b.ogunleye@polyibadan.edu.ng',
      matricNumber: 'ND/CS/25/002',
      school: 'School of Science & Technology',
      department: 'Computer Science',
      programme: 'Higher National Diploma',
      level: 'HND II',
      academicSession: '2025/2026',
      phone: '+234 813 888 9900',
      status: 'active',
      enrolledCourseIds: ['course_com411', 'course_com412'],
    };

    const student3User: User = {
      id: 'user_student_3',
      name: 'IBEKWE Emmanuel Chukwuemeka',
      email: 'e.ibekwe@polyibadan.edu.ng',
      role: 'student',
      status: 'active',
      createdAt: new Date().toISOString(),
      phone: '+234 814 111 3344',
    };
    const student3Profile: StudentProfile = {
      id: 'student_3',
      userId: 'user_student_3',
      name: 'IBEKWE Emmanuel Chukwuemeka',
      email: 'e.ibekwe@polyibadan.edu.ng',
      matricNumber: 'ND/CS/25/003',
      school: 'School of Science & Technology',
      department: 'Computer Science',
      programme: 'National Diploma',
      level: 'ND II',
      academicSession: '2025/2026',
      phone: '+234 814 111 3344',
      status: 'active',
      enrolledCourseIds: ['course_com311', 'course_com312'],
    };

    const currentUsers = db.getUsers();
    const currentStudents = db.getStudents();
    const currentLecturers = db.getLecturers();
    const currentCourses = db.getCourses();
    const currentDepts = db.getDepartments();

    const newUsers = [...currentUsers];
    [lecturer1User, lecturer2User, student1User, student2User, student3User].forEach(u => {
      if (!newUsers.some(existing => existing.id === u.id || existing.email === u.email)) {
        newUsers.push(u);
        syncToFirestore('users', u.id, u);
      }
    });
    saveItem(STORAGE_KEYS.USERS, newUsers);

    const newStudents = [...currentStudents];
    [student1Profile, student2Profile, student3Profile].forEach(s => {
      if (!newStudents.some(existing => existing.id === s.id || existing.email === s.email)) {
        newStudents.push(s);
        syncToFirestore('students', s.id, s);
      }
    });
    saveItem(STORAGE_KEYS.STUDENTS, newStudents);

    const newLecturers = [...currentLecturers];
    [lecturer1Profile, lecturer2Profile].forEach(l => {
      if (!newLecturers.some(existing => existing.id === l.id || existing.email === l.email)) {
        newLecturers.push(l);
        syncToFirestore('lecturers', l.id, l);
      }
    });
    saveItem(STORAGE_KEYS.LECTURERS, newLecturers);

    const newCourses = [...currentCourses];
    sampleCourses.forEach(c => {
      if (!newCourses.some(existing => existing.id === c.id || existing.code === c.code)) {
        newCourses.push(c);
        syncToFirestore('courses', c.id, c);
      }
    });
    saveItem(STORAGE_KEYS.COURSES, newCourses);

    const newDepts = [...currentDepts];
    sampleDepts.forEach(d => {
      if (!newDepts.some(existing => existing.id === d.id || existing.code === d.code)) {
        newDepts.push(d);
        syncToFirestore('departments', d.id, d);
      }
    });
    saveItem(STORAGE_KEYS.DEPARTMENTS, newDepts);

    dbEvents.emit('users_updated');
    dbEvents.emit('students_updated');
    dbEvents.emit('lecturers_updated');
    dbEvents.emit('courses_updated');
    dbEvents.emit('departments_updated');

    return {
      studentsCount: newStudents.length,
      lecturersCount: newLecturers.length,
      coursesCount: newCourses.length,
      departmentsCount: newDepts.length,
    };
  },
};
