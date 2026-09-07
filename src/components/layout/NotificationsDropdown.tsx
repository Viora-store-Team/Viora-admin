"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Package,
  Sparkles,
  Store,
  XCircle,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/admin/api";
import type { AppNotification } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load unread count on mount and every 45s
  useEffect(() => {
    let isMounted = true;

    const loadCount = async () => {
      try {
        const res = await fetchUnreadNotificationsCount();
        if (isMounted && res.success && typeof res.unread === "number") {
          setUnreadCount(res.unread);
        }
      } catch {
        // Silently ignore network failures
      }
    };

    loadCount();
    const interval = setInterval(loadCount, 45000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load full list when opening dropdown
  const loadList = async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications(1, 15);
      if (res.success) {
        setNotifications(res.notifications || []);
        if (typeof res.unread === "number") {
          setUnreadCount(res.unread);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadList();
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Mark single notification as read & navigate
  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.readAt) {
      try {
        await markNotificationAsRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
      } catch {
        // ignore
      }
    }

    // Optional navigation based on notification data
    setIsOpen(false);
    if (notif.data?.storeId) {
      router.push(`/stores/${notif.data.storeId}`);
    } else if (notif.data?.orderId || notif.type.startsWith("ORDER_")) {
      router.push("/stores");
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const res = await markAllNotificationsAsRead();
      if (res.success) {
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            readAt: n.readAt || new Date().toISOString(),
          })),
        );
      }
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  // Get color and icon based on notification type
  const getIconMeta = (type: string) => {
    switch (type) {
      case "ORDER_PLACED":
      case "ORDER_ACCEPTED":
      case "ORDER_DELIVERED":
        return {
          icon: <Package className="size-4 text-primary" />,
          bg: "bg-primary/10",
        };
      case "ORDER_REJECTED":
      case "ORDER_CANCELLED":
        return {
          icon: <XCircle className="size-4 text-danger" />,
          bg: "bg-danger/10",
        };
      case "STORE_APPROVED":
      case "STORE_ACTIVATED":
        return {
          icon: <Store className="size-4 text-success" />,
          bg: "bg-success/10",
        };
      case "STORE_REJECTED":
      case "STORE_SUSPENDED":
        return {
          icon: <AlertTriangle className="size-4 text-warning" />,
          bg: "bg-warning/10",
        };
      default:
        return {
          icon: <Bell className="size-4 text-primary" />,
          bg: "bg-primary-soft",
        };
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* 🔔 Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="الإشعارات"
        aria-expanded={isOpen}
        className={`relative grid size-10 place-items-center rounded-xl transition cursor-pointer ${
          isOpen
            ? "bg-primary text-white shadow-xs"
            : "bg-field-bg text-field-label hover:bg-primary-soft hover:text-primary"
        }`}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-danger text-[10px] font-black text-white ring-2 ring-app-bg animate-pulse"
            title={`${unreadCount} إشعار جديد`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 📬 Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute end-0 top-full mt-2.5 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-surface p-0 shadow-2xl backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3.5 bg-field-bg/30 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-heading">الإشعارات</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-extrabold text-danger">
                  {unreadCount} غير مقروء
                </span>
              ) : (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-extrabold text-success">
                  محدّث
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" />
                <span>{markingAll ? "جاري التعليم..." : "تعليم الكل كمقروء"}</span>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Spinner variant="inline" className="size-6 border-2" />
                <p className="mt-2 text-xs font-bold text-text-secondary">
                  جاري جلب الإشعارات...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-2">
                  <Sparkles className="size-6" />
                </span>
                <p className="text-sm font-extrabold text-heading">
                  لا توجد إشعارات حالياً
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  كل تنبيه جديد حول الطلبات والمتاجر سيظهر هنا فوراً.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                const meta = getIconMeta(n.type);

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={`flex w-full items-start gap-3 p-3.5 text-right transition cursor-pointer ${
                      isUnread
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "bg-surface hover:bg-field-bg/60"
                    }`}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ${meta.bg}`}
                    >
                      {meta.icon}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`truncate text-xs ${
                            isUnread
                              ? "font-black text-heading"
                              : "font-bold text-text-secondary"
                          }`}
                        >
                          {n.title}
                        </p>
                        {isUnread && (
                          <span className="size-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>

                      <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                        {n.body}
                      </p>

                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-text-secondary/80">
                        <Clock className="size-3 shrink-0" />
                        <span>{formatDate(n.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
