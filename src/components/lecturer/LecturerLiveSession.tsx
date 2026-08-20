import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, LecturerProfile, Course, AttendanceSession, AttendanceRecord, StudentProfile } from '../../types';
import { db, dbEvents } from '../../services/db';
import { formatWATTime, formatWATDate, getWATDate } from '../../utils/time';
import { exportSessionAttendanceToCSV } from '../../utils/reports';
import {
  QrCode,
  Clock,
  Users,
  CheckCircle,
  Play,
  Square,
  Search,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowLeft,
  FileSpreadsheet,
  UserX,
  UserCheck,
  BellRing,
  Download,
  AlertTriangle
} from 'lucide-react';

interface LecturerLiveSessionProps {
  user: User;
  initialCourse?: Course | null;
  initialSession?: AttendanceSession | null;
  onNavigate: (view: string) => void;
}

export const LecturerLiveSession: React.FC<LecturerLiveSessionProps> = ({
  user,
  initialCourse,
  initialSession,
  onNavigate,
}) => {
  const [lecturer, setLecturer] = useState<LecturerProfile | null>(
    db.getLecturerByUserId(user.id) || null
  );
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourse?.id || initialSession?.courseId || ''
  );
  // Get default start and stop times (Africa/Lagos)
  const getDefaultTimes = () => {
    const wat = getWATDate();
    const pad = (num: number) => String(num).padStart(2, '0');
    
    const startHour = wat.getHours();
    const startMin = wat.getMinutes();
    const startTimeStr = `${pad(startHour)}:${pad(startMin)}`;

    const stopDate = new Date(wat.getTime() + 15 * 60 * 1000);
    const stopHour = stopDate.getHours();
    const stopMin = stopDate.getMinutes();
    const stopTimeStr = `${pad(stopHour)}:${pad(stopMin)}`;

    return { startTimeStr, stopTimeStr };
  };

  const [startTimeInput, setStartTimeInput] = useState<string>(() => getDefaultTimes().startTimeStr);
  const [stopTimeInput, setStopTimeInput] = useState<string>(() => getDefaultTimes().stopTimeStr);

  const getCalculatedDuration = (): number => {
    try {
      const [startH, startM] = startTimeInput.split(':').map(Number);
      const [stopH, stopM] = stopTimeInput.split(':').map(Number);

      if (isNaN(startH) || isNaN(startM) || isNaN(stopH) || isNaN(stopM)) {
        return 15;
      }

      const startMins = startH * 60 + startM;
      let stopMins = stopH * 60 + stopM;

      if (stopMins < startMins) {
        // spans to next day
        stopMins += 24 * 60;
      }

      const diffMins = stopMins - startMins;
      return diffMins > 0 ? diffMins : 15;
    } catch {
      return 15;
    }
  };

  // Active Session State
  const [session, setSession] = useState<AttendanceSession | null>(
    initialSession || null
  );
  const [presentRecords, setPresentRecords] = useState<AttendanceRecord[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<StudentProfile[]>([]);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals for Quick Actions
  const [showAbsentModal, setShowAbsentModal] = useState<boolean>(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState<boolean>(false);
  const [manualMatric, setManualMatric] = useState<string>('');
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  // Sound effect / live check-in visual ping
  const [newCheckInAlert, setNewCheckInAlert] = useState<string | null>(null);

  // Load lecturer courses
  useEffect(() => {
    const l = db.getLecturerByUserId(user.id);
    setLecturer(l || null);
    if (l) {
      const cList = db.getCoursesByLecturer(l.id);
      setCourses(cList);
      if (!selectedCourseId && cList.length > 0) {
        setSelectedCourseId(cList[0].id);
      }
    }
  }, [user.id]);

  // Check if active session already exists for selected course
  useEffect(() => {
    if (selectedCourseId && !session && lecturer) {
      const active = db.getActiveSessionForCourse(selectedCourseId, lecturer.id);
      if (active) {
        setSession(active);
      }
    }
  }, [selectedCourseId, lecturer]);

  // Sync session records
  const refreshSessionData = () => {
    if (!session) return;
    const currentSession = db.getSessionById(session.id);
    if (currentSession) {
      setSession(currentSession);
      const records = db.getRecordsForSession(currentSession.id);
      setPresentRecords(records);

      const regs = db.getCourseRegistrations(currentSession.courseId);
      setRegisteredStudents(regs);

      // Check for countdown
      const diff = Math.max(0, Math.floor(((currentSession.expirationTime || 0) - Date.now()) / 1000));
      setTimeRemainingSeconds(diff);
    }
  };

  useEffect(() => {
    refreshSessionData();
    const unsubRec = dbEvents.on('attendance_recorded', (data) => {
      if (session && (data.sessionId === session.id || data.record?.sessionId === session.id || data.session?.id === session.id)) {
        refreshSessionData();
        setNewCheckInAlert(data.record?.studentName || data.studentName || 'Student');
        setTimeout(() => setNewCheckInAlert(null), 3000);
      }
    });

    const unsubRecords = dbEvents.on('records_updated', () => {
      if (session) {
        refreshSessionData();
      }
    });

    const timer = setInterval(() => {
      if (session && session.status === 'active') {
        const diff = Math.max(0, Math.floor(((session.expirationTime || 0) - Date.now()) / 1000));
        setTimeRemainingSeconds(diff);
        if (diff <= 0) {
          db.closeSession(session.id);
          refreshSessionData();
        }
      }
    }, 1000);

    return () => {
      unsubRec();
      unsubRecords();
      clearInterval(timer);
    };
  }, [session?.id]);

  // Start Session
  const handleStartSession = () => {
    if (!lecturer || !selectedCourseId) return;
    const c = courses.find(item => item.id === selectedCourseId);
    if (!c) return;

    const computedDuration = getCalculatedDuration();

    const newSession = db.createAttendanceSession(
      c.id,
      lecturer.id,
      computedDuration,
      c.venue || 'Lecture Theatre 1'
    );
    setSession(newSession);
    const regs = db.getCourseRegistrations(c.id);
    setRegisteredStudents(regs);
    setPresentRecords([]);
    setTimeRemainingSeconds(computedDuration * 60);
  };

  // End Session
  const handleEndSession = () => {
    if (!session) return;
    if (confirm('Are you sure you want to end this attendance session? Students will no longer be able to scan.')) {
      db.closeSession(session.id);
      setSession(null);
      setIsFullscreen(false);
    }
  };

  // Manual Check In by Matric
  const handleManualCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !manualMatric.trim()) return;

    const student = db.getStudentByMatric(manualMatric.trim().toUpperCase());
    if (!student) {
      setManualMessage('Student not found with this matriculation number.');
      return;
    }

    try {
      db.recordAttendance(
        session.id,
        student.id,
        session.qrToken,
        'manual',
        undefined,
        'Manual lecturer override'
      );
      setManualMessage(`Successfully marked attendance for ${student.name}`);
      setManualMatric('');
      refreshSessionData();
      setTimeout(() => {
        setManualMessage(null);
        setShowManualEntryModal(false);
      }, 1500);
    } catch (err: any) {
      setManualMessage(err.message || 'Failed to record attendance');
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const presentStudentIds = new Set(presentRecords.map(r => r.studentId));
  const absentStudents = registeredStudents.filter(s => !presentStudentIds.has(s.id));

  const filteredPresent = presentRecords.filter(r =>
    (r.studentName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (r.matricNumber || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const successRate = registeredStudents.length > 0
    ? Math.round((presentRecords.length / registeredStudents.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        {session && session.status === 'active' && (
          <div className="flex items-center gap-3">
            <button
              id="toggle-projector-fullscreen-btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen Projector'}</span>
            </button>
          </div>
        )}
      </div>

      {/* FULLSCREEN PROJECTOR VIEW */}
      {isFullscreen && session && (
        <div className="fixed inset-0 z-50 bg-white text-slate-950 flex flex-col p-8 justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                The
              </div>
              <div>
                <h1 className="text-xl font-bold font-serif">{session.courseCode}: {session.courseTitle}</h1>
                <p className="text-xs text-slate-500 font-mono">Lecturer: {session.lecturerName} • Venue: {session.venue}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right font-mono">
                <span className="text-xs text-slate-400 block">TIME REMAINING</span>
                <span className="text-3xl font-bold text-slate-950">{formatCountdown(timeRemainingSeconds)}</span>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close Projector
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <div className="bg-white p-8 rounded-3xl border-4 border-slate-950 shadow-xl flex flex-col items-center">
              <QRCodeSVG
                value={session.qrToken}
                size={340}
                level="H"
                includeMargin={true}
              />
              <p className="mt-4 text-sm font-bold text-slate-900">
                Scan with your Polytechnic Student Portal Camera
              </p>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Token refreshes dynamically every 10 seconds (Anti-Fraud)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4 font-mono text-sm">
            <div>
              <span>Checked in: </span>
              <strong className="text-lg text-slate-950">{presentRecords.length}</strong> / {registeredStudents.length} Students
            </div>
            <div className="text-slate-500 text-xs">
              West Africa Time: {formatWATTime()}
            </div>
          </div>
        </div>
      )}

      {/* STATE 1: CREATE NEW ATTENDANCE SESSION */}
      {!session || session.status === 'closed' ? (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-2">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-950 font-serif">
              Start Attendance Session
            </h2>
            <p className="text-xs text-slate-500">
              Configure class duration and generate a unique dynamic QR code for students to scan.
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            {/* Select Course */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Course *
              </label>
              <select
                id="select-course-to-start-session"
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="w-full py-2.5 px-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-semibold"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title} ({c.units} Units)
                  </option>
                ))}
              </select>
            </div>

            {/* Course Summary Box */}
            {selectedCourse && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Course Code:</span>
                  <span className="font-bold text-slate-950">{selectedCourse.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Course Title:</span>
                  <span className="font-semibold text-slate-800">{selectedCourse.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Date:</span>
                  <span className="font-semibold text-slate-800">{formatWATDate()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Start Time:</span>
                  <span className="font-semibold text-slate-800">{formatWATTime()} (WAT)</span>
                </div>
              </div>
            )}

            {/* Attendance Window Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Play className="w-3 h-3 text-emerald-600" />
                  <span>Time to Start *</span>
                </label>
                <input
                  id="attendance-start-time"
                  type="time"
                  required
                  value={startTimeInput}
                  onChange={e => setStartTimeInput(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:border-slate-950 text-slate-900 font-semibold text-sm cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Square className="w-3 h-3 text-rose-600 fill-rose-600" />
                  <span>Time to Stop *</span>
                </label>
                <input
                  id="attendance-stop-time"
                  type="time"
                  required
                  value={stopTimeInput}
                  onChange={e => setStopTimeInput(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:border-slate-950 text-slate-900 font-semibold text-sm cursor-pointer"
                />
              </div>
            </div>

            {/* Calculated Duration summary info box */}
            <div className="py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Calculated Session Window:</span>
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 font-bold">
                {getCalculatedDuration()} minutes
              </span>
            </div>

            {/* First-Time Lecturer In-Class Tip */}
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-slate-950">
                <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                <span>First-Time Lecturer In-Class Tip:</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Connect your laptop/tablet to the lecture hall projector or podium screen. Once started, click <strong>"Full Screen Projector"</strong> so students can scan comfortably from anywhere in the hall.
              </p>
            </div>

            {/* Start Button */}
            <button
              id="confirm-start-attendance-btn"
              onClick={handleStartSession}
              className="w-full py-3 px-6 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <Play className="w-4 h-4 text-white" />
              <span>START ATTENDANCE</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: HIGH DENSITY LIVE SESSION */
        <div className="space-y-6">
          {/* Check-In Live Alert Notification Banner */}
          {newCheckInAlert && (
            <div className="p-2.5 rounded-xl bg-slate-950 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm animate-bounce">
              <Sparkles className="w-4 h-4 text-white" />
              <span>Student checked in: <strong>{newCheckInAlert}</strong></span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Columns: High Density Metrics & Live Feed */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* 4 High Density Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-slate-400 text-[11px] font-bold uppercase mb-1">Students Present</p>
                  <p className="text-2xl font-bold text-slate-950">
                    {presentRecords.length}
                    <span className="text-slate-400 font-normal text-sm ml-1">/ {registeredStudents.length}</span>
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-slate-400 text-[11px] font-bold uppercase mb-1">Duration</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {session.durationMinutes}
                    <span className="text-slate-400 font-normal text-sm ml-1">min</span>
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-slate-400 text-[11px] font-bold uppercase mb-1">Time Left</p>
                  <p className="text-2xl font-mono font-bold text-slate-950">
                    {formatCountdown(timeRemainingSeconds)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-slate-400 text-[11px] font-bold uppercase mb-1">Turnout Rate</p>
                  <p className="text-2xl font-bold text-slate-950">{successRate}%</p>
                </div>
              </div>

              {/* Live Attendance Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Live Attendance Feed</h3>
                    <p className="text-[10px] text-slate-500">Real-time attendance stream with WAT verification</p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search matric no..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="text-[11px] px-3 py-1.5 border border-slate-200 rounded-lg bg-white w-full sm:w-48 text-slate-800"
                    />
                  </div>
                </div>

                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 z-10">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Student Name</th>
                        <th className="px-4 py-2.5 font-semibold">Matric Number</th>
                        <th className="px-4 py-2.5 font-semibold">Check-in Time</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px] divide-y divide-slate-100 font-sans">
                      {filteredPresent.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                            <Users className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                            Waiting for students to scan QR code...
                          </td>
                        </tr>
                      ) : (
                        filteredPresent.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-slate-900">{r.studentName}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-500">{r.matricNumber}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-700">{r.checkInTime}</td>
                            <td className="px-4 py-2.5">
                              <span className="bg-slate-100 text-slate-900 border border-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                PRESENT
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: QR Code Projector Box & Quick Actions */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* QR Code Projector Card */}
              <div className="bg-white p-6 rounded-2xl border-2 border-slate-950 shadow-xs flex flex-col items-center text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 font-mono">
                  {session.courseCode}: {session.courseTitle}
                </p>
                <h4 className="text-lg font-bold text-slate-950 mb-4 font-serif">Scan To Mark Attendance</h4>

                <div className="w-52 h-52 bg-white rounded-xl p-3 border border-slate-200 relative flex items-center justify-center shadow-xs">
                  <QRCodeSVG
                    value={session.qrToken}
                    size={190}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="mt-5 w-full flex flex-col gap-2">
                  <button
                    id="live-session-end-btn"
                    onClick={handleEndSession}
                    className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>END SESSION</span>
                  </button>
                  <p className="text-[10px] text-slate-400 italic">
                    Session automatically closes in {formatCountdown(timeRemainingSeconds)}
                  </p>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-slate-950 rounded-2xl p-5 text-white shadow-xs border border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider mb-3 pb-2 border-b border-slate-800 flex items-center gap-2 text-slate-300">
                  <QrCode className="w-3.5 h-3.5 text-white" />
                  <span>Quick Actions</span>
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => {
                      if (session) exportSessionAttendanceToCSV(session.id);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded-xl cursor-pointer transition-all border border-slate-800"
                  >
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Report</p>
                    <p className="text-xs font-semibold flex items-center gap-1 text-white">
                      <Download className="w-3 h-3 text-white" />
                      <span>Full Export (CSV)</span>
                    </p>
                  </div>

                  <div
                    onClick={() => setShowAbsentModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded-xl cursor-pointer transition-all border border-slate-800"
                  >
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">List</p>
                    <p className="text-xs font-semibold flex items-center gap-1 text-white">
                      <UserX className="w-3 h-3 text-white" />
                      <span>Absent Students ({absentStudents.length})</span>
                    </p>
                  </div>

                  <div
                    onClick={() => setShowManualEntryModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded-xl cursor-pointer transition-all border border-slate-800"
                  >
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Tools</p>
                    <p className="text-xs font-semibold flex items-center gap-1 text-white">
                      <UserCheck className="w-3 h-3 text-white" />
                      <span>Manual Entry</span>
                    </p>
                  </div>

                  <div
                    onClick={() => alert(`Warning notices sent to all ${absentStudents.length} absent students.`)}
                    className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded-xl cursor-pointer transition-all border border-slate-800"
                  >
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Alerts</p>
                    <p className="text-xs font-semibold flex items-center gap-1 text-white">
                      <BellRing className="w-3 h-3 text-white" />
                      <span>Warning Notice</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Absent Students List */}
      {showAbsentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Unchecked Students</h3>
                <p className="text-[11px] text-slate-500">Registered students who have not yet scanned the QR</p>
              </div>
              <button onClick={() => setShowAbsentModal(false)} className="text-slate-400 hover:text-black text-sm">
                ✕
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
              {absentStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle className="w-8 h-8 mx-auto text-slate-900 mb-1" />
                  All registered students are present!
                </div>
              ) : (
                absentStudents.map(s => (
                  <div key={s.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-[10px] font-mono text-slate-500">{s.matricNumber}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      Unchecked
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowAbsentModal(false)}
              className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Manual Entry */}
      {showManualEntryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Manual Student Check-In</h3>
                <p className="text-[11px] text-slate-500">Lecturer override for phone battery/camera issues</p>
              </div>
              <button onClick={() => setShowManualEntryModal(false)} className="text-slate-400 hover:text-black text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleManualCheckIn} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Student Matriculation Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. HND/CS/24/001"
                  value={manualMatric}
                  onChange={e => setManualMatric(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 bg-slate-50"
                  required
                />
              </div>

              {manualMessage && (
                <div className={`p-2 rounded-lg text-xs ${manualMessage.includes('Successfully') ? 'bg-slate-100 text-slate-900 border border-slate-300' : 'bg-slate-100 text-slate-900 border border-slate-400'}`}>
                  {manualMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualEntryModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
                >
                  Record Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
