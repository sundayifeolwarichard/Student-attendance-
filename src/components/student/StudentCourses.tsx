import React, { useState, useEffect } from 'react';
import { User, StudentProfile, Course } from '../../types';
import { db } from '../../services/db';
import { BookOpen, User as UserIcon, Calendar, CheckCircle2, ShieldCheck, ArrowLeft, QrCode, LayoutDashboard, History } from 'lucide-react';

interface StudentCoursesProps {
  user: User;
  onNavigate?: (view: string) => void;
}

export const StudentCourses: React.FC<StudentCoursesProps> = ({ user, onNavigate }) => {
  const [student, setStudent] = useState<StudentProfile | null>(
    db.getStudentByUserId(user.id) || null
  );
  const [courses, setCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = () => {
    const s = db.getStudentByUserId(user.id);
    setStudent(s || null);
    if (s) {
      const list = s.enrolledCourseIds
        .map(cid => db.getCourseById(cid))
        .filter((c): c is Course => c !== undefined);
      setCourses(list);
    }
    setAllCourses(db.getCourses());
  };

  const handleRegister = (courseId: string) => {
    if (!student) return;
    db.registerStudentForCourse(student.id, courseId);
    loadData();
  };

  const handleUnregister = (courseId: string) => {
    if (!student) return;
    db.unregisterStudentFromCourse(student.id, courseId);
    loadData();
  };

  if (!student) return null;

  const totalUnits = courses.reduce((sum, c) => sum + (c.units || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-950">
            My Courses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {student.academicSession} Academic Session • {student.programme} ({student.level})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onNavigate && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => onNavigate('scan')}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan Attendance</span>
              </button>
            </div>
          )}
          <div className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 flex items-center gap-2 w-fit">
            <ShieldCheck className="w-4 h-4 text-slate-900" />
            <span>Total Credit Units: <strong>{totalUnits} Units</strong></span>
          </div>
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {isRegistering ? 'Back to My Courses' : 'Register for New Courses'}
          </button>
        </div>
      </div>

      {isRegistering ? (
        /* Course Registration View */
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-lg font-bold text-slate-900">Available Courses for {student.level}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCourses
              .filter(c => c.level === student.level)
              .map(course => {
              const isEnrolled = courses.some(c => c.id === course.id);
              return (
                <div
                  key={course.id}
                  className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-500">{course.code}</span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{course.title}</h3>
                    <p className="text-xs text-slate-600 mt-2">{course.department} • {course.units} Units</p>
                  </div>
                  <button
                    onClick={() => isEnrolled ? handleUnregister(course.id) : handleRegister(course.id)}
                    className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                      isEnrolled
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {isEnrolled ? 'Drop Course' : 'Register'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Enrolled Courses View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div
              key={course.id}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-900 font-bold text-xs font-mono border border-slate-200">
                      {course.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
                      {course.level}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    {course.units} Units
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3 leading-snug font-serif">
                  {course.title}
                </h3>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lecturer: <strong className="text-slate-800">{course.lecturerName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Department: {course.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Semester: {course.semester}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-slate-900 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enrolled</span>
                </span>
                <span className="text-slate-400">TPI Portal Active</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
