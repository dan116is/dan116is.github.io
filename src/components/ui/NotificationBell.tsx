"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAppStore, selectUnreadCount, selectRecentNotifications } from "@/store/useAppStore";

const TYPE_COLORS = {
  info: "text-blue-400",
  success: "text-green-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  game: "text-purple-400",
  transaction: "text-yellow-500",
};

const TYPE_DOT = {
  info: "bg-blue-400",
  success: "bg-green-400",
  warning: "bg-yellow-400",
  error: "bg-red-400",
  game: "bg-purple-400",
  transaction: "bg-yellow-500",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = useAppStore(selectUnreadCount);
  const notifications = useAppStore(selectRecentNotifications);
  const { markNotificationRead, markAllNotificationsRead } = useAppStore();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-yellow-500/30 transition-all"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-4 h-4 text-gray-300" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 z-50 bg-[#0f0f2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <ul>
                  {notifications.map((notif) => (
                    <li key={notif.id}>
                      {notif.href ? (
                        <Link
                          href={notif.href}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            setOpen(false);
                          }}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${
                            !notif.read ? "bg-white/[0.02]" : ""
                          }`}
                        >
                          <NotifContent notif={notif} />
                        </Link>
                      ) : (
                        <div
                          onClick={() => markNotificationRead(notif.id)}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors ${
                            !notif.read ? "bg-white/[0.02]" : ""
                          }`}
                        >
                          <NotifContent notif={notif} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 px-4 py-3">
              <Link
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
              >
                View all notifications
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotifContent({
  notif,
}: {
  notif: {
    id: string;
    type: "info" | "success" | "warning" | "error" | "game" | "transaction";
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  };
}) {
  return (
    <>
      {/* Type dot */}
      <div className="flex-shrink-0 mt-1">
        <div className={`w-2 h-2 rounded-full ${TYPE_DOT[notif.type]}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-xs font-semibold truncate ${
              TYPE_COLORS[notif.type]
            }`}
          >
            {notif.title}
          </p>
          {!notif.read && (
            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1" />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
          {notif.message}
        </p>
        <p className="text-[10px] text-gray-600 mt-1">
          {timeAgo(notif.createdAt)}
        </p>
      </div>
    </>
  );
}
