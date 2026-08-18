import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { User, UserRole, Course, AttendanceSession } from './types';
import { db, dbEvents } from './services/db';

// Common Components
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Footer } from './components/common/Footer';
import { QuickRoleSwitcher } from './components/common/QuickRoleSwitcher';
import { NotificationDrawer } from './components/common/NotificationDrawer';

// Landing & Auth
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';

// Student Portal Views
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentScanner } from './components/student/StudentScanner';
import { StudentAttendanceHistory } from './components/student/StudentAttendanceHistory';
import { StudentCourses } from './components/student/StudentCourses';
import { StudentProfileView } from './components/student/StudentProfileView';

// Lecturer Portal Views
import { LecturerDashboard } from './components/lecturer/LecturerDashboard';
import { LecturerLiveSession } from './components/lecturer/LecturerLiveSession';
import { LecturerAttendanceHistory } from './components/lecturer/LecturerAttendanceHistory';

// Admin & Shared Reports
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ReportsView } from './components/reports/ReportsView';

export default function App() {
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('landing');
  const [loginRoleIntent, setLoginRoleIntent] = useState<UserRole>('student');
  const [loginModeIntent, setLoginModeIntent] = useState<'login' | 'register'>('login');
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);

  // Selected session / course payload for lecturer
  const [selectedCourseForSession, setSelectedCourseForSession] = useState<Course | null>(null);
  const [activeSessionPayload, setActiveSessionPayload] = useState<AttendanceSession | null>(null);

  // Run cloud sync at application startup quietly in background without forcing auto-login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Only sync cloud data quietly if a user is cached, but do not auto-login unless user clicks login
          await db.initializeFromFirestore();
        }
      } catch (err) {
        console.error("Initialization sync error:", err);
      } finally {
        setIsSyncing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync active user with DB state if user logs in explicitly
  useEffect(() => {
    const handleUsersUpdated = () => {
      // Don't auto-set currentUser on reload unless triggered by explicit action
    };

    const unsub = dbEvents.on('users_updated', handleUsersUpdated);
    return () => unsub();
  }, []);

  // Navigation router
  const handleNavigate = (view: string, payload?: any) => {
    if (payload?.course) {
      setSelectedCourseForSession(payload.course);
    }
    if (payload?.session) {
      setActiveSessionPayload(payload.session);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRole = (role: UserRole) => {
    const defaultUser = db.switchUserByRole(role);
    if (defaultUser) {
      setCurrentUser(defaultUser);
      setCurrentView('dashboard');
    }
  };

  const handleOpenLogin = (role: UserRole, mode: 'login' | 'register' = 'login') => {
    setLoginRoleIntent(role);
    setLoginModeIntent(mode);
    setCurrentView('login');
  };

  const handleLoginSuccess = (userId: string) => {
    const user = db.getUserById(userId);
    if (user) {
      setCurrentUser(user);
      setCurrentView('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Firebase signout warning:", err);
    }
    db.setActiveUserId(null);
    setCurrentUser(null);
    setCurrentView('landing');
  };

  const handleStartSessionForCourse = (course: Course) => {
    setSelectedCourseForSession(course);
    setActiveSessionPayload(null);
    setCurrentView('live_session');
  };

  // Render synchronization screen on app load
  if (isSyncing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-6 max-w-md">
          {/* Logo / Icon */}
          <div className="w-16 h-16 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center mx-auto animate-pulse">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-white font-bold text-lg font-serif">The Ibadan Polytechnic</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold font-mono">
              Academic Cloud Synchronizer
            </p>
          </div>

          <div className="relative w-48 h-1 bg-slate-800 rounded-full overflow-hidden mx-auto">
            <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full w-1/2 animate-[loading_1.5s_infinite_ease-in-out]"></div>
          </div>

          <p className="text-xs text-slate-500">
            Establishing secure handshake & loading academic attendance registers...
          </p>
        </div>
        
        {/* Style tag for keyframes */}
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  // If on landing or login without active user
  if (currentView === 'landing' || !currentUser) {
    if (currentView === 'login') {
      return (
        <LoginPage
          initialRole={loginRoleIntent}
          initialMode={loginModeIntent}
          onLoginSuccess={handleLoginSuccess}
          onBackToLanding={() => setCurrentView('landing')}
        />
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-white">
        <LandingPage
          onSelectRole={handleSelectRole}
          onOpenLogin={handleOpenLogin}
          onQuickLogin={(userId) => {
            const u = db.getUserById(userId);
            if (u) {
              db.setActiveUserId(u.id);
              setCurrentUser(u);
              setCurrentView('dashboard');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-slate-50 text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
      {/* Desktop High-Density Sidebar */}
      <div className="hidden md:flex h-full">
        <Sidebar
          currentUser={currentUser}
          currentView={currentView}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* High Density Header */}
        <Header
          currentUser={currentUser}
          currentView={currentView}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onToggleNotifications={() => setIsNotificationOpen(true)}
        />

        {/* Scrollable Main Content Surface */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {/* STUDENT VIEWS */}
            {currentUser.role === 'student' && (
              <>
                {currentView === 'dashboard' && (
                  <StudentDashboard
                    user={currentUser}
                    onNavigate={handleNavigate}
                  />
                )}
                {currentView === 'scan' && (
                  <StudentScanner
                    user={currentUser}
                    onNavigate={handleNavigate}
                  />
                )}
                {currentView === 'history' && (
                  <StudentAttendanceHistory user={currentUser} />
                )}
                {currentView === 'courses' && (
                  <StudentCourses user={currentUser} />
                )}
                {currentView === 'profile' && (
                  <StudentProfileView user={currentUser} />
                )}
              </>
            )}

            {/* LECTURER VIEWS */}
            {currentUser.role === 'lecturer' && (
              <>
                {currentView === 'dashboard' && (
                  <LecturerDashboard
                    user={currentUser}
                    onNavigate={handleNavigate}
                    onStartSessionForCourse={handleStartSessionForCourse}
                  />
                )}
                {currentView === 'live_session' && (
                  <LecturerLiveSession
                    user={currentUser}
                    initialCourse={selectedCourseForSession}
                    initialSession={activeSessionPayload}
                    onNavigate={handleNavigate}
                  />
                )}
                {currentView === 'history' && (
                  <LecturerAttendanceHistory user={currentUser} />
                )}
                {currentView === 'reports' && (
                  <ReportsView user={currentUser} />
                )}
              </>
            )}

            {/* ADMIN VIEWS */}
            {currentUser.role === 'admin' && (
              <>
                {currentView === 'dashboard' && (
                  <AdminDashboard
                    user={currentUser}
                    onNavigate={handleNavigate}
                  />
                )}
                {currentView === 'reports' && (
                  <ReportsView user={currentUser} />
                )}
              </>
            )}
          </div>
        </main>

        {/* Status Footer */}
        <Footer />
      </div>

      {/* Floating Quick Role Switcher Bar Removed */}

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
