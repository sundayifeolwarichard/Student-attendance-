import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AttendanceRecord, AttendanceSession, Course, StudentProfile, Department } from '../types';
import { formatWATDate, formatWATTime } from './time';
import { db } from '../services/db';

export function exportToCSV(filename: string, rows: (string | number)[][], headers: string[]) {
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(filename: string, sheetName: string, data: any[]) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Attendance');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportSessionAttendanceToCSV(sessionId: string) {
  const session = db.getSessionById(sessionId);
  if (!session) return;
  const records = db.getRecordsForSession(sessionId);

  const headers = ['S/N', 'Student Name', 'Matric Number', 'Department', 'Course Code', 'Date', 'Time (WAT)', 'Status'];
  const rows = records.map((r, idx) => {
    const student = db.getStudentById(r.studentId);
    return [
      idx + 1,
      r.studentName,
      r.matricNumber,
      student?.department || 'Computer Science',
      r.courseCode,
      r.date,
      r.checkInTime,
      'Present'
    ];
  });

  const filename = `Attendance_${session.courseCode.replace(/\s+/g, '_')}_${session.date}`;
  exportToCSV(filename, rows, headers);
}

export function generateAttendancePDFReport(params: {
  title: string;
  subtitle?: string;
  courseCode?: string;
  courseTitle?: string;
  department?: string;
  sessionDate?: string;
  lecturerName?: string;
  headers: string[];
  rows: (string | number)[][];
  summaryStats?: { label: string; value: string | number }[];
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Green header bar matching Polytechnic Ibadan academic theme (#004D2C)
  doc.setFillColor(0, 77, 44);
  doc.rect(0, 0, 210, 24, 'F');

  // Gold accent line (#eab308)
  doc.setFillColor(234, 179, 8);
  doc.rect(0, 24, 210, 2, 'F');

  // Institution title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('THE POLYTECHNIC, IBADAN', 105, 10, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('OYO STATE, NIGERIA • STUDENT QR CODE ATTENDANCE SYSTEM', 105, 16, { align: 'center' });

  // Report Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(params.title.toUpperCase(), 14, 34);

  // Subtitle / Course Details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  let curY = 40;
  if (params.subtitle) {
    doc.text(params.subtitle, 14, curY);
    curY += 5;
  }
  if (params.courseCode && params.courseTitle) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Course: ${params.courseCode} — ${params.courseTitle}`, 14, curY);
    doc.setFont('helvetica', 'normal');
    curY += 5;
  }
  if (params.lecturerName) {
    doc.text(`Lecturer in Charge: ${params.lecturerName}`, 14, curY);
    doc.setFont('helvetica', 'normal');
    curY += 5;
  }
  if (params.sessionDate) {
    doc.text(`Date of Record: ${params.sessionDate} (WAT)`, 14, curY);
    curY += 5;
  }

  // Summary statistics box if provided
  if (params.summaryStats && params.summaryStats.length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, curY, 182, 14, 2, 2, 'FD');

    const colWidth = 182 / params.summaryStats.length;
    params.summaryStats.forEach((stat, idx) => {
      const x = 14 + idx * colWidth + colWidth / 2;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(stat.label, x, curY + 5, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(stat.value), x, curY + 11, { align: 'center' });
    });

    curY += 18;
  }

  // Table
  autoTable(doc, {
    startY: curY + 2,
    head: [params.headers],
    body: params.rows,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 77, 44],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 25 },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Polytechnic Ibadan Smart Attendance System • Generated on ${formatWATDate()} at ${formatWATTime()} (WAT)`,
        14,
        290
      );
      doc.text(`Page ${data.pageNumber}`, 196, 290, { align: 'right' });
    },
  });

  // Save PDF
  const filename = `${params.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
}
