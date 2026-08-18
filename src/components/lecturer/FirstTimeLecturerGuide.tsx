import React, { useState } from 'react';
import {
  BookOpen,
  QrCode,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  Play,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Tv,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Course } from '../../types';

interface FirstTimeLecturerGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemoSession?: () => void;
  courses?: Course[];
}

export const FirstTimeLecturerGuide: React.FC<FirstTimeLecturerGuideProps> = ({
  isOpen,
  onClose,
  onStartDemoSession,
  courses = []
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  if (!isOpen) return null;

  const totalSteps = 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-300">
        {/* Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
                Polytechnic Ibadan • Lecturer Orientation
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5 font-serif">
                First-Time Lecturer Quick Start Guide
              </h2>
            </div>
          </div>
          <button
            id="close-lecturer-guide-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar & Step Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { num: 1, title: 'How It Works' },
              { num: 2, title: 'Starting Attendance' },
              { num: 3, title: 'In-Class Projection' },
              { num: 4, title: 'Live Roll Call' },
              { num: 5, title: 'NBTE 75% Reports' },
            ].map((step) => (
              <button
                key={step.num}
                id={`guide-step-tab-${step.num}`}
                onClick={() => setActiveStep(step.num)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeStep === step.num
                    ? 'bg-slate-950 text-white shadow-xs'
                    : activeStep > step.num
                    ? 'bg-slate-200 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-200/70'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold ${
                    activeStep === step.num
                      ? 'bg-white text-slate-950'
                      : activeStep > step.num
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {activeStep > step.num ? '✓' : step.num}
                </span>
                <span>{step.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-800 text-sm leading-relaxed">
          {/* STEP 1: How It Works */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-900 shrink-0">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Smart Rolling QR Codes vs. Proxy Attendance
                  </h3>
                  <p className="text-slate-600 mt-1 text-xs sm:text-sm">
                    Unlike static barcodes or printed sheets, The Polytechnic Ibadan attendance system generates a dynamic QR code that refreshes every 10 seconds with cryptographic tokens.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-900" />
                    <span>Anti-Screenshot</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    A forwarded screenshot or photo expires within 10 seconds, preventing proxy check-ins.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-900" />
                    <span>Automated Timers</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Set a countdown timer (e.g. 10 or 15 mins). Attendance closes automatically when time runs out.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-900" />
                    <span>Verified Roster</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Only students officially registered in your course code can successfully submit attendance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Starting Attendance */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-900 shrink-0">
                  <Play className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Configuring and Launching a Session
                  </h3>
                  <p className="text-slate-600 mt-1 text-xs sm:text-sm">
                    In less than 15 seconds, you can select your allocated course and configure classroom parameters:
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Select Allocated Course</h4>
                    <p className="text-[11px] text-slate-600">Choose from your assigned courses (e.g. CSC 401 or CSC 311).</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Enter Lecture Venue / Hall</h4>
                    <p className="text-[11px] text-slate-600">e.g. Science Complex Lab 3, ETF Hall 2, etc.</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Choose Session Duration</h4>
                    <p className="text-[11px] text-slate-600">Standard classroom duration: 10 or 15 minutes.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: In-Class Projection */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-900 shrink-0">
                  <Tv className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Projecting the Live QR on Classroom Screens
                  </h3>
                  <p className="text-slate-600 mt-1 text-xs sm:text-sm">
                    Connect your laptop or tablet to the lecture hall projector or podium display.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-slate-900" />
                  <span>1-Click "Full Screen Projector" Mode:</span>
                </div>
                <p className="text-xs text-slate-600">
                  Click the <strong>"Full Screen Projector"</strong> button inside the live session. This expands the QR code into a high-visibility projector mode with big countdown numbers and audio scan beeps so students can scan from anywhere in the lecture hall.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Live Roll Call */}
          {activeStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-900 shrink-0">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Live Stream Roster & Manual Exceptions
                  </h3>
                  <p className="text-slate-600 mt-1 text-xs sm:text-sm">
                    Watch the live attendee list update in real time as each student scans in.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-slate-900" />
                  <span>What if a student's phone battery died in class?</span>
                </div>
                <p className="text-xs text-slate-600">
                  Use the <strong>"Manual Add by Matric"</strong> button in the live session. Simply enter the student's matriculation number (e.g. <code>HND/CS/24/001</code>) and select a reason (e.g. "Device battery exhausted") to safely credit their attendance on the spot.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: NBTE 75% Reports */}
          {activeStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-900 shrink-0">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Automated NBTE 75% Exam Eligibility Audit
                  </h3>
                  <p className="text-slate-600 mt-1 text-xs sm:text-sm">
                    Never spend hours manually calculating percentages from paper sheets again.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-slate-900" />
                  <span>Instant 1-Click PDF / CSV Export:</span>
                </div>
                <p className="text-xs text-slate-600">
                  Navigate to <strong>Course Reports</strong> anytime to download the official NBTE-compliant attendance register with automated <em>ELIGIBLE</em> or <em>EXAM BARRED</em> statuses for the Head of Department.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
            disabled={activeStep === 1}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              activeStep === 1 ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {activeStep < totalSteps ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                id="guide-finish-and-start-btn"
                onClick={() => {
                  onClose();
                  if (onStartDemoSession) {
                    onStartDemoSession();
                  }
                }}
                className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all hover:scale-105"
              >
                <Play className="w-3.5 h-3.5 text-white" />
                <span>Launch First Attendance Session</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
