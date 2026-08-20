import React from 'react';
import { AppNotification } from '../../types';
import { db, dbEvents } from '../../services/db';
import { formatWATTime, formatWATShortDate } from '../../utils/time';
import { Bell, CheckCheck, X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  notifications?: AppNotification[];
  currentUserId?: string;
  onNavigate?: (view: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  notifications: propsNotifications,
  currentUserId,
  onNavigate,
}) => {
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const isOpenRef = React.useRef(isOpen);

  React.useEffect(() => {
    isOpenRef.current = isOpen;
    const fetchNotifications = () => {
      if (isOpen) {
        const uid = currentUser?.id || currentUserId;
        const role = currentUser?.role;
        let list: AppNotification[] = [];
        if (propsNotifications) {
          list = Array.isArray(propsNotifications) ? [...propsNotifications] : Array.from(propsNotifications);
        } else if (uid) {
          const rawNotifs = db.getNotifications(uid, role);
          list = Array.isArray(rawNotifs) ? [...rawNotifs] : Array.from(rawNotifs as any);
        }
        
        // Sort newest first
        list.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        
        setNotifications(list);
      }
    };

    fetchNotifications();

    const unsubscribe = dbEvents.on('notifications_updated', fetchNotifications);
    return () => unsubscribe();
  }, [isOpen, propsNotifications, currentUser, currentUserId]);

  if (!isOpen) return null;

  const uid = currentUser?.id || currentUserId;
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    db.markAllNotificationsRead(uid, currentUser?.role);
  };

  const handleItemClick = (notif: AppNotification) => {
    if (!notif.read) {
      db.markNotificationRead(notif.id);
    }
    if (notif.link && onNavigate) {
      if (notif.link.includes('scan')) {
        onNavigate('scan');
      } else if (notif.link.includes('courses')) {
        onNavigate('courses');
      } else if (notif.link.includes('history')) {
        onNavigate('history');
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-white">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-950 text-base">Notifications</h2>
              <p className="text-xs text-slate-500">{unreadCount} unread alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-slate-900 hover:underline inline-flex items-center gap-1 px-2 py-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              id="close-notifications-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Bell className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">No notifications yet</p>
              <p className="text-xs text-slate-400 mt-1">Updates on attendance and sessions will appear here.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                  notif.read
                    ? 'bg-white hover:bg-slate-50 border-transparent opacity-75'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-slate-900 text-white mt-0.5">
                    <Info className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm font-bold truncate ${notif.read ? 'text-slate-700' : 'text-slate-950'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formatWATTime(notif.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-400">
                      <span>{formatWATShortDate(notif.timestamp)}</span>
                      {!notif.read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-slate-900"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
          The Polytechnic, Ibadan • Digital Attendance (WAT)
        </div>
      </div>
    </div>
  );
};
