import React, { useState, useEffect } from 'react';
import { User, Course, Department, StudentProfile, AttendanceRecord, AttendanceSession } from '../../types';
import { db } from '../../services/db';
import { formatWATDate, formatWATTime, formatWATShortDate, getWATDateString } from '../../utils/time';
import { exportToCSV, exportToExcel, generateAttendancePDFReport } from '../../utils/reports';
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  Filter,
  Calendar,
  Layers,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Download,
  LayoutDashboard,
  QrCode
} from 'lucide-react';

interface ReportsViewProps {
  user: User;
  onNavigate?: (view: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ user, onNavigate }) => {
  const [reportType, setReportType] = useState<string>('course');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(getWATDateString());
  const [selectedSemester, setSelectedSemester] = useState<string>('First Semester');

  const courses = db.getCourses();
  const departments = db.getDepartments();
  const students = db.getStudents();
  const allRecords = db.getRecords();
  const allSessions = db.getSessions();

  // Filter records based on selected options
  const getFilteredData = () => {
    return allRecords.filter(rec => {
      if (selectedCourseId !== 'all' && rec.courseId !== selectedCourseId && rec.courseCode !== selectedCourseId) {
        return false;
      }
      if (reportType === 'daily' && rec.date !== selectedDate) {
        return false;
      }
      return true;
    });
  };

  const filteredRecords = getFilteredData();
  const presentCount = filteredRecords.filter(r => r.status === 'PRESENT').length;
  const absentCount = filteredRecords.filter(r => r.status === 'ABSENT').length;
  const totalRecords = filteredRecords.length;
  const overallRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 100;

  // Export handlers
  const handleExportCSV = () => {
    const headers = ['Course Code', 'Date', 'Time (WAT)', 'Student Name', 'Matric Number', 'Status'];
    const rows = filteredRecords.map(r => [
      r.courseCode,
      formatWATDate(r.date),
      r.checkInTime,
      r.studentName,
      r.matricNumber,
      r.status,
    ]);
    exportToCSV(`TPI_Attendance_Report_${reportType}_${Date.now()}`, rows, headers);
  };

  const handleExportExcel = () => {
    const data = filteredRecords.map(r => ({
      'Course Code': r.courseCode,
      'Date': formatWATDate(r.date),
      'Time (WAT)': r.checkInTime,
      'Student Name': r.studentName,
      'Matriculation Number': r.matricNumber,
      'Status': r.status,
    }));
    exportToExcel(`TPI_Attendance_Report_${reportType}_${Date.now()}`, 'Attendance Report', data);
  };

  const handleExportPDF = () => {
    const headers = ['Course', 'Student Name', 'Matric Number', 'Date', 'Time (WAT)', 'Status'];
    const rows = filteredRecords.map(r => [
      r.courseCode,
      r.studentName,
      r.matricNumber,
      formatWATShortDate(r.date),
      r.checkInTime,
      r.status,
    ]);

    const courseObj = courses.find(c => c.id === selectedCourseId || c.code === selectedCourseId);

    generateAttendancePDFReport({
      title: `${(reportType || '').toUpperCase()} ATTENDANCE REPORT`,
      subtitle: `Academic Session: 2025/2026 • ${selectedSemester}`,
      courseCode: courseObj?.code,
      courseTitle: courseObj?.title,
      headers,
      rows,
      summaryStats: [
        { label: 'Total Records', value: totalRecords },
        { label: 'Present', value: presentCount },
        { label: 'Absent', value: absentCount },
        { label: 'Turnout Rate', value: `${overallRate}%` },
      ],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Top Header & Export CTAs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-950">
            Attendance Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Generate and export institutional compliance sheets for NBTE and Faculty Boards
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <div className="flex items-center gap-2 mr-2">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            </div>
          )}
          <button
            id="export-report-pdf-btn"
            onClick={handleExportPDF}
            className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Official PDF Report</span>
          </button>
          <button
            id="export-report-excel-btn"
            onClick={handleExportExcel}
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            id="export-report-csv-btn"
            onClick={handleExportCSV}
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Report Configuration & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="w-4 h-4 text-slate-900" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Report Parameters & Filtering
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Report Type Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Report Category
            </label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-medium"
            >
              <option value="course">Course Attendance Report</option>
              <option value="daily">Daily Attendance Report</option>
              <option value="weekly">Weekly Attendance Report</option>
              <option value="monthly">Monthly Attendance Report</option>
              <option value="student">Student Attendance Report</option>
              <option value="department">Department Attendance Report</option>
              <option value="semester">Semester Attendance Report</option>
            </select>
          </div>

          {/* Course Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Course
            </label>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-medium"
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-medium"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Target Date (WAT)
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Records</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalRecords}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold uppercase">Present Count</div>
          <div className="text-2xl font-bold font-mono text-slate-950 mt-1">{presentCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold uppercase">Absent Count</div>
          <div className="text-2xl font-bold font-mono text-slate-600 mt-1">{absentCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold uppercase">Overall Turnout</div>
          <div className="text-2xl font-bold font-mono mt-1 text-slate-950">
            {overallRate}%
          </div>
        </div>
      </div>

      {/* Report Data Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Report Data Preview ({filteredRecords.length} Entries)
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Polytechnic Ibadan Archive</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Matric No.</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time (WAT)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No attendance records found matching parameters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono text-slate-900">{rec.courseCode}</td>
                    <td className="py-3 px-4 text-slate-900">{rec.studentName}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{rec.matricNumber}</td>
                    <td className="py-3 px-4 text-slate-800">{formatWATDate(rec.date)}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{rec.checkInTime}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                          rec.status === 'PRESENT'
                            ? 'bg-slate-100 text-slate-950 border border-slate-300'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {rec.status}
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
  );
};
