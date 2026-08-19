import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { User, StudentProfile, AttendanceRecord, AttendanceSession } from '../../types';
import { db } from '../../services/db';
import { formatWATDate, formatWATTime } from '../../utils/time';
import {
  Camera,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  X,
  LayoutDashboard,
  History,
  BookOpen,
  User as UserIcon,
  ArrowLeft
} from 'lucide-react';

interface StudentScannerProps {
  user: User;
  onNavigate: (view: string) => void;
}

export const StudentScanner: React.FC<StudentScannerProps> = ({
  user,
  onNavigate,
}) => {
  const [student, setStudent] = useState<StudentProfile | null>(
    db.getStudentByUserId(user.id) || null
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Success result modal
  const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null);
  const [successSession, setSuccessSession] = useState<AttendanceSession | null>(null);

  // Error result message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active sessions in system
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>(
    db.getActiveSessions()
  );

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'poly-qr-reader-container';

  useEffect(() => {
    setStudent(db.getStudentByUserId(user.id) || null);
    setActiveSessions(db.getActiveSessions());
  }, [user.id]);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    setErrorMessage(null);
    try {
      if (qrReaderRef.current) {
        try {
          await qrReaderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      qrReaderRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleDecodedToken(decodedText);
        },
        (error) => {
          // scanning frames
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera start error or permission denied:', err);
      setCameraError(
        'Camera permission was not granted or no camera is accessible. You can use manual token testing or upload a QR image below.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (qrReaderRef.current) {
      try {
        await qrReaderRef.current.stop();
        qrReaderRef.current = null;
      } catch (e) {
        // ignore
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    // Automatically trigger camera start with a safe delay to ensure DOM element exists
    const delayTimer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      clearTimeout(delayTimer);
      stopCamera();
    };
  }, []);

  // Process and verify the scanned token
  const handleDecodedToken = async (qrToken: string) => {
    if (isVerifying) return;
    if (!student) {
      setErrorMessage('Student profile not found. Please log in again.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    await stopCamera();

    try {
      const result = db.verifyAndRecordAttendance({
        qrRawValue: qrToken,
        studentUserId: student.userId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Verification failed.');
      }

      // Trigger celebration
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#0f172a', '#334155', '#64748b', '#cbd5e1']
        });
      } catch (e) {
        // ignore
      }

      setSuccessRecord(result.record!);
      setSuccessSession(result.session!);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Upload QR code image fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsVerifying(true);
      const html5QrCode = new Html5Qrcode('file-qr-temp');
      const result = await html5QrCode.scanFile(file, true);
      handleDecodedToken(result);
    } catch (err: any) {
      setErrorMessage('Could not find a valid Polytechnic QR code in the uploaded image.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Page Action Navigation Bar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-2xl text-white shadow-sm border border-slate-800">
        <button
          id="scanner-back-to-dashboard-btn"
          onClick={() => onNavigate('dashboard')}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => onNavigate('history')}
            className="px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={() => onNavigate('courses')}
            className="px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Courses</span>
          </button>
          <button
            onClick={() => onNavigate('profile')}
            className="px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Student ID</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-900 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Student Check-In</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-950">
          Attendance QR Scanner
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          Align your camera with the lecturer's projector or screen to instantly record your classroom attendance.
        </p>
      </div>

      {/* Main Scanner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-slate-100 border-2 border-slate-400 text-slate-900 text-xs sm:text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-slate-950 block mb-0.5">Attendance Not Recorded</span>
              <p className="font-medium text-slate-700">{errorMessage}</p>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                startCamera();
              }}
              className="text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 px-2.5 py-1 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Camera Viewport / Container */}
        <div className="relative mx-auto max-w-sm aspect-square bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-4 border-slate-800">
          <div id={readerElementId} className="w-full h-full"></div>

          {/* Viewfinder Target Overlays */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-full h-full border-2 border-dashed border-white/80 rounded-2xl relative animate-pulse">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white"></div>

                {/* Laser scan line animation */}
                <div className="w-full h-0.5 bg-white absolute top-1/2 -translate-y-1/2 animate-bounce shadow-sm"></div>
              </div>
            </div>
          )}

          {/* Camera Error / Fallback State */}
          {!isScanning && (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3">
              <Camera className="w-12 h-12 text-slate-500 stroke-1" />
              <div className="text-xs text-slate-400 max-w-xs">
                {cameraError || 'Camera is currently paused or inactive.'}
              </div>
              <button
                id="restart-camera-btn"
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Activate Camera</span>
              </button>
            </div>
          )}

          {/* Loading verification overlay */}
          {isVerifying && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white space-y-3 z-30">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-200">
                Verifying token & course registration...
              </p>
            </div>
          )}
        </div>

        {/* Action Controls & Upload Fallback */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {isScanning ? (
            <button
              id="stop-camera-btn"
              onClick={stopCamera}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
            >
              Pause Camera
            </button>
          ) : (
            <button
              id="start-camera-btn"
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              Start Camera Scanner
            </button>
          )}

          {/* Upload QR image input */}
          <label className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors border border-slate-300">
            <span>Upload QR Image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        <div id="file-qr-temp" className="hidden"></div>
      </div>

      {/* Instant Demo Simulation Box */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-900" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Interactive Test Simulators (One-Click Attendance Testing)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Test any verification scenario instantly
          </span>
        </div>

        {activeSessions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-600">
              Active sessions found! Click to simulate scanning lecturer's live QR code:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeSessions.map(sess => (
                <button
                  key={sess.id}
                  id={`simulate-scan-session-${sess.courseCode.replace(/\s+/g, '')}`}
                  onClick={() => handleDecodedToken(sess.qrToken)}
                  className="p-3 rounded-xl bg-slate-950 text-white hover:bg-slate-900 border border-slate-800 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-white">
                      {sess.courseCode} — {sess.courseTitle}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Lecturer: {sess.lecturerName}
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-white text-slate-950 text-[10px] font-bold uppercase">
                    Scan Now
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-800 flex items-center justify-between">
            <span>No live session currently active. Start one in Lecturer portal or simulate below:</span>
            <button
              onClick={() => {
                const newSess = db.createAttendanceSession('course_csc401', 'lecturer_1', 15, 'Lab 3');
                setActiveSessions([newSess]);
              }}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs"
            >
              Start CSC 401 Session
            </button>
          </div>
        )}

        {/* Negative Test Buttons */}
        <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => handleDecodedToken('TPI_EXPIRED_TOKEN_CSC401_PAST')}
            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-medium"
          >
            Test Expired QR Code
          </button>
          <button
            onClick={() => handleDecodedToken('INVALID_GARBAGE_QR_DATA_XYZ')}
            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-medium"
          >
            Test Invalid QR Code
          </button>
          <button
            onClick={() => handleDecodedToken('TPI_TOKEN_ME401_UNREGISTERED')}
            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-medium"
          >
            Test Unregistered Course
          </button>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION MODAL */}
      {successRecord && successSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
            {/* Top decorative stripe */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-600"></div>

            {/* Top Right Cancel / Close Button */}
            <button
              id="cancel-attendance-success-modal-btn"
              onClick={() => {
                setSuccessRecord(null);
                setSuccessSession(null);
                onNavigate('dashboard');
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200"
              title="Cancel & Return to Dashboard"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Checkmark Icon */}
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100 mt-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-950">
              Attendance Recorded!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your attendance has been officially validated and saved.
            </p>

            {/* Official Receipt Card */}
            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-sans">Course:</span>
                <span className="font-bold text-slate-950">{successSession.courseCode} — {successSession.courseTitle}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-sans">Student:</span>
                <span className="font-semibold text-slate-900">{successRecord.studentName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-sans">Matric Number:</span>
                <span className="font-semibold text-slate-900">{successRecord.matricNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-sans">Date:</span>
                <span className="font-semibold text-slate-900">{formatWATDate(successRecord.date)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-sans">Time:</span>
                <span className="font-semibold text-slate-900">{successRecord.checkInTime} WAT</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 font-sans">Status:</span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-bold text-xs tracking-wider">
                  PRESENT
                </span>
              </div>
            </div>

            {/* Modal Action Controls */}
            <div className="space-y-2.5">
              <button
                id="close-cancel-success-modal-btn"
                onClick={() => {
                  setSuccessRecord(null);
                  setSuccessSession(null);
                  onNavigate('dashboard');
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <span>Cancel / Return to Dashboard</span>
              </button>

              <div className="flex gap-2">
                <button
                  id="view-attendance-history-after-scan-btn"
                  onClick={() => {
                    setSuccessRecord(null);
                    setSuccessSession(null);
                    onNavigate('history');
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5 text-slate-700" />
                  <span>View History</span>
                </button>

                <button
                  id="scan-another-code-btn"
                  onClick={() => {
                    setSuccessRecord(null);
                    setSuccessSession(null);
                    startCamera();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-all border border-emerald-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Scan Another</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
