'use client';

import { motion } from 'framer-motion';
import { X, UserPlus, UserCheck, Trophy, Loader2, CheckCheck, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from './NotificationBell';

interface NotificationDropdownProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function NotificationDropdown({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
}: NotificationDropdownProps) {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="h-4 w-4" />;
      case 'friend_accepted':
        return <UserCheck className="h-4 w-4" />;
      case 'award':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getIconBg = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request':
        return 'bg-gradient-to-r from-blue-400 to-cyan-500';
      case 'friend_accepted':
        return 'bg-gradient-to-r from-green-400 to-emerald-500';
      case 'award':
        return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      default:
        return 'bg-gradient-to-r from-purple-400 to-pink-500';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl shadow-xl overflow-hidden z-50"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1 text-xs font-medium"
              title="Mark all as read"
              style={{ color: 'var(--accent-green)' }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <Bell className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No notifications yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              You'll see friend requests and awards here
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="relative px-4 py-3 transition-colors"
                style={{ 
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: !notification.read ? 'rgba(88, 204, 2, 0.1)' : 'transparent'
                }}
                onClick={() => !notification.read && onMarkAsRead(notification.id)}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getIconBg(notification.type)} flex items-center justify-center text-white shadow-sm`}>
                    {getIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-primary)', fontWeight: !notification.read ? 600 : 500 }}>
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(notification.created_at)}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(notification.id);
                    }}
                    className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                    style={{ color: 'var(--text-muted)', opacity: 1 }}
                    title="Delete"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Unread indicator */}
                {!notification.read && (
                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-green)' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

