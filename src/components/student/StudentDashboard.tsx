import React, { useState, useEffect } from 'react';
import { User, StudentProfile, AttendanceSession } from '../../types';
import { db, dbEvents } from '../../services/db';
import { getGreeting } from '../../utils/time';
import {
  QrCode,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Award,
  Sparkles,
  History,
  User as UserIcon,
  LayoutDashboard
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  onNavigate: (view: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  onNavigate,
}) => {
  const [student, setStudent] = useState<StudentProfile>(() => {
    const existing = db.getStudentByUserId(user.id);
    if (existing) return existing;
    return {
      id: `student_${user.id}`,
      userId: user.id,
      name: user.name || 'Student User',
      email: user.email,
      matricNumber: 'ND/CS/25/001',
      school: 'School of Science & Technology',
      department: 'Computer Science',
      programme: 'Higher National Diploma',
      level: 'HND II',
      academicSession: '2025/2026',
      phone: user.phone || '+234 800 000 0000',
      status: 'active',
      enrolledCourseIds: db.getCourses().map(c => c.id),
    };
  });

  const [stats, setStats] = useState(() => db.getStudentAttendanceStats(student.id));
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);

  const refreshData = () => {
    const s = db.getStudentByUserId(user.id) || student;
    setStudent(s);
    setStats(db.getStudentAttendanceStats(s.id));
    const allActive = db.getActiveSessions();
    const studentCourses = new Set(s.enrolledCourseIds || []);
    const filtered = allActive.filter(sess => studentCourses.has(sess.courseId));
    filtered.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.expirationTime;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.expirationTime;
      return timeB - timeA;
    });
    setActiveSessions(filtered);
  };

  useEffect(() => {
    refreshData();
    const unsub1 = dbEvents.on('attendance_recorded', refreshData);
    const unsub2 = dbEvents.on('session_created', refreshData);
    const unsub3 = dbEvents.on('session_closed', refreshData);
    const unsub4 = dbEvents.on('records_updated', refreshData);

    const interval = setInterval(refreshData, 4000);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      clearInterval(interval);
    };
  }, [user.id]);

  if (!student || !stats) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 max-w-md mx-auto my-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-spin">
          <TrendingUp className="w-6 h-6" />
        </div>
        <p className="font-semibold text-slate-800 text-sm">Loading Student Portal...</p>
        <p className="text-xs text-slate-400 mt-1">Connecting to official attendance register...</p>
      </div>
    );
  }

  const greeting = getGreeting(student.name);

  return (
    <div className="space-y-6">
      {/* Student Portal Page Navigation Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 pl-2">
          <LayoutDashboard className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-bold text-slate-900">Student Navigation:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onNavigate('scan')}
            className="px-3 py-1.5 rounded-xl bg-emerald-750 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan Attendance</span>
          </button>
          <button
            onClick={() => onNavigate('courses')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-700" />
            <span>My Courses</span>
          </button>
          <button
            onClick={() => onNavigate('history')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
          >
            <History className="w-3.5 h-3.5 text-slate-700" />
            <span>Attendance Log</span>
          </button>
          <button
            onClick={() => onNavigate('profile')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
          >
            <UserIcon className="w-3.5 h-3.5 text-slate-700" />
            <span>Digital ID</span>
          </button>
        </div>
      </div>

      {/* High Contrast Academic Student Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-5 border border-slate-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none -z-0" />
        <div className="absolute bottom-0 left-1/3 w-[150px] h-[150px] bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none -z-0" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {student.department} • {student.level}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
            {greeting}
          </h1>
          <p className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
            Matriculation Number: <span className="font-bold text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">{student.matricNumber}</span>
          </p>
        </div>

        {/* Quick Scan Button */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            id="student-quick-scan-btn"
            onClick={() => onNavigate('scan')}
            className="px-6 py-3.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-950 font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all hover:translate-y-[-1px] active:translate-y-[1px] flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <QrCode className="w-4 h-4 text-emerald-600 group-hover:scale-105 transition-transform" />
            <span>Scan Attendance QR</span>
          </button>
        </div>
      </div>

      {/* Active Live Attendance Session Alert */}
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          {activeSessions.map((session) => (
            <div
              key={session.id}
              className="p-4.5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/10 shrink-0 animate-pulse">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                      Live Session Active
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {session.courseCode} — {session.courseTitle}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Lecturer <span className="font-semibold text-slate-800">{session.lecturerName}</span> has opened attendance. Scan immediately.
                  </p>
                </div>
              </div>
              <button
                id={`join-active-session-scan-btn-${session.id}`}
                onClick={() => onNavigate('scan')}
                className="px-4.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all hover:translate-y-[-1px] cursor-pointer shrink-0"
              >
                <span>Scan Code Now</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 4 Key Metric Cards Redesigned */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Courses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Courses</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 leading-none">
            {stats.totalCourses}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Registered courses this session</p>
        </div>

        {/* Average Attendance % */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Turnout</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 leading-none flex items-baseline gap-1">
            {stats.overallAttendanceRate}<span className="text-lg font-bold text-slate-400">%</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-2 font-medium">
            <span>NBTE: 75%</span>
            {stats.overallAttendanceRate >= 75 ? (
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">ELIGIBLE</span>
            ) : (
              <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md">AT RISK</span>
            )}
          </div>
        </div>

        {/* Classes Attended */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Classes Attended</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 leading-none">
            {stats.totalClassesAttended}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium font-mono">Verified digital logs</p>
        </div>

        {/* Classes Missed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Classes Missed</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-rose-600 leading-none">
            {stats.totalClassesMissed}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Missed lectures</p>
        </div>
      </div>

      {/* Quick Action Footer Strip Redesigned */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-left">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Need to check past class attendance logs?
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 leading-normal max-w-xl">
              Filter your attendance by date, course code, and download your verified academic records for submission.
            </p>
          </div>
        </div>

        <button
          id="student-view-history-btn"
          onClick={() => onNavigate('history')}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm hover:shadow hover:translate-y-[-1px] cursor-pointer shrink-0"
        >
          View Attendance History
        </button>
      </div>
    </div>
  );
};
