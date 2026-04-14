"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type NotifLevel = "critical" | "warning" | "info";

export interface Notification {
  id: string;
  title: string;
  message: string;
  level: NotifLevel;
  timestamp: Date;
  read: boolean;
  unitId?: number;
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
  markRead: () => {},
  clearAll: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "init-1",
      title: "Engine #001 — Critical Alert",
      message: "RUL has dropped to 8 cycles. Immediate overhaul required.",
      level: "critical",
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      read: false,
      unitId: 1,
    },
    {
      id: "init-2",
      title: "Engine #005 — Critical Alert",
      message: "Autoencoder reconstruction error exceeds safety threshold.",
      level: "critical",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
      unitId: 5,
    },
    {
      id: "init-3",
      title: "Engine #002 — Warning",
      message: "Fan speed sensor trending downward. Schedule inspection.",
      level: "warning",
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      read: true,
      unitId: 2,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newN: Notification = {
        ...n,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [newN, ...prev].slice(0, 50)); // keep last 50
    },
    []
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, markRead, clearAll }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
