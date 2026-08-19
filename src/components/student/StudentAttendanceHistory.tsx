import React, { useState, useEffect } from 'react';
import { User, StudentProfile, AttendanceRecord, Course } from '../../types';
import { db, dbEvents } from '../../services/db';
import { formatWATDate, formatWATShortDate } from '../../utils/time';
import { exportToCSV, exportToExcel, generateAttendancePDFReport } from '../../utils/reports';
import {
  History,
  Filter,
  Download,
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  FileText,
  FileDown,
  LayoutDashboard,
  QrCode,
  BookOpen
} from 'lucide-react';

interface StudentAttendanceHistoryProps {
  user: User;
  onNavigate?: (view: string) => void;
}

export const StudentAttendanceHistory: React.FC<StudentAttendanceHistoryProps> = ({ user, onNavigate }) => {
  const [student, setStudent] = useState<StudentProfile | null>(
    db.getStudentByUserId(user.id) || null
  );
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Filter states
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchDate, setSearchDate] = useState<string>('');

  const loadData = () => {
    const s = db.getStudentByUserId(user.id);
    setStudent(s || null);
    if (s) {
      const recs = db.getRecordsForStudent(s.id);
      setRecords(recs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      const enrolled = s.enrolledCourseIds
        .map(cid => db.getCourseById(cid))
        .filter((c): c is Course => c !== undefined);
      setCourses(enrolled);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dbEvents.on('records_updated', loadData);
    return () => unsub();
  }, [user.id]);

  if (!student) {
    return <div className="p-8 text-center text-slate-500">Loading student records...</div>;
  }

  // Filter records
  const filteredRecords = records.filter(r => {
    if (selectedCourse !== 'all' && r.courseCode !== selectedCourse && r.courseId !== selectedCourse) {
      return false;
    }
    if (selectedStatus !== 'all' && r.status !== selectedStatus) {
      return false;
    }
    if (searchDate && !r.date.includes(searchDate)) {
      return false;
    }
    return true;
  });

  const presentCount = filteredRecords.filter(r => r.status === 'PRESENT').length;
  const absentCount = filteredRecords.filter(r => r.status === 'ABSENT').length;
  const totalCount = filteredRecords.length;
  const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

  // Export handlers
  const handleExportCSV = () => {
    const headers = ['Course Code', 'Date', 'Time (WAT)', 'Status', 'Matric Number', 'Student Name'];
    const rows = filteredRecords.map(r => [
      r.courseCode,
      formatWATDate(r.date),
      r.checkInTime,
      r.status,
      r.matricNumber,
      r.studentName,
    ]);
    exportToCSV(`TPI_Attendance_${student.matricNumber.replace(/\//g, '_')}`, rows, headers);
  };

  const handleExportExcel = () => {
    const data = filteredRecords.map(r => ({
      'Course Code': r.courseCode,
      'Date': formatWATDate(r.date),
      'Time (WAT)': r.checkInTime,
      'Status': r.status,
      'Matriculation Number': r.matricNumber,
      'Student Name': r.studentName,
    }));
    exportToExcel(`TPI_Attendance_${student.matricNumber.replace(/\//g, '_')}`, 'My Attendance', data);
  };

  const handleExportPDF = () => {
    const headers = ['Course Code', 'Date', 'Time (WAT)', 'Status', 'Matric No.'];
    const rows = filteredRecords.map(r => [
      r.courseCode,
      formatWATShortDate(r.date),
      r.checkInTime,
      r.status,
      r.matricNumber,
    ]);

    generateAttendancePDFReport({
      title: 'Individual Student Attendance Slip',
      subtitle: `Student: ${student.name} • Matric: ${student.matricNumber} • Level: ${student.level}`,
      department: student.department,
      headers,
      rows,
      summaryStats: [
        { label: 'Total Sessions', value: totalCount },
        { label: 'Classes Attended', value: presentCount },
        { label: 'Classes Missed', value: absentCount },
        { label: 'Attendance Rate', value: `${rate}%` },
      ],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-950">
            Attendance History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Verified check-in log for <span className="font-semibold text-slate-800">{student.name}</span> ({student.matricNumber})
          </p>
        </div>

        {/* Navigation & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <div className="flex items-center gap-2 mr-2">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => onNavigate('scan')}
                className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan QR</span>
              </button>
            </div>
          )}
          <button
            id="student-export-pdf-btn"
            onClick={handleExportPDF}
            className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download PDF Slip</span>
          </button>
          <button
            id="student-export-excel-btn"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            id="student-export-csv-btn"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Course filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Course</label>
          <select
            id="filter-course-select"
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-slate-900"
          >
            <option value="all">All Registered Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.code}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Status</label>
          <select
            id="filter-status-select"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-slate-900"
          >
            <option value="all">All Statuses (Present & Absent)</option>
            <option value="PRESENT">PRESENT Only</option>
            <option value="ABSENT">ABSENT Only</option>
          </select>
        </div>

        {/* Date search */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Date</label>
          <input
            type="date"
            value={searchDate}
            onChange={e => setSearchDate(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-slate-900"
          />
        </div>
      </div>

      {/* Summary Stat Strip */}
      <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center font-mono">
        <div>
          <div className="text-lg sm:text-xl font-bold text-slate-900">{totalCount}</div>
          <div className="text-[11px] text-slate-500 font-sans">Filtered Sessions</div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-bold text-slate-950">{presentCount}</div>
          <div className="text-[11px] text-slate-500 font-sans">Present</div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-bold text-slate-600">{absentCount}</div>
          <div className="text-[11px] text-slate-500 font-sans">Absent</div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-bold text-slate-950">
            {rate}%
          </div>
          <div className="text-[11px] text-slate-500 font-sans">Attendance Rate</div>
        </div>
      </div>

      {/* Table of Records */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Time (WAT)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No attendance records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 font-mono block">
                        {rec.courseCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800">
                      {formatWATDate(rec.date)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {rec.checkInTime}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {rec.status === 'PRESENT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-900 border border-slate-300 font-bold text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5 text-slate-900" />
                          PRESENT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 text-slate-700 font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-slate-700" />
                          ABSENT
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
