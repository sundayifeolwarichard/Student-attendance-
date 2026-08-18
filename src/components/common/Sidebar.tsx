import React from 'react';
import { User, StudentProfile, LecturerProfile } from '../../types';
import { db } from '../../services/db';
import {
  LayoutDashboard,
  QrCode,
  BookOpen,
  History,
  User as UserIcon,
  FileText,
  Users,
  Layers,
  Settings,
  Shield,
  GraduationCap,
  LogOut,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentView,
  onNavigate,
  onLogout,
}) => {
  const studentProfile = currentUser.role === 'student' ? db.getStudentByUserId(currentUser.id) : null;
  const lecturerProfile = currentUser.role === 'lecturer' ? db.getLecturerByUserId(currentUser.id) : null;

  const getNavItems = () => {
    if (currentUser.role === 'student') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'scan', label: 'Scan QR Attendance', icon: QrCode, badge: 'Live' },
        { id: 'courses', label: 'My Courses', icon: BookOpen },
        { id: 'history', label: 'Attendance History', icon: History },
        { id: 'profile', label: 'Digital Student ID', icon: UserIcon },
      ];
    }

    if (currentUser.role === 'lecturer') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'live_session', label: 'Live QR Session', icon: QrCode, badge: 'Active' },
        { id: 'history', label: 'Attendance History', icon: History },
        { id: 'reports', label: 'Course Reports', icon: FileText },
      ];
    }

    if (currentUser.role === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'reports', label: 'Institutional Reports', icon: FileText },
      ];
    }

    return [];
  };

  const navItems = getNavItems();

  const getIdentifier = () => {
    if (currentUser.role === 'student') {
      return studentProfile?.matricNumber || 'ND/CS/24/001';
    }
    if (currentUser.role === 'lecturer') {
      return lecturerProfile?.staffId || 'LECT-0024';
    }
    return 'SYS-ADMIN-01';
  };

  return (
    <aside className="w-64 bg-slate-950 flex flex-col shrink-0 text-white select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onNavigate('dashboard')}
          id="sidebar-logo-brand"
        >
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center font-bold text-slate-950 font-serif text-sm shadow-xs group-hover:scale-105 transition-transform shrink-0">
            The
          </div>
          <div>
            <h1 className="text-white font-bold leading-tight text-xs sm:text-sm tracking-tight font-sans">
              The Polytechnic, Ibadan
            </h1>
            <p className="text-slate-400 text-[10px] tracking-wider font-medium mt-0.5">
              Digital Attendance
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-700 text-white font-bold shadow-md shadow-emerald-700/20'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${
                  isActive ? 'bg-emerald-900 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info & Sign Out Footer */}
      <div className="p-3 mt-auto">
        <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center gap-2.5 mb-2.5">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs border border-slate-700">
                {currentUser.name?.charAt(0) || '?'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-white text-xs font-semibold truncate leading-tight">{currentUser.name}</p>
              <p className="text-slate-400 text-[10px] font-mono mt-0.5">{getIdentifier()}</p>
            </div>
          </div>
          <button
            id="sidebar-signout-btn"
            onClick={onLogout}
            className="w-full text-center text-slate-300 hover:text-white py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
