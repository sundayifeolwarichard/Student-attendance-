import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, StudentProfile } from '../../types';
import { db } from '../../services/db';
import { PolyLogo } from '../common/PolyLogo';
import { GraduationCap, Mail, Phone, Building2, Layers, Calendar, ShieldCheck, User as UserIcon } from 'lucide-react';

interface StudentProfileViewProps {
  user: User;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({ user }) => {
  const [student, setStudent] = useState<StudentProfile | null>(
    db.getStudentByUserId(user.id) || null
  );

  useEffect(() => {
    setStudent(db.getStudentByUserId(user.id) || null);
  }, [user.id]);

  if (!student) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-950">
          Student Profile & Digital ID
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official academic identification card & attendance registration details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Digital Student ID Badge in Black & White */}
        <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
          {/* Top header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <PolyLogo size="sm" textColor="text-white" />
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-950 uppercase tracking-wider">
              STUDENT ID
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar */}
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={student.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-2xl object-cover ring-2 ring-white shadow-md grayscale"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-3xl ring-2 ring-white">
                  {student.name?.charAt(0) || '?'}
                </div>
              )}
              <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-slate-950">
                ACTIVE
              </span>
            </div>

            {/* Basic Info */}
            <div className="text-center sm:text-left space-y-1">
              <h2 className="text-lg sm:text-xl font-bold font-serif text-white">
                {student.name}
              </h2>
              <p className="text-xs font-mono font-bold text-slate-300">
                {student.matricNumber}
              </p>
              <p className="text-xs text-slate-400">
                {student.department}
              </p>
              <p className="text-[11px] text-slate-500">
                {student.level} • {student.programme}
              </p>
            </div>
          </div>

          {/* QR Code section inside ID Card */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                Verification QR
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Session: {student.academicSession}
              </div>
            </div>
            <div className="bg-white p-2 rounded-xl shadow-md">
              <QRCodeSVG
                value={`TPI_STUDENT:${student.matricNumber}:${student.id}`}
                size={64}
                level="M"
              />
            </div>
          </div>
        </div>

        {/* Detailed Info Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-slate-950 border-b border-slate-100 pb-3 flex items-center gap-2 font-serif">
            <GraduationCap className="w-5 h-5 text-slate-900" />
            <span>Academic Records</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">School / Faculty:</span>
              <span className="font-semibold text-slate-900">{student.school}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Department:</span>
              <span className="font-semibold text-slate-900">{student.department}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Programme:</span>
              <span className="font-semibold text-slate-900">{student.programme}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Level:</span>
              <span className="font-semibold text-slate-900">{student.level}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Academic Session:</span>
              <span className="font-semibold text-slate-900">{student.academicSession}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Institutional Email:</span>
              <span className="font-semibold text-slate-900">{student.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Phone Number:</span>
              <span className="font-semibold text-slate-900">{student.phone}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Portal Status:</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-300 font-bold text-[10px]">
                {student.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
