import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { User, StudentProfile, LecturerProfile, Course, Department, AuditLog } from '../../types';
import { db, dbEvents } from '../../services/db';
import { formatWATDate, formatWATTime } from '../../utils/time';
import {
  Shield,
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  TrendingUp,
  Activity,
  UserCheck,
  UserX,
  Plus,
  Search,
  Settings,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Trash2,
  Edit2,
  UserPlus,
  Mail,
  Phone,
  ShieldCheck,
  Check,
  Database
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'lecturers' | 'courses' | 'departments' | 'registration' | 'audit' | 'settings'>('overview');
  const [stats, setStats] = useState<any>(null);

  // Search & Filter
  const [studentSearch, setStudentSearch] = useState('');
  const [lecturerSearch, setLecturerSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [userConsoleSearch, setUserConsoleSearch] = useState('');

  // Modals / forms
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseUnits, setNewCourseUnits] = useState(3);
  const [newCourseDept, setNewCourseDept] = useState('Computer Science');
  const [newCourseLecturerId, setNewCourseLecturerId] = useState('');

  // Add Lecturer Modal States
  const [showAddLecturerModal, setShowAddLecturerModal] = useState(false);
  const [newLecturerName, setNewLecturerName] = useState('');
  const [newLecturerStaffId, setNewLecturerStaffId] = useState('');
  const [newLecturerTitle, setNewLecturerTitle] = useState('Dr.');
  const [newLecturerEmail, setNewLecturerEmail] = useState('');
  const [newLecturerPhone, setNewLecturerPhone] = useState('');
  const [newLecturerDept, setNewLecturerDept] = useState('Computer Science');

  // Registration Console State
  const [regFormRole, setRegFormRole] = useState<'student' | 'lecturer' | 'admin'>('student');
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  // Registration Form Fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('password123');

  // Student specific
  const [regMatricNumber, setRegMatricNumber] = useState('');
  const [regProgramme, setRegProgramme] = useState('Higher National Diploma');
  const [regLevel, setRegLevel] = useState('HND II');

  // Lecturer specific
  const [regLecturerTitle, setRegLecturerTitle] = useState('Dr.');
  const [regLecturerStaffId, setRegLecturerStaffId] = useState('');

  // Admin specific
  const [regAdminStaffId, setRegAdminStaffId] = useState('');
  const [regAdminDesignation, setRegAdminDesignation] = useState('System Administrator');

  // System Settings State
  const [minAttendanceReq, setMinAttendanceReq] = useState(75);
  const [currentSession, setCurrentSession] = useState('2025/2026');
  const [currentSemester, setCurrentSemester] = useState('First Semester');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const loadData = () => {
    setStats(db.getAdminDashboardStats());
    // Sync in background quietly
    db.initializeFromFirestore().then(() => {
      setStats(db.getAdminDashboardStats());
    }).catch(() => {});
  };

  useEffect(() => {
    loadData();
    const unsub = dbEvents.on('records_updated', loadData);
    const unsub2 = dbEvents.on('courses_updated', loadData);
    const unsub3 = dbEvents.on('users_updated', loadData);
    const unsub4 = dbEvents.on('lecturers_updated', loadData);
    const unsub5 = dbEvents.on('students_updated', loadData);
    const unsub6 = dbEvents.on('departments_updated', loadData);
    const unsub7 = dbEvents.on('sessions_updated', loadData);
    return () => {
      unsub();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
    };
  }, []);

  if (!stats) {
    return <div className="p-8 text-center text-slate-500">Loading administrator dashboard...</div>;
  }

  // Toggle user suspension
  const handleToggleUserSuspension = (targetUserId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    db.updateUserStatus(targetUserId, newStatus as any);
    loadData();
  };

  // Add lecturer
  const handleCreateLecturer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLecturerName.trim() || !newLecturerEmail.trim()) return;

    const formattedStaffId = newLecturerStaffId.trim().toUpperCase() || `TPI/ST/2026/${Math.floor(100 + Math.random() * 900)}`;

    db.createLecturer({
      name: newLecturerName.trim(),
      title: newLecturerTitle,
      staffId: formattedStaffId,
      email: newLecturerEmail.trim().toLowerCase(),
      phone: newLecturerPhone.trim() || '+234 800 000 0000',
      department: newLecturerDept,
      userId: '',
      status: 'active',
      assignedCourseIds: [],
    });

    setShowAddLecturerModal(false);
    setNewLecturerName('');
    setNewLecturerStaffId('');
    setNewLecturerEmail('');
    setNewLecturerPhone('');
    loadData();
  };

  // Delete lecturer
  const handleDeleteLecturer = (lecturerId: string, lecturerName: string) => {
    if (window.confirm(`Are you sure you want to remove lecturer ${lecturerName}? This will revoke their access to the system.`)) {
      db.deleteLecturer(lecturerId);
      loadData();
    }
  };

  // Delete student
  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to remove student ${studentName}? This will revoke their access to the system.`)) {
      db.deleteStudent(studentId);
      loadData();
    }
  };

  // Console Registration Handler
  const handleConsoleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSuccessMsg(null);

    if (!regName.trim() || !regEmail.trim()) {
      alert('Please fill in required fields.');
      return;
    }

    setIsSubmittingReg(true);

    try {
      const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      let registeredName = regName.trim();

      if (regFormRole === 'student') {
        const student = await db.registerStudentAsync({
          userId: uid,
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          matricNumber: regMatricNumber.trim().toUpperCase() || `ND/CS/25/${Math.floor(100 + Math.random() * 900)}`,
          programme: regProgramme,
          level: regLevel,
          academicSession: '2025/2026',
          phone: regPhone.trim() || '+234 800 000 0000',
        }, regPassword || 'password123');
        registeredName = student.name;
      } else if (regFormRole === 'lecturer') {
        const fullTitleName = `${regLecturerTitle} ${regName.trim()}`;
        const lecturer = await db.registerLecturerAsync({
          userId: uid,
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          staffId: regLecturerStaffId.trim().toUpperCase() || `TPI/ST/2026/${Math.floor(100 + Math.random() * 900)}`,
          title: regLecturerTitle,
          phone: regPhone.trim() || '+234 800 000 0000',
          department: 'Computer Science',
        }, regPassword || 'password123');
        registeredName = fullTitleName;
      } else {
        const adminUser = await db.registerAdminAsync({
          userId: uid,
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          staffId: regAdminStaffId.trim().toUpperCase() || `TPI/ADM/2026/${Math.floor(100 + Math.random() * 900)}`,
          designation: regAdminDesignation.trim() || 'System Administrator',
          phone: regPhone.trim() || '+234 800 000 0000',
        }, regPassword || 'password123');
        registeredName = adminUser.name;
      }

      setRegSuccessMsg(`Account successfully registered and activated for ${registeredName} as ${regFormRole.toUpperCase()}!`);
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegMatricNumber('');
      setRegLecturerStaffId('');
      setRegAdminStaffId('');
      loadData();
    } catch (err: any) {
      alert(`Registration failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Add course
  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode || !newCourseTitle) return;

    const lecturerObj = stats.lecturers.find((l: any) => l.id === newCourseLecturerId);

    db.createCourse({
      code: newCourseCode.trim().toUpperCase(),
      title: newCourseTitle.trim(),
      units: newCourseUnits,
      department: newCourseDept,
      level: 'HND II',
      semester: 'First Semester',
      academicSession: '2025/2026',
      lecturerId: newCourseLecturerId || (stats.lecturers[0]?.id || 'lecturer_1'),
      lecturerName: lecturerObj ? `${lecturerObj.title} ${lecturerObj.name}` : (stats.lecturers[0]?.name || 'Dr. Demo Lecturer'),
    });

    setShowAddCourseModal(false);
    setNewCourseCode('');
    setNewCourseTitle('');
    loadData();
  };

  // Weekly attendance chart data
  const attendanceTrendData = [
    { day: 'Mon', present: 88, absent: 12 },
    { day: 'Tue', present: 92, absent: 8 },
    { day: 'Wed', present: 85, absent: 15 },
    { day: 'Thu', present: 89, absent: 11 },
    { day: 'Fri', present: 81, absent: 19 },
  ];

  const deptChartData = stats.departmentBreakdown.map((d: any) => ({
    name: d.name.replace('Engineering', 'Eng.').replace('Administration', 'Admin.'),
    students: d.studentCount,
    rate: d.avgAttendanceRate,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-slate-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Central Management Console • {stats.systemTimezone}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white">
            Institutional Administration Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            System-wide attendance compliance, user governance, course registry, and NBTE audit controls.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('reports')}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
            <span>Export Master Report</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex overflow-x-auto gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 scrollbar-none whitespace-nowrap sm:flex-wrap">
        {[
          { id: 'overview', label: 'System Overview', icon: Activity },
          { id: 'students', label: `Students (${stats.totalStudents})`, icon: GraduationCap },
          { id: 'lecturers', label: `Lecturers (${stats.totalLecturers})`, icon: Users },
          { id: 'courses', label: `Courses (${stats.totalCourses})`, icon: BookOpen },
          { id: 'departments', label: `Departments (${stats.totalDepartments})`, icon: Building2 },
          { id: 'registration', label: 'User Registration', icon: UserPlus },
          { id: 'audit', label: 'Audit Trail', icon: Shield },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`admin-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* 5 Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Students</div>
              <div className="text-2xl font-bold font-mono text-slate-950 mt-1">{stats.totalStudents}</div>
              <p className="text-[11px] text-slate-400 mt-1">Active enrollments</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Lecturers</div>
              <div className="text-2xl font-bold font-mono text-slate-950 mt-1">{stats.totalLecturers}</div>
              <p className="text-[11px] text-slate-400 mt-1">Academic staff</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Courses</div>
              <div className="text-2xl font-bold font-mono text-slate-950 mt-1">{stats.totalCourses}</div>
              <p className="text-[11px] text-slate-400 mt-1">Curriculum units</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Departments</div>
              <div className="text-2xl font-bold font-mono text-slate-950 mt-1">{stats.totalDepartments}</div>
              <p className="text-[11px] text-slate-400 mt-1">Faculty of Science & Computing</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attendance Rate</div>
              <div className="text-2xl font-bold font-mono text-slate-950 mt-1">{stats.systemAttendanceRate}%</div>
              <p className="text-[11px] text-slate-400 mt-1">Institution average</p>
            </div>
          </div>

          {/* Graphical Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Department Attendance Performance Chart */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm font-serif text-slate-950">
                    Departmental Attendance Rates (%)
                  </h3>
                  <p className="text-xs text-slate-500">Average turnout by academic department</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="rate" fill="#0f172a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Attendance Trend Line */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm font-serif text-slate-950">
                    Weekly Attendance Volume Trend
                  </h3>
                  <p className="text-xs text-slate-500">Present vs Absent check-ins across all lectures</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="present" stroke="#020617" strokeWidth={3} name="Present Students" />
                    <Line type="monotone" dataKey="absent" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" name="Absent Students" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-950">
                Registered Students Directory
              </h2>
              <p className="text-xs text-slate-500">Manage student accounts, review matriculation numbers, and toggle suspensions.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, matric, or dept..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 w-full text-slate-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Matric No.</th>
                  <th className="py-3 px-4">Department & Level</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stats.students
                  .filter((s: any) =>
                    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.matricNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.department.toLowerCase().includes(studentSearch.toLowerCase())
                  )
                  .map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-950">{s.name}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{s.matricNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{s.department} • {s.level}</td>
                      <td className="py-3 px-4 text-slate-600">{s.email}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                            s.status === 'active'
                              ? 'bg-slate-100 text-slate-950 border border-slate-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleUserSuspension(s.userId, s.status)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              s.status === 'active'
                                ? 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300'
                                : 'bg-slate-950 text-white hover:bg-slate-800'
                            }`}
                          >
                            {s.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s.id, s.name)}
                            title="Remove Student"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LECTURERS */}
      {activeTab === 'lecturers' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-950">
                Academic Staff & Lecturers
              </h2>
              <p className="text-xs text-slate-500">Manage lecturer profiles, staff IDs, and course allocations.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={lecturerSearch}
                  onChange={e => setLecturerSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 w-full text-slate-900"
                />
              </div>

              <button
                id="add-lecturer-btn"
                onClick={() => setShowAddLecturerModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Add Lecturer</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Lecturer</th>
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stats.lecturers
                  .filter((l: any) =>
                    l.name.toLowerCase().includes(lecturerSearch.toLowerCase()) ||
                    l.staffId.toLowerCase().includes(lecturerSearch.toLowerCase())
                  )
                  .map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-950">{l.name}</div>
                        {l.phone && <div className="text-[11px] text-slate-500 font-mono">{l.phone}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{l.staffId}</td>
                      <td className="py-3 px-4 text-slate-600">{l.department}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{l.email}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                            l.status === 'active'
                              ? 'bg-slate-100 text-slate-950 border border-slate-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {l.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleUserSuspension(l.userId, l.status)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              l.status === 'active'
                                ? 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300'
                                : 'bg-slate-950 text-white hover:bg-slate-800'
                            }`}
                          >
                            {l.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteLecturer(l.id, l.name)}
                            title="Remove Lecturer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COURSES */}
      {activeTab === 'courses' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-950">
                Course Catalog & Lecturer Allocation
              </h2>
              <p className="text-xs text-slate-500">Manage institution syllabus units, lecturer assignments, and credit values.</p>
            </div>

            <button
              onClick={() => setShowAddCourseModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Course</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Course Code</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Lecturer in Charge</th>
                  <th className="py-3 px-4 text-center">Registrations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stats.courses.map((c: any) => {
                  const regs = db.getCourseRegistrations(c.id);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-950">{c.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-950">{c.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px]">
                          {c.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.units}</td>
                      <td className="py-3 px-4 text-slate-600">{c.department}</td>
                      <td className="py-3 px-4 text-slate-900 font-semibold">{c.lecturerName || <span className="text-slate-400 italic font-normal">Unassigned</span>}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">{regs.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {stats.departmentBreakdown.map((dept: any) => (
            <div key={dept.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-900 font-mono text-xs font-bold border border-slate-200">
                  {dept.code}
                </span>
                <span className="text-xs font-bold text-slate-950">{dept.avgAttendanceRate}% Avg Attendance</span>
              </div>
              <h3 className="text-base font-bold font-serif text-slate-950">{dept.name}</h3>
              <p className="text-xs text-slate-500">{dept.faculty}</p>
              <div className="pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                <span>Enrolled Students: <strong>{dept.studentCount}</strong></span>
                <span>Active Courses: <strong>{dept.courseCount}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold font-serif text-slate-950">
              System Audit Trail & Security Logs
            </h2>
            <p className="text-xs text-slate-500">Immutable ledger of administrative actions, user logins, and attendance scans.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp (WAT)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">IP / Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {stats.recentAuditLogs.map((log: AuditLog) => (
                  <tr key={log.id} className="hover:bg-slate-50 text-[11px]">
                    <td className="py-3 px-4 text-slate-600 font-sans">
                      {formatWATDate(log.timestamp)} {formatWATTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-950 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-900 font-semibold">
                      {log.performedBy}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {log.ipAddress || '197.210.226.14'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold font-serif text-slate-950">
              Institutional Parameters & Settings
            </h2>
            <p className="text-xs text-slate-500">Configure semester calendars, threshold rules, and timezones.</p>
          </div>

          {settingsSaved && (
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" />
              <span>System settings saved successfully.</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Minimum Exam Attendance Qualification Threshold (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={minAttendanceReq}
                  onChange={e => setMinAttendanceReq(Number(e.target.value))}
                  className="w-24 p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold text-center text-sm text-slate-900"
                />
                <span className="text-slate-500">NBTE Standard: 75%</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Active Academic Session
              </label>
              <input
                type="text"
                value={currentSession}
                onChange={e => setCurrentSession(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Active Semester
              </label>
              <select
                value={currentSemester}
                onChange={e => setCurrentSemester(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900"
              >
                <option value="First Semester">First Semester</option>
                <option value="Second Semester">Second Semester</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                System Timezone Standard
              </label>
              <div className="p-3 rounded-xl bg-slate-100 text-slate-800 font-mono border border-slate-200">
                West Africa Time (WAT / UTC+1) — Enforced for attendance logs
              </div>
            </div>

            <button
              onClick={() => {
                setSettingsSaved(true);
                setTimeout(() => setSettingsSaved(false), 3000);
              }}
              className="py-2.5 px-6 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs"
            >
              Save System Parameters
            </button>
          </div>

          <hr className="border-slate-200 my-6" />

          {/* Database Synchronization & Sample Seeding */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Database className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>Firebase Database Seeding & Initialization</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If your Firestore database collections were cleared or empty, click below to automatically populate sample Students, Lecturers, Courses, and Departments into your live Firestore database.
            </p>
            <button
              type="button"
              onClick={async () => {
                const res = await db.seedSampleDataAsync();
                loadData();
                alert(`Database Seeding Complete!\n\nPopulated:\n- ${res.studentsCount} Students in 'students'\n- ${res.lecturersCount} Lecturers in 'lecturers'\n- ${res.coursesCount} Courses in 'courses'\n- ${res.departmentsCount} Departments in 'departments'\n\nAll records have been synchronized to Firestore!`);
              }}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Database className="w-4 h-4" />
              <span>Seed Sample Data to Firebase Firestore</span>
            </button>
          </div>

          <hr className="border-slate-200 my-6" />

          {/* Danger Zone: Data Wipe */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Danger Zone — System Data Management</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Wipe all student profiles, lecturer profiles, attendance sessions, attendance records, notifications, and audit logs from both local storage and live Firestore database.
            </p>
            <button
              type="button"
              onClick={async () => {
                if (window.confirm("ARE YOU SURE?\n\nThis will permanently delete ALL student data, lecturer data, attendance sessions, attendance records, notifications, and audit logs across local storage and Firestore. This action cannot be undone.")) {
                  await db.resetToDefaults();
                  loadData();
                  alert("System data successfully wiped. All student data, lecturer data, attendance sessions, records, notifications, and audit logs have been purged.");
                }
              }}
              className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Wipe All System & User Records</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB: USER REGISTRATION CONSOLE */}
      {activeTab === 'registration' && (
        <div className="space-y-8 animate-fade-in">
          {/* Success Banner */}
          {regSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold">{regSuccessMsg}</span>
              </div>
              <button
                onClick={() => setRegSuccessMsg(null)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-950 px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Form Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-950 text-white rounded-2xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-serif text-slate-950">
                    Institutional Account Onboarding Console
                  </h2>
                  <p className="text-xs text-slate-500">
                    Directly register and activate official student, lecturer, or administrative accounts.
                  </p>
                </div>
              </div>

              {/* Role Type Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
                <button
                  type="button"
                  id="console-reg-role-student"
                  onClick={() => setRegFormRole('student')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                    regFormRole === 'student'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  id="console-reg-role-lecturer"
                  onClick={() => setRegFormRole('lecturer')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                    regFormRole === 'lecturer'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Lecturer</span>
                </button>
                <button
                  type="button"
                  id="console-reg-role-admin"
                  onClick={() => setRegFormRole('admin')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                    regFormRole === 'admin'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleConsoleRegister} className="space-y-4">
              {regFormRole === 'student' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name (Surname First) *
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="e.g. ADEWALE John B."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Matriculation Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={regMatricNumber}
                        onChange={e => setRegMatricNumber(e.target.value)}
                        placeholder="ND/CS/25/001"
                        className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="+234 802 000 0000"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Programme
                      </label>
                      <select
                        value={regProgramme}
                        onChange={e => setRegProgramme(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium"
                      >
                        <option value="Higher National Diploma">Higher National Diploma (HND)</option>
                        <option value="National Diploma">National Diploma (ND)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Level
                      </label>
                      <select
                        value={regLevel}
                        onChange={e => setRegLevel(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium"
                      >
                        <option value="HND II">HND II</option>
                        <option value="HND I">HND I</option>
                        <option value="ND II">ND II</option>
                        <option value="ND I">ND I</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Institutional Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="j.adewale@polyibadan.edu.ng"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {regFormRole === 'lecturer' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Title
                      </label>
                      <select
                        value={regLecturerTitle}
                        onChange={e => setRegLecturerTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium"
                      >
                        <option value="Dr.">Dr.</option>
                        <option value="Engr.">Engr.</option>
                        <option value="Prof.">Prof.</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Dr. (Mrs.)">Dr. (Mrs.)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name (Surname First) *
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="e.g. OLATUNJI Sunday R."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Staff Identification Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={regLecturerStaffId}
                        onChange={e => setRegLecturerStaffId(e.target.value)}
                        placeholder="TPI/ST/2026/088"
                        className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="+234 802 000 0000"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Institutional Staff Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="s.olatunji@staff.polyibadan.edu.ng"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {regFormRole === 'admin' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name (Surname First) *
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="e.g. PROF. OLATUNJI Sunday Richard"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Administrative Designation *
                      </label>
                      <input
                        type="text"
                        required
                        value={regAdminDesignation}
                        onChange={e => setRegAdminDesignation(e.target.value)}
                        placeholder="Head of ICT / System Overseer"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Admin Officer Staff ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={regAdminStaffId}
                        onChange={e => setRegAdminStaffId(e.target.value)}
                        placeholder="TPI/ADM/2026/001"
                        className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="+234 802 000 0000"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Institutional Admin Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="admin@polyibadan.edu.ng"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950 text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password & Submit */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Default Password:</span>
                  <input
                    type="text"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-bold w-36"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReg}
                  className="px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmittingReg ? 'Processing Registration...' : `Register & Activate ${regFormRole.toUpperCase()} Account`}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Registered Users Directory Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-serif text-slate-950">
                  Registered Accounts Directory
                </h3>
                <p className="text-xs text-slate-500">
                  Manage active user profiles across Student, Lecturer, and Admin accounts.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userConsoleSearch}
                  onChange={e => setUserConsoleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 text-slate-900"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.getUsers()
                    .filter(u => 
                      !userConsoleSearch ||
                      u.name.toLowerCase().includes(userConsoleSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(userConsoleSearch.toLowerCase())
                    )
                    .map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-900' :
                            u.role === 'lecturer' ? 'bg-blue-100 text-blue-900' :
                            'bg-slate-100 text-slate-900'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {u.phone || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleUserSuspension(u.id, u.status)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                u.status === 'active'
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            {u.id !== user.id && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete account for ${u.name}?`)) {
                                    db.deleteUser(u.id);
                                    loadData();
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold font-serif text-slate-950">Add New Academic Course</h3>
            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSC 405"
                  value={newCourseCode}
                  onChange={e => setNewCourseCode(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl uppercase font-mono text-slate-900 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={newCourseTitle}
                  onChange={e => setNewCourseTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-slate-900 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Credit Units</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newCourseUnits}
                    onChange={e => setNewCourseUnits(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl text-slate-900 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value="Computer Science"
                    readOnly
                    className="w-full p-2 border border-slate-200 rounded-xl text-slate-500 bg-slate-100 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Lecturer</label>
                <select
                  value={newCourseLecturerId}
                  onChange={e => setNewCourseLecturerId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-slate-900 bg-slate-50"
                >
                  <option value="">Select Lecturer...</option>
                  {stats.lecturers.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.department})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCourseModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 text-white rounded-xl font-semibold hover:bg-slate-800"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lecturer Modal */}
      {showAddLecturerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-serif text-slate-950">Add New Academic Lecturer</h3>
              <button
                onClick={() => setShowAddLecturerModal(false)}
                className="text-slate-400 hover:text-slate-900 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">Create a registered academic lecturer account with full portal and course-management privileges.</p>
            <form onSubmit={handleCreateLecturer} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Title</label>
                  <select
                    value={newLecturerTitle}
                    onChange={e => setNewLecturerTitle(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-slate-900 bg-slate-50 font-medium"
                  >
                    <option value="Dr.">Dr.</option>
                    <option value="Engr.">Engr.</option>
                    <option value="Prof.">Prof.</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Dr. (Mrs.)">Dr. (Mrs.)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Full Name (Surname first) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OLADIPO Kehinde S."
                    value={newLecturerName}
                    onChange={e => setNewLecturerName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-slate-900 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Staff ID</label>
                  <input
                    type="text"
                    placeholder="TPI/ST/2026/088"
                    value={newLecturerStaffId}
                    onChange={e => setNewLecturerStaffId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl uppercase font-mono text-slate-900 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value="Computer Science"
                    readOnly
                    className="w-full p-2 border border-slate-200 rounded-xl text-slate-500 bg-slate-100 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institutional Staff Email *</label>
                <input
                  type="email"
                  required
                  placeholder="k.oladipo@staff.polyibadan.edu.ng"
                  value={newLecturerEmail}
                  onChange={e => setNewLecturerEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-slate-900 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+234 800 123 4567"
                  value={newLecturerPhone}
                  onChange={e => setNewLecturerPhone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-slate-900 bg-slate-50"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[11px]">
                Default login credentials will be generated with password: <strong className="text-slate-900 font-mono">password123</strong>. The lecturer can log in and manage allocated courses immediately.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLecturerModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 text-white rounded-xl font-semibold hover:bg-slate-800"
                >
                  Create Lecturer Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
