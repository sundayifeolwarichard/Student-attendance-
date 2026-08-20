import React, { useState, useEffect } from 'react';
import { User, StudentProfile, LecturerProfile } from '../../types';
import { db, dbEvents } from '../../services/db';
import { formatWATTime, formatWATDate } from '../../utils/time';
import {
  Bell,
  LogOut,
  Clock,
  Menu,
  X,
  QrCode,
  LayoutDashboard,
  BookOpen,
  FileText,
  History,
  User as UserIcon,
  ShieldCheck,
  Radio,
  ArrowLeft
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onToggleNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentView,
  onNavigate,
  onLogout,
  onToggleNotifications,
}) => {
  const [currentTime, setCurrentTime] = useState<string>(formatWATTime());
  const [currentDate, setCurrentDate] = useState<string>(formatWATDate());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(formatWATTime());
      setCurrentDate(formatWATDate());
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleNotifUpdate = () => {
      if (currentUser) {
        const notifs = db.getNotifications(currentUser.id, currentUser.role);
        setUnreadCount(notifs.filter(n => !n.read).length);
      }
    };

    handleNotifUpdate();

    const unsubscribe = dbEvents.on('notifications_updated', handleNotifUpdate);
    return () => unsubscribe();
  }, [currentUser]);

  const getNavItems = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'student') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'scan', label: 'Scan QR Attendance', icon: QrCode },
        { id: 'courses', label: 'My Courses', icon: BookOpen },
        { id: 'history', label: 'Attendance History', icon: History },
        { id: 'profile', label: 'Digital Student ID', icon: UserIcon },
      ];
    }
    if (currentUser.role === 'lecturer') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'live_session', label: 'Live QR Session', icon: QrCode },
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

  const getViewTitle = () => {
    if (!currentUser) return 'Polytechnic Attendance System';

    switch (currentView) {
      case 'dashboard':
        return currentUser.role === 'student'
          ? 'Student Attendance Portal'
          : currentUser.role === 'lecturer'
          ? 'Lecturer Attendance Workspace'
          : 'Institutional Administration Console';
      case 'scan':
        return 'Camera QR Code Scanner';
      case 'live_session':
        return 'Live Attendance QR Session';
      case 'history':
        return 'Attendance History & Log';
      case 'courses':
        return 'Course Registrations & Syllabus';
      case 'profile':
        return 'Digital Student Identification';
      case 'reports':
        return 'Institutional Compliance Reports';
      default:
        return 'Dashboard Overview';
    }
  };

  const getStatusBadge = () => {
    if (currentView === 'live_session') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          Broadcasting QR
        </span>
      );
    }
    if (currentUser?.role === 'student') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold uppercase tracking-wider border border-slate-300">
          Verified Student
        </span>
      );
    }
    if (currentUser?.role === 'lecturer') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold uppercase tracking-wider border border-slate-300">
          Academic Staff
        </span>
      );
    }
    if (currentUser?.role === 'admin') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
          Administrator
        </span>
      );
    }
    return null;
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 select-none relative z-30">
      {/* View Title & Role Status */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile toggle button */}
        <button
          id="header-mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Move Back Button */}
        {currentView !== 'dashboard' && (
          <button
            id="move-back-btn"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Move Back to Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden text-[11px]">Back</span>
          </button>
        )}

        <div className="truncate">
          <div className="flex items-center gap-2 truncate">
            <h2 className="font-bold text-sm sm:text-base lg:text-lg text-slate-900 tracking-tight leading-none truncate">
              {getViewTitle()}
            </h2>
            <div className="hidden lg:inline-block shrink-0">
              {getStatusBadge()}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5 hidden sm:block truncate">
            The Polytechnic, Ibadan • Academic Session 2025/2026
          </p>
        </div>
      </div>

      {/* Right Action & Clock Area */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 shrink-0">
        {/* Real-time WAT Clock */}
        <div className="text-right">
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-tight flex items-center justify-end gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
            <span className="hidden xs:inline">West Africa Time (WAT)</span>
            <span className="xs:hidden">WAT</span>
          </p>
          <p className="text-[11px] sm:text-xs lg:text-sm font-mono font-bold text-slate-800 tracking-tight">
            <span className="hidden sm:inline">{currentDate} • </span>{currentTime}
          </p>
        </div>

        {/* Notifications & Action Bar */}
        <div className="flex items-center gap-1 pl-2 sm:pl-3 border-l border-slate-200">
          <button
            id="header-notifications-btn"
            onClick={onToggleNotifications}
            className="relative p-2 text-slate-600 hover:text-black hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Quick Logout for mobile */}
          <button
            id="header-signout-btn"
            onClick={onLogout}
            className="md:hidden p-2 text-slate-500 hover:text-black hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Backdrop Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-start animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Nav Sheet */}
          <div className="relative bg-slate-950 text-white z-10 w-full max-h-[85vh] overflow-y-auto p-4 border-b border-slate-800 shadow-2xl space-y-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  {currentUser?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-none">{currentUser?.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">{currentUser?.role}</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-1 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Menu Options
              </div>

              {currentUser?.role === 'student' && (
                <>
                  <button
                    onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'dashboard' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => { onNavigate('scan'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'scan' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Scan Attendance</span>
                  </button>
                  <button
                    onClick={() => { onNavigate('courses'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'courses' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>My Courses</span>
                  </button>
                  <button
                    onClick={() => { onNavigate('history'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'history' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Attendance History</span>
                  </button>
                  <button
                    onClick={() => { onNavigate('profile'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'profile' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Digital Student ID</span>
                  </button>
                </>
              )}

              {currentUser?.role === 'lecturer' && (
                <>
                  <button
                    onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'dashboard' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => { onNavigate('live_session'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'live_session' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Live QR Session</span>
                  </button>
                  <button
                    onClick={() => { onNavigate('history'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'history' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Attendance History</span>
                  </button>
                  <button
                    onClick={() => { onNavigate('reports'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'reports' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Course Reports</span>
                  </button>
                </>
              )}

              {currentUser?.role === 'admin' && (
                <>
                  <button
                    onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'dashboard' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard Console</span>
                  </button>
                  <button
                    onClick={() => { onNavigate('reports'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-medium flex items-center gap-3 ${
                      currentView === 'reports' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Institutional Reports</span>
                  </button>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                className="w-full text-center px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-2 border border-slate-800 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
