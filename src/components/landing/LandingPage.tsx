import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PolyLogo } from '../common/PolyLogo';
import { UserRole, User } from '../../types';
import { db } from '../../services/db';
import {
  QrCode,
  Users,
  Shield,
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  Activity,
  Calendar,
  Award,
  ChevronRight,
  Fingerprint
} from 'lucide-react';

interface LandingPageProps {
  onSelectRoleLogin?: (role: UserRole) => void;
  onOpenLogin?: (role: UserRole, initialMode?: 'login' | 'register') => void;
  onQuickLogin?: (userId: string) => void;
  onSelectRole?: (role: UserRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectRoleLogin,
  onOpenLogin,
  onQuickLogin,
  onSelectRole,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'student' | 'lecturer' | 'admin'>('student');

  useEffect(() => {
    setUsers(db.getUsers());
  }, []);

  const handleOpenLoginModal = (role: UserRole, mode: 'login' | 'register' = 'login') => {
    if (onOpenLogin) {
      onOpenLogin(role, mode);
    } else if (onSelectRoleLogin) {
      onSelectRoleLogin(role);
    } else if (onSelectRole) {
      onSelectRole(role);
    }
  };

  const handleQuickDemo = (userId: string, role: UserRole) => {
    if (onQuickLogin) {
      onQuickLogin(userId);
    } else if (onSelectRole) {
      onSelectRole(role);
    } else if (onOpenLogin) {
      onOpenLogin(role);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-600 selection:text-white overflow-x-hidden relative">
      {/* Decorative Top Background Mesh */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-emerald-50/60 via-white to-transparent -z-10 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-100/30 blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-100/20 blur-[100px] -z-10 pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-12 py-5 flex items-center justify-between border-b border-slate-200/60 backdrop-blur-md bg-white/40 sticky top-0 z-50">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <PolyLogo size="md" subtitle="Digital Attendance System" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 sm:gap-4"
        >
          <button
            id="nav-sign-in-btn"
            onClick={() => handleOpenLoginModal('student', 'login')}
            className="text-sm font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 rounded-xl px-4 py-2 transition-all cursor-pointer"
          >
            Sign in
          </button>
          <button
            id="nav-register-btn"
            onClick={() => handleOpenLoginModal('student', 'register')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 active:scale-95 text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:shadow-slate-950/10 cursor-pointer"
          >
            Register
          </button>
        </motion.div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-24 flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-8">
          {/* Institution Highlight Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100/80 text-emerald-800 text-xs font-semibold shadow-xs"
          >
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Academic Integrity & Innovation</span>
          </motion.div>

          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 font-serif leading-[1.12]"
            >
              <span className="text-emerald-700">Smart Attendance</span> for <br />
              The Polytechnic, Ibadan.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto"
            >
              A high-speed, secure, and smart QR attendance system. Eliminate proxy check-ins, streamline lecture workflows, and view live stats with complete transparency.
            </motion.p>
          </div>

          {/* Main Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <button
              id="hero-btn-student"
              onClick={() => handleOpenLoginModal('student', 'login')}
              className="px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-lg shadow-emerald-700/20 hover:shadow-xl hover:shadow-emerald-700/30 transition-all hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer"
            >
              I'm a Student
            </button>

            <button
              id="hero-btn-lecturer"
              onClick={() => handleOpenLoginModal('lecturer', 'login')}
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-sm font-semibold shadow-xs transition-all hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer"
            >
              I'm a Lecturer
            </button>

            <button
              id="hero-btn-signin"
              onClick={() => handleOpenLoginModal('student', 'login')}
              className="px-5 py-3.5 text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors flex items-center gap-1 group cursor-pointer"
            >
              Sign in 
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Dynamic Highlight Feature Bento Grid */}
        <div className="mt-24 sm:mt-32">
          <div className="text-center max-w-xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
              Built on academic integrity.
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Every detail is engineered to ensure seamless administrative audits, authentic physical checks, and robust analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Feature 1: QR Code Technology */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-950/[0.02] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 mb-5">
                  <QrCode className="w-5 h-5 stroke-[1.75]" />
                </div>
                <h3 className="font-bold text-slate-950 text-base mb-2">
                  High-Speed QR Checks
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Fast, contactless check-in. Generated class codes dynamically refresh to eliminate buddy check-ins.
                </p>
              </div>
            </motion.div>

            {/* Feature 2: Multi-Role Portals */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-950/[0.02] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 mb-5">
                  <Users className="w-5 h-5 stroke-[1.75]" />
                </div>
                <h3 className="font-bold text-slate-950 text-base mb-2">
                  Role-based Dashboard
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Tailored experiences. Lecturers project QR codes; students manage courses; admins track operations.
                </p>
              </div>
            </motion.div>

            {/* Feature 3: Live Verification */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-200 hover:shadow-md hover:shadow-amber-950/[0.02] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 mb-5">
                  <Fingerprint className="w-5 h-5 stroke-[1.75]" />
                </div>
                <h3 className="font-bold text-slate-950 text-base mb-2">
                  Anti-Proxy Security
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Double check logs. Track session timings, precise locations, and device signatures to ensure honest records.
                </p>
              </div>
            </motion.div>

            {/* Feature 4: Automatic Exports */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-sky-200 hover:shadow-md hover:shadow-sky-950/[0.02] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-750 mb-5">
                  <FileSpreadsheet className="w-5 h-5 stroke-[1.75]" />
                </div>
                <h3 className="font-bold text-slate-950 text-base mb-2">
                  Excel & PDF Audits
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Automate standard NBTE registers. Downloable compliance sheets ready for HOD verification instantly.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-12 py-8 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 mt-20 relative z-10 bg-slate-50/80">
        <div>
          © {new Date().getFullYear()} The Polytechnic, Ibadan. All rights reserved.
        </div>
        <div className="flex items-center gap-5 font-medium">
          <span className="hover:text-slate-800 transition-colors">West Africa Time (WAT)</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 hover:text-emerald-800 transition-colors">Secure Academic System</span>
        </div>
      </footer>
    </div>
  );
};
