import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { PolyLogo } from '../common/PolyLogo';
import { UserRole, StudentProfile, Course } from '../../types';
import { db, dbEvents } from '../../services/db';
import {
  GraduationCap,
  BookOpen,
  Shield,
  Lock,
  Mail,
  User,
  Phone,
  Building,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginPageProps {
  initialRole?: UserRole;
  initialMode?: 'login' | 'register';
  onLoginSuccess: (userId: string) => void;
  onBackToLanding: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialRole = 'student',
  initialMode = 'login',
  onLoginSuccess,
  onBackToLanding,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [isRegistering, setIsRegistering] = useState(initialMode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Student Registration Form States
  const [registerRole, setRegisterRole] = useState<'student' | 'lecturer' | 'admin'>('student');
  const [fullName, setFullName] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [programme, setProgramme] = useState('Higher National Diploma');
  const [level, setLevel] = useState('HND II');
  const [academicSession, setAcademicSession] = useState('2025/2026');

  // Lecturer & Admin Registration Specific States
  const [lecturerTitle, setLecturerTitle] = useState('Dr.');
  const [lecturerStaffId, setLecturerStaffId] = useState('');
  const [adminStaffId, setAdminStaffId] = useState('');
  const [adminDesignation, setAdminDesignation] = useState('System Administrator');
  const [lecturerLevels, setLecturerLevels] = useState<string[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [showCustomCourseInput, setShowCustomCourseInput] = useState(false);
  const [customCourseCode, setCustomCourseCode] = useState('');
  const [customCourseTitle, setCustomCourseTitle] = useState('');
  const [customCourseUnits, setCustomCourseUnits] = useState(3);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);

  useEffect(() => {
    const loadCourses = () => {
      setAvailableCourses(db.getCourses().filter(c => 
        c.department === 'Computer Science' && (!c.lecturerId || c.lecturerId === '')
      ));
    };
    loadCourses();
    const unsub = dbEvents.on('courses_updated', loadCourses);
    return () => unsub();
  }, []);

  const departments = db.getDepartments();

  // Toggle course for lecturer
  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  // Group all unassigned courses by level
  const levels = ['ND I', 'ND II', 'HND I', 'HND II'];

  // Toggle level for lecturer
  const toggleLecturerLevel = (lvl: string) => {
    setLecturerLevels(prev => {
      const exists = prev.includes(lvl);
      const updated = exists ? prev.filter(l => l !== lvl) : [...prev, lvl];
      return updated;
    });
  };

  // Courses filtered by lecturer's selected levels
  const filteredCoursesForLecturer = availableCourses.filter(c => 
    lecturerLevels.length === 0 || lecturerLevels.includes(c.level)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      let user = db.getUserByEmail(trimmedEmail);

      // Check if user entered matric number or staff ID instead of email
      if (!user) {
        const studentByMatric = db.getStudentByMatric(trimmedEmail);
        if (studentByMatric) {
          user = db.getUserById(studentByMatric.userId);
        } else {
          const lecturerByStaff = db.getLecturers().find(l => l.staffId.toUpperCase() === trimmedEmail.toUpperCase());
          if (lecturerByStaff) {
            user = db.getUserById(lecturerByStaff.userId);
          }
        }
      }

      // STRICT CHECK: Unregistered users CANNOT log in!
      if (!user) {
        setIsSubmitting(false);
        setError('Account not found in official register. You must register your account first before logging in.');
        return;
      }

      if (user.role !== selectedRole) {
        setIsSubmitting(false);
        setError(`This account is registered as a ${user.role.toUpperCase()}. Please select the ${user.role} tab above.`);
        return;
      }

      if (user.status === 'suspended') {
        setIsSubmitting(false);
        setError('Your account has been suspended. Please contact the administrator.');
        return;
      }

      db.setActiveUserId(user.id);
      onLoginSuccess(user.id);

      setTimeout(() => {
        signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword).catch(() => {});
        db.syncToFirestore('users', user.id, user);
      }, 30);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please complete all required fields.');
      return;
    }

    if (registerRole === 'student') {
      if (!matricNumber.trim()) {
        setError('Please provide your Polytechnic Ibadan matriculation number.');
        return;
      }
    } else if (registerRole === 'lecturer') {
      if (!lecturerStaffId.trim()) {
        setError('Please provide your institutional Staff Identification Number.');
        return;
      }
    } else {
      if (!adminStaffId.trim()) {
        setError('Please provide your Admin Officer Staff ID.');
        return;
      }
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existingEmail = db.getUserByEmail(trimmedEmail);
    if (existingEmail) {
      db.setActiveUserId(existingEmail.id);
      onLoginSuccess(existingEmail.id);
      return;
    }

    try {
      const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      let createdUser;

      if (registerRole === 'student') {
        const studentLevel = level || 'HND II';
        createdUser = await db.registerStudentAsync({
          userId: uid,
          name: fullName.trim(),
          email: trimmedEmail,
          matricNumber: matricNumber.trim().toUpperCase(),
          department: 'Computer Science',
          programme: programme,
          level: studentLevel,
          academicSession: academicSession,
          phone: phone.trim() || '+234 800 000 0000',
        }, password.trim());
      } else if (registerRole === 'lecturer') {
        createdUser = await db.registerLecturerAsync({
          userId: uid,
          name: fullName.trim(),
          email: trimmedEmail,
          staffId: lecturerStaffId.trim().toUpperCase(),
          title: lecturerTitle || 'Dr.',
          phone: phone.trim() || '+234 800 000 0000',
          department: 'Computer Science',
          assignedCourseIds: selectedCourseIds,
          levelsTaking: lecturerLevels
        }, password.trim());
      } else {
        createdUser = await db.registerAdminAsync({
          userId: uid,
          name: fullName.trim(),
          email: trimmedEmail,
          staffId: adminStaffId.trim().toUpperCase(),
          designation: adminDesignation.trim() || 'System Administrator',
          phone: phone.trim() || '+234 800 000 0000',
        }, password.trim());
      }
      
      // Navigate to home page IMMEDIATELY (0 delay)
      db.setActiveUserId(createdUser.id);
      onLoginSuccess(createdUser.id);

      // Background cloud auth and sync
      setTimeout(() => {
        createUserWithEmailAndPassword(auth, trimmedEmail, password.trim()).catch(() => {});
        db.syncToFirestore('users', createdUser.id, createdUser);
      }, 30);

    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top bar back button */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <button
          id="back-to-landing-btn"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Header with Polytechnic branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="flex justify-center mb-3">
          <PolyLogo size="lg" subtitle="Digital Attendance System" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 font-serif">
          {isRegistering ? 'New Student Registration' : 'Account Sign In'}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Academic Session 2025/2026 • West Africa Time (WAT)
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-lg rounded-2xl border border-slate-200">
          {/* Role selector tabs */}
          {!isRegistering && (
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 mb-6">
              <button
                type="button"
                id="role-tab-student"
                onClick={() => {
                  setSelectedRole('student');
                  setError(null);
                  setShowPassword(false);
                }}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  selectedRole === 'student'
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student</span>
              </button>
 
              <button
                type="button"
                id="role-tab-lecturer"
                onClick={() => {
                  setSelectedRole('lecturer');
                  setError(null);
                  setShowPassword(false);
                }}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  selectedRole === 'lecturer'
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Lecturer</span>
              </button>
 
              <button
                type="button"
                id="role-tab-admin"
                onClick={() => {
                  setSelectedRole('admin');
                  setError(null);
                  setShowPassword(false);
                }}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  selectedRole === 'admin'
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            </div>
          )}

          {/* Alert Messages */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-slate-900 flex-shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-slate-100 border border-slate-400 text-slate-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-slate-900 flex-shrink-0 mt-0.5" />
              <div className="font-medium">{successMessage}</div>
            </div>
          )}

          {/* Login Form */}
          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={
                      selectedRole === 'student'
                        ? 'e.g. student@student.polyibadan.edu.ng'
                        : selectedRole === 'lecturer'
                        ? 'e.g. lecturer@staff.polyibadan.edu.ng'
                        : 'e.g. admin@polyibadan.edu.ng'
                    }
                    className="block w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-600 hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Remember this device</span>
                </label>
                <span className="text-slate-400 font-mono text-[11px]">WAT Standard</span>
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md hover:shadow-lg hover:shadow-emerald-700/20 transition-all hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In as {selectedRole.toUpperCase()}</span>
                )}
              </button>

              {/* Toggle to student registration / lecturer registration */}
              {selectedRole === 'student' && (
                <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
                  <span>First time student? </span>
                  <button
                    type="button"
                    id="register-student-toggle-btn"
                    onClick={() => {
                      setIsRegistering(true);
                      setRegisterRole('student');
                      setError(null);
                    }}
                    className="font-semibold text-slate-950 underline ml-1"
                  >
                    Register new student account
                  </button>
                </div>
              )}

              {selectedRole === 'lecturer' && (
                <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600 space-y-2">
                  <div className="text-slate-500">
                    <span className="font-semibold text-slate-700">New Lecturer or Faculty Staff?</span>
                  </div>
                  <button
                    type="button"
                    id="register-lecturer-toggle-btn"
                    onClick={() => {
                      setIsRegistering(true);
                      setRegisterRole('lecturer');
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 font-semibold text-slate-950 text-xs transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Register New Lecturer / Staff Account</span>
                  </button>
                </div>
              )}

              {selectedRole === 'admin' && (
                <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600 space-y-2">
                  <div className="text-slate-500">
                    <span className="font-semibold text-slate-700">New Administrator or System Overseer?</span>
                  </div>
                  <button
                    type="button"
                    id="register-admin-toggle-btn"
                    onClick={() => {
                      setIsRegistering(true);
                      setRegisterRole('admin');
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 font-semibold text-slate-950 text-xs transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Register Administrator Account</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* Registration Form (Student, Lecturer, or Admin) */
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Account Type Selector for Registration */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 mb-4">
                <button
                  type="button"
                  id="reg-role-student-btn"
                  onClick={() => {
                    setRegisterRole('student');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    registerRole === 'student'
                      ? 'bg-slate-950 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  id="reg-role-lecturer-btn"
                  onClick={() => {
                    setRegisterRole('lecturer');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    registerRole === 'lecturer'
                      ? 'bg-slate-950 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Lecturer</span>
                </button>
                <button
                  type="button"
                  id="reg-role-admin-btn"
                  onClick={() => {
                    setRegisterRole('admin');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    registerRole === 'admin'
                      ? 'bg-slate-950 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              </div>

              {registerRole === 'admin' ? (
                /* Admin-specific fields */
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name (Surname First)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="register-admin-name-input"
                        type="text"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="e.g. PROF. OLATUNJI Sunday Richard"
                        className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Administrative Designation / Title
                      </label>
                      <input
                        id="register-admin-designation-input"
                        type="text"
                        required
                        value={adminDesignation}
                        onChange={e => setAdminDesignation(e.target.value)}
                        placeholder="e.g. Head of ICT / System Overseer"
                        className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Admin Officer Staff ID
                      </label>
                      <input
                        id="register-admin-staffid-input"
                        type="text"
                        required
                        value={adminStaffId}
                        onChange={e => setAdminStaffId(e.target.value)}
                        placeholder="TPI/ADM/2026/001"
                        className="block w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="register-admin-phone-input"
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+234 802 000 0000"
                          className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Institutional Admin Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          id="register-admin-email-input"
                          type="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="admin@polyibadan.edu.ng"
                          className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : registerRole === 'lecturer' ? (
                /* Lecturer-specific fields */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic Title
                      </label>
                      <select
                        id="register-lecturer-title-select"
                        value={lecturerTitle}
                        onChange={e => setLecturerTitle(e.target.value)}
                        className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 font-medium"
                      >
                        <option value="Dr.">Dr.</option>
                        <option value="Engr.">Engr.</option>
                        <option value="Prof.">Prof.</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Dr. (Mrs.)">Dr. (Mrs.)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name (Surname First)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          id="register-lecturer-name-input"
                          type="text"
                          required
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="e.g. ADEWALE Oluwaseun K."
                          className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Staff Identification ID
                      </label>
                      <input
                        id="register-lecturer-staffid-input"
                        type="text"
                        required
                        value={lecturerStaffId}
                        onChange={e => setLecturerStaffId(e.target.value)}
                        placeholder="TPI/ST/2026/088"
                        className="block w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="register-lecturer-phone-input"
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+234 802 000 0000"
                          className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic Department
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Building className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value="Computer Science"
                          readOnly
                          className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Levels Teaching
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['ND I', 'ND II', 'HND I', 'HND II'].map(lvl => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => toggleLecturerLevel(lvl)}
                            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                              lecturerLevels.includes(lvl)
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Assign Courses
                      </label>
                      <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-4">
                        {filteredCoursesForLecturer.length > 0 ? (
                          (lecturerLevels.length > 0 ? lecturerLevels : levels).map(lvl => {
                            const levelCourses = filteredCoursesForLecturer.filter(c => c.level === lvl);
                            if (levelCourses.length === 0) return null;
                            return (
                              <div key={lvl} className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">{lvl} Courses</h4>
                                <div className="space-y-1">
                                  {levelCourses.map(course => (
                                    <label
                                      key={course.id}
                                      className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                        selectedCourseIds.includes(course.id) ? 'bg-white border border-slate-300 shadow-xs' : 'hover:bg-slate-200/50 border border-transparent'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                        checked={selectedCourseIds.includes(course.id)}
                                        onChange={() => toggleCourseSelection(course.id)}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold text-slate-900 truncate">{course.code} - {course.title}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{course.units} Units</p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-[11px] text-slate-500 text-center py-4">
                            All Computer Science courses are currently assigned.
                          </div>
                        )}

                        <label className="flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-200/50 border border-transparent mt-2">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            checked={showCustomCourseInput}
                            onChange={() => setShowCustomCourseInput(!showCustomCourseInput)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-900 truncate">Other (I will add my courses later)</p>
                            <p className="text-[10px] text-slate-500 truncate">Select this if your course is not listed.</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institutional Staff Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="register-lecturer-email-input"
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="o.adewale@staff.polyibadan.edu.ng"
                        className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Student-specific fields */
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name (Surname First)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="register-fullname-input"
                        type="text"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="e.g. ADEWALE John Babatunde"
                        className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Matriculation Number
                      </label>
                      <input
                        id="register-matric-input"
                        type="text"
                        required
                        value={matricNumber}
                        onChange={e => setMatricNumber(e.target.value)}
                        className="block w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="register-phone-input"
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+234 801 234 5678"
                          className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value="Computer Science"
                        readOnly
                        className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Programme
                      </label>
                      <select
                        id="register-programme-select"
                        value={programme}
                        onChange={e => setProgramme(e.target.value)}
                        className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      >
                        <option value="National Diploma">National Diploma (ND)</option>
                        <option value="Higher National Diploma">Higher National Diploma (HND)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Level
                      </label>
                      <select
                        id="register-level-select"
                        value={level}
                        onChange={e => setLevel(e.target.value)}
                        className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      >
                        <option value="ND I">ND I</option>
                        <option value="ND II">ND II</option>
                        <option value="HND I">HND I</option>
                        <option value="HND II">HND II</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institutional Student Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="register-email-input"
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="matric.name@student.polyibadan.edu.ng"
                        className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password (min 6 characters)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="register-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="register-submit-btn"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md hover:shadow-lg hover:shadow-emerald-700/20 transition-all hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating & Syncing Account...</span>
                  </>
                ) : (
                  <span>{registerRole === 'student' ? 'Create Student Account' : 'Create Lecturer Account'}</span>
                )}
              </button>

              <div className="pt-3 text-center text-xs text-slate-600">
                <span>Already have an account? </span>
                <button
                  type="button"
                  id="switch-to-login-btn"
                  onClick={() => {
                    setIsRegistering(false);
                    setError(null);
                  }}
                  className="font-semibold text-slate-950 underline ml-1"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
