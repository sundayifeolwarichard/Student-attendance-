import React from 'react';
import { User, UserRole } from '../../types';
import { db } from '../../services/db';
import { GraduationCap, BookOpen, ShieldCheck, RefreshCw } from 'lucide-react';

interface QuickRoleSwitcherProps {
  currentUser?: User | null;
  currentUserId?: string;
  onSwitchRole?: (role: UserRole) => void;
  onRoleChange?: (userId: string) => void;
}

export const QuickRoleSwitcher: React.FC<QuickRoleSwitcherProps> = ({
  currentUser,
  currentUserId,
  onSwitchRole,
  onRoleChange,
}) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const activeId = currentUser?.id || currentUserId || db.getActiveUserId() || '';

  React.useEffect(() => {
    setUsers(db.getUsers());
  }, []);

  const student = users.find(u => u.role === 'student' && u.email.includes('john.adewale')) || users.find(u => u.role === 'student');
  const allLecturers = users.filter(u => u.role === 'lecturer');
  const lecturer = allLecturers.find(u => u.id === activeId) || allLecturers[0];
  const admin = users.find(u => u.role === 'admin');

  const handleSelectUser = (user: User) => {
    if (onRoleChange) {
      onRoleChange(user.id);
    } else if (onSwitchRole) {
      onSwitchRole(user.role);
    } else {
      db.setActiveUserId(user.id);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xs text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 shadow-2xl">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[10px] sm:text-[11px]">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
          Role Switcher:
        </span>
        <span className="text-slate-400 text-[10px] hidden md:inline">
          Switch test accounts instantly
        </span>
      </div>

      <div className="flex items-center gap-2">
        {student && (
          <button
            id="role-switch-student-btn"
            onClick={() => handleSelectUser(student)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium text-[11px] ${
              activeId === student.id || (currentUser?.role === 'student' && !currentUser?.email.includes('staff'))
                ? 'bg-white text-slate-950 font-bold shadow-xs'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
            title="Switch to Student: John Adewale (HND/CS/24/001)"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student ({student.name.split(' ')[0]})</span>
          </button>
        )}

        {allLecturers.length > 1 ? (
          <div className="relative inline-flex items-center">
            <select
              id="role-switch-lecturer-select"
              value={currentUser?.role === 'lecturer' ? (currentUser?.id || lecturer?.id) : ''}
              onChange={e => {
                const target = allLecturers.find(l => l.id === e.target.value);
                if (target) handleSelectUser(target);
              }}
              className={`text-[11px] py-1 px-2.5 rounded-lg border appearance-none pr-6 cursor-pointer font-medium transition-all ${
                currentUser?.role === 'lecturer'
                  ? 'bg-white text-slate-950 font-bold border-white shadow-xs'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <option value="" disabled>Lecturer ({allLecturers.length} accounts)...</option>
              {allLecturers.map(l => (
                <option key={l.id} value={l.id} className="bg-slate-900 text-white font-normal">
                  Lecturer: {l.name}
                </option>
              ))}
            </select>
            <BookOpen className="w-3.5 h-3.5 absolute right-2 pointer-events-none text-slate-400" />
          </div>
        ) : lecturer ? (
          <button
            id="role-switch-lecturer-btn"
            onClick={() => handleSelectUser(lecturer)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium text-[11px] ${
              activeId === lecturer.id || currentUser?.role === 'lecturer'
                ? 'bg-white text-slate-950 font-bold shadow-xs'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
            title="Switch to Lecturer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lecturer ({lecturer.name.split(' ')[0]})</span>
          </button>
        ) : null}

        {admin && (
          <button
            id="role-switch-admin-btn"
            onClick={() => handleSelectUser(admin)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium text-[11px] ${
              activeId === admin.id || currentUser?.role === 'admin'
                ? 'bg-white text-slate-950 font-bold shadow-xs'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
            title="Switch to Administrator: System Administrator"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        )}

        <button
          id="role-reset-demo-data-btn"
          onClick={() => {
            if (confirm('Reset system data to initial clean state?')) {
              db.resetToDefaults();
              window.location.reload();
            }
          }}
          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-800 ml-1 text-[10px]"
          title="Reset database to initial state"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );
};
