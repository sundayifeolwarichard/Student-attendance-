import React, { useState, useEffect } from 'react';
import { User, LecturerProfile, AttendanceSession, AttendanceRecord, Course } from '../../types';
import { db, dbEvents } from '../../services/db';
import { formatWATDate, formatWATTime } from '../../utils/time';
import { exportToCSV, exportToExcel, generateAttendancePDFReport } from '../../utils/reports';
import {
  History,
  Calendar,
  FileDown,
  FileSpreadsheet,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  X,
  LayoutDashboard,
  QrCode
} from 'lucide-react';

interface LecturerAttendanceHistoryProps {
  user: User;
  onNavigate?: (view: string) => void;
}

export const LecturerAttendanceHistory: React.FC<LecturerAttendanceHistoryProps> = ({ user, onNavigate }) => {
  const [lecturer, setLecturer] = useState<LecturerProfile | null>(
    db.getLecturerByUserId(user.id) || null
  );
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionForModal, setSelectedSessionForModal] = useState<AttendanceSession | null>(null);
  const [sessionRecords, setSessionRecords] = useState<AttendanceRecord[]>([]);

  const loadData = () => {
    const l = db.getLecturerByUserId(user.id);
    setLecturer(l || null);
    if (l) {
      const courses = db.getCoursesByLecturer(l.id);
      const cIds = new Set(courses.map(c => c.id));
      const sList = db.getSessions().filter(s => cIds.has(s.courseId));
      setSessions(sList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dbEvents.on('sessions_updated', loadData);
    return () => unsub();
  }, [user.id]);

  const handleOpenDetails = (session: AttendanceSession) => {
    setSelectedSessionForModal(session);
    const recs = db.getAllRecordsForSession(session.id);
    setSessionRecords(recs);
  };

  const handleExportSessionPDF = (session: AttendanceSession) => {
    const recs = db.getAllRecordsForSession(session.id);
    const headers = ['Student Name', 'Matriculation No.', 'Status', 'Check-in Time (WAT)'];
    const rows = recs.map(r => [
      r.studentName,
      r.matricNumber,
      r.status,
      r.checkInTime,
    ]);

    generateAttendancePDFReport({
      title: `${session.courseCode} Class Attendance Session`,
      subtitle: `Date: ${formatWATDate(session.date)} • Time: ${session.startTime} WAT`,
      courseCode: session.courseCode,
      courseTitle: session.courseTitle,
      lecturerName: session.lecturerName,
      headers,
      rows,
      summaryStats: [
        { label: 'Total Registered', value: session.totalRegistered || recs.length },
        { label: 'Present', value: session.presentCount || recs.filter(r => r.status === 'PRESENT').length },
        { label: 'Absent', value: session.absentCount || recs.filter(r => r.status === 'ABSENT').length },
        { label: 'Turnout Rate', value: `${Math.round(((session.presentCount || 0) / (session.totalRegistered || 1)) * 100)}%` },
      ],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-950">
            Attendance Session History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Review previous roll call sessions, student check-in logs, and absent student lists.
          </p>
        </div>
        {onNavigate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onNavigate('live_session')}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Start Live QR Session</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Session Code</th>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4 text-center">Present / Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No past attendance sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {s.sessionId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.courseCode}</div>
                      <div className="text-[11px] text-slate-500">{s.courseTitle}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800">
                      {formatWATDate(s.date)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {s.durationMinutes} mins ({s.startTime})
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-950">
                      {s.presentCount} / {s.totalRegistered}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          s.status === 'active'
                            ? 'bg-slate-950 text-white animate-pulse'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {(s.status || 'ACTIVE').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetails(s)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold flex items-center gap-1 border border-slate-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Roll</span>
                        </button>
                        <button
                          onClick={() => handleExportSessionPDF(s)}
                          className="p-1 text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Export PDF Slip"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSessionForModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold font-serif text-slate-950">
                  {selectedSessionForModal.courseCode} Attendance Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  {formatWATDate(selectedSessionForModal.date)} • {selectedSessionForModal.sessionId}
                </p>
              </div>
              <button
                onClick={() => setSelectedSessionForModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 p-3 rounded-2xl border border-slate-200 font-mono text-xs">
              <div>
                <div className="font-bold text-base text-slate-900">{selectedSessionForModal.totalRegistered}</div>
                <div className="text-slate-500 text-[10px] font-sans">Total Registered</div>
              </div>
              <div>
                <div className="font-bold text-base text-slate-950">{selectedSessionForModal.presentCount}</div>
                <div className="text-slate-500 text-[10px] font-sans">Present</div>
              </div>
              <div>
                <div className="font-bold text-base text-slate-600">{selectedSessionForModal.absentCount}</div>
                <div className="text-slate-500 text-[10px] font-sans">Absent (Marked)</div>
              </div>
            </div>

            {/* Students List in Session */}
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
              {sessionRecords.map(rec => (
                <div key={rec.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{rec.studentName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{rec.matricNumber}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-slate-400">{rec.checkInTime}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        rec.status === 'PRESENT'
                          ? 'bg-slate-100 text-slate-950 border border-slate-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleExportSessionPDF(selectedSessionForModal)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Official PDF Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
