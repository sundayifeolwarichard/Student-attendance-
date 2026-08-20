import React, { useState, useEffect } from 'react';
import { User, LecturerProfile, Course, AttendanceSession } from '../../types';
import { db, dbEvents } from '../../services/db';
import { getGreeting, formatWATDate } from '../../utils/time';
import { FirstTimeLecturerGuide } from './FirstTimeLecturerGuide';
import {
  BookOpen,
  Calendar,
  Activity,
  Users,
  TrendingUp,
  QrCode,
  ArrowRight,
  Play,
  CheckCircle,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  FileSpreadsheet,
  Tv,
  ChevronRight,
  UserCircle,
  Upload,
  X,
  ChevronDown,
  Camera
} from 'lucide-react';

interface LecturerDashboardProps {
  user: User;
  onNavigate: (view: string, data?: any) => void;
  onStartSessionForCourse: (course: Course) => void;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
  user,
  onNavigate,
  onStartSessionForCourse,
}) => {
  const [lecturer, setLecturer] = useState<LecturerProfile | null>(
    db.getLecturerByUserId(user.id) || null
  );
  const [stats, setStats] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [showQuickStartCard, setShowQuickStartCard] = useState<boolean>(true);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseUnits, setNewCourseUnits] = useState('3');
  const [newCourseLevel, setNewCourseLevel] = useState('ND I');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && lecturer) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        db.updateLecturer(lecturer.id, {
          avatarUrl: base64String
        });
        setLecturer(prev => prev ? { ...prev, avatarUrl: base64String } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode.trim() || !newCourseTitle.trim()) return;

    const course = db.createCourse({
      code: newCourseCode.trim().toUpperCase(),
      title: newCourseTitle.trim(),
      units: Number(newCourseUnits) || 3,
      department: 'Computer Science',
      level: newCourseLevel,
      semester: 'First Semester',
      academicSession: '2025/2026',
      lecturerId: lecturer.id,
      lecturerName: `${lecturer.title} ${lecturer.name}`,
    });

    // Assign to this lecturer
    const currentAssigned = lecturer.assignedCourseIds || [];
    db.updateLecturer(lecturer.id, {
      assignedCourseIds: [...currentAssigned, course.id]
    });

    setIsCreateCourseModalOpen(false);
    setNewCourseCode('');
    setNewCourseTitle('');
    loadData();
  };

  const loadData = () => {
    const l = db.getLecturerByUserId(user.id);
    setLecturer(l || null);
    if (l) {
      const s = db.getLecturerAttendanceStats(l.id);
      setStats(s);
      const active = db.getActiveSessionsByLecturer(l.id);
      setActiveSessions(active);
    }
  };

  useEffect(() => {
    loadData();
    const unsub1 = dbEvents.on('session_created', loadData);
    const unsub2 = dbEvents.on('session_closed', loadData);
    const unsub3 = dbEvents.on('attendance_recorded', loadData);
    const unsub4 = dbEvents.on('courses_updated', loadData);
    const unsub5 = dbEvents.on('lecturers_updated', loadData);
    const interval = setInterval(loadData, 4000);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      clearInterval(interval);
    };
  }, [user.id]);

  if (!lecturer || !stats) {
    return <div className="p-8 text-center text-slate-500">Loading lecturer dashboard...</div>;
  }

  const greeting = getGreeting(lecturer.name);

  const handleStartFirstClass = () => {
    if (stats.courses.length > 0) {
      onStartSessionForCourse(stats.courses[0]);
    } else {
      onNavigate('live_session');
    }
  };

  return (
    <div className="space-y-6">
      {/* First-Time Lecturer Orientation Guide Modal */}
      <FirstTimeLecturerGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        courses={stats.courses}
        onStartDemoSession={handleStartFirstClass}
      />

      {/* Redesigned Premium Lecturer Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-start md:justify-between gap-5 border border-slate-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[150px] h-[150px] bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
        
        <div className="space-y-3 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Staff ID: {lecturer.staffId}
          </div>
          
          <div className="flex items-start gap-4">
            <div className="relative group cursor-pointer" onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}>
              <div className="w-14 h-14 rounded-full border-2 border-slate-700 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 group-hover:border-slate-500 transition-colors">
                {lecturer.avatarUrl ? (
                  <img src={lecturer.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-8 h-8 text-slate-500" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
 
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif">
                {greeting}
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Generate secure classroom attendance QR codes, project live to students, and export NBTE compliance sheets.
              </p>
            </div>
          </div>
 
          {isProfileDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Profile Details</h3>
                <label className="cursor-pointer p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5" title="Upload Picture">
                  <Camera className="w-4 h-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} />
                </label>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex flex-col">
                  <span className="text-slate-500 font-medium">Staff ID</span>
                  <span className="font-mono text-slate-200 font-bold">{lecturer.staffId}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 font-medium">Department</span>
                  <span className="text-slate-200 font-bold">{lecturer.department}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 font-medium">Email</span>
                  <span className="text-slate-200 font-bold">{lecturer.email}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 font-medium">Phone</span>
                  <span className="text-slate-200 font-bold">{lecturer.phone}</span>
                </div>
                {lecturer.levelsTaking && lecturer.levelsTaking.length > 0 && (
                  <div className="flex flex-col pt-1">
                    <span className="text-slate-500 font-medium mb-1.5">Assigned Levels</span>
                    <div className="flex flex-wrap gap-1.5">
                      {lecturer.levelsTaking.map(lvl => (
                        <span key={lvl} className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                          {lvl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
 
        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0 relative z-10 shrink-0">
          <button
            id="lecturer-open-first-time-guide-btn"
            onClick={() => setIsGuideOpen(true)}
            className="px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 border border-slate-800 font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all"
            title="Open First-Time Lecturer Onboarding & Walkthrough Guide"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Lecturer Guide</span>
          </button>
 
          <button
            id="lecturer-start-attendance-primary-btn"
            onClick={handleStartFirstClass}
            className="px-6 py-3 rounded-xl bg-white hover:bg-emerald-50 text-slate-950 font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all hover:translate-y-[-1px] active:translate-y-[1px] flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <QrCode className="w-4 h-4 text-emerald-600 group-hover:scale-105 transition-transform" />
            <span>Launch QR Attendance</span>
          </button>
        </div>
      </div>

      {/* First-Time Lecturer Quick Start Card (Helpful Onboarding Widget) */}
      {showQuickStartCard && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] font-bold uppercase tracking-wider">
                  First-Time Lecturer Quick Start
                </span>
                <span className="text-xs font-semibold text-slate-900">
                  4-Step Classroom Readiness Checklist
                </span>
              </div>
              <p className="text-xs text-slate-500">
                New to the digital QR system? Follow these simple steps to run your first classroom attendance smoothly.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGuideOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 font-semibold text-xs hover:bg-slate-200 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-900" />
                <span>Read Full Step-by-Step Guide</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
            {/* Step 1 */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900">1. Assigned Courses</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {stats.courses.length} courses allocated & ready
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                2
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">2. Launch Session</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Click 'Start Attendance' on any course
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                3
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">3. Project Dynamic QR</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  10s rolling anti-fraud security tokens
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                4
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">4. Export NBTE Audit</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Automated 75% exam eligibility check
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Session Notification Strip */}
      {activeSessions.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-100 border-2 border-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-900 text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                  SESSION ACTIVE NOW
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {activeSessions[0].courseCode} — {activeSessions[0].courseTitle}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Started at {activeSessions[0].startTime} • {activeSessions[0].presentCount} students currently checked in
              </p>
            </div>
          </div>

          <button
            id="view-live-session-btn"
            onClick={() => onNavigate('live_session', { session: activeSessions[0] })}
            className="px-3.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <span>Open Projector & Roll Call</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5 Required Key Metric Cards in High Density Format */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Courses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Courses</span>
            <div className="p-1 rounded-md bg-slate-100 text-slate-900">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{stats.totalCourses}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Assigned this session</p>
        </div>

        {/* Today's Classes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today's Classes</span>
            <div className="p-1 rounded-md bg-slate-100 text-slate-900">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{stats.todaysClasses}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Classes on {formatWATDate()}</p>
        </div>

        {/* Active Attendance Sessions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Sessions</span>
            <div className="p-1 rounded-md bg-slate-100 text-slate-900">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-950">{stats.activeSessions}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Open for scanning</p>
        </div>

        {/* Total Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Students</span>
            <div className="p-1 rounded-md bg-slate-100 text-slate-900">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{stats.totalStudents}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Enrolled students</p>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Turnout Rate</span>
            <div className="p-1 rounded-md bg-slate-100 text-slate-900">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-950">{stats.attendanceRate}%</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Average attendance</p>
        </div>
      </div>

      {/* Section: My Assigned Courses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Allocated Courses
            </h2>
            <p className="text-[11px] text-slate-500">
              Select a course to configure session parameters and launch a live attendance QR code.
            </p>
          </div>
          <button
            onClick={() => setIsCreateCourseModalOpen(true)}
            className="px-3 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            + Create New Course
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.courses.map((course: Course) => {
            const regs = db.getCourseRegistrations(course.id);
            const activeForThis = activeSessions.find(s => s.courseId === course.id);

            return (
              <div
                key={course.id}
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-bold text-xs font-mono border border-slate-200">
                        {course.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                        {course.level}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">
                      {course.units} Units
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                    {course.title}
                  </h3>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">Department:</span>
                      <span className="font-semibold text-slate-900 text-[11px]">{course.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">Level:</span>
                      <span className="font-semibold text-slate-900 text-[11px]">{course.level} • {course.semester}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">Registered:</span>
                      <span className="font-bold text-slate-950 text-[11px]">{regs.length} Students</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  {activeForThis ? (
                    <button
                      onClick={() => onNavigate('live_session', { session: activeForThis })}
                      className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Live Session in Progress</span>
                    </button>
                  ) : (
                    <button
                      id={`start-attendance-course-${course.code.replace(/\s+/g, '')}`}
                      onClick={() => onStartSessionForCourse(course)}
                      className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 text-white" />
                      <span>Start Attendance</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Custom Course Modal */}
      {isCreateCourseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Create Custom Course</h3>
              <button 
                onClick={() => setIsCreateCourseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSC 421"
                  value={newCourseCode}
                  onChange={e => setNewCourseCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={newCourseTitle}
                  onChange={e => setNewCourseTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Level</label>
                  <select
                    value={newCourseLevel}
                    onChange={e => setNewCourseLevel(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                  >
                    {['ND I', 'ND II', 'HND I', 'HND II'].map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Units</label>
                  <select
                    value={newCourseUnits}
                    onChange={e => setNewCourseUnits(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                  >
                    {[1, 2, 3, 4, 6].map(u => (
                      <option key={u} value={u.toString()}>{u} Units</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xs hover:bg-slate-800 transition-colors"
                >
                  Create & Assign Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
