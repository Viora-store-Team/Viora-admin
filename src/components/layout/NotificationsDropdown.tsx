"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCheck, Clock, Package, Sparkles, Store, XCircle } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import ErrorBanner from "@/components/ui/ErrorBanner";
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/admin/api";
import type { AppNotification } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";
import { dispatchToast } from "@/lib/toast";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [readingId, setReadingId] = useState<number | null>(null);

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
  const loadList = async (nextPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchNotifications(nextPage, 15);
      if (res.success) {
        setNotifications(prev => nextPage === 1 ? res.notifications || [] : [...prev, ...(res.notifications || []).filter(item => !prev.some(old => old.id === item.id))]);
        setPage(nextPage);
        setTotalPages(res.pagination?.totalPages || 1);
        if (typeof res.unread === "number") {
          setUnreadCount(res.unread);
        }
      } else setError(res.message || "تعذر تحميل الإشعارات");
    } catch {
      setError("تعذر تحميل الإشعارات");
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
    if (readingId !== null) return;
    setError("");
    if (!notif.readAt) {
      setReadingId(notif.id);
      try {
        const res = await markNotificationAsRead(notif.id);
        if (!res.success) { const message = res.message || "تعذر تعليم الإشعار كمقروء"; setError(message); dispatchToast("error", message); return; }
        setUnreadCount((prev) => res.unread ?? Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
      } catch {
        setError("تعذر تعليم الإشعار كمقروء");
        dispatchToast("error", "تعذر تعليم الإشعار كمقروء.");
        return;
      } finally { setReadingId(null); }
    }

    // Optional navigation based on notification data
    setIsOpen(false);
    if (notif.data?.orderId) {
      router.push(`/orders?orderId=${encodeURIComponent(String(notif.data.orderId))}`);
    } else if (notif.type.startsWith("ORDER_")) {
      router.push("/orders");
    } else if (notif.data?.storeId) {
      router.push(`/stores/${encodeURIComponent(String(notif.data.storeId))}`);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setError("");
    try {
      const res = await markAllNotificationsAsRead();
      if (res.success) {
        setUnreadCount(res.unread ?? 0);
        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            readAt: n.readAt || new Date().toISOString(),
          })),
        );
        dispatchToast("success", "تم تعليم الإشعارات كمقروءة.");
      } else { const message = res.message || "تعذر تعليم الإشعارات كمقروءة"; setError(message); dispatchToast("error", message); }
    } catch {
      setError("تعذر تعليم الإشعارات كمقروءة");
      dispatchToast("error", "تعذر تعليم الإشعارات كمقروءة.");
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
          icon: <Package className="size-4 text-primary" strokeWidth={1.75} aria-hidden="true" />,
          bg: "bg-primary/10",
        };
      case "ORDER_REJECTED":
      case "ORDER_CANCELLED":
        return {
          icon: <XCircle className="size-4 text-danger" strokeWidth={1.75} aria-hidden="true" />,
          bg: "bg-danger/10",
        };
      case "STORE_APPROVED":
      case "STORE_ACTIVATED":
        return {
          icon: <Store className="size-4 text-success" strokeWidth={1.75} aria-hidden="true" />,
          bg: "bg-success/10",
        };
      case "STORE_REJECTED":
      case "STORE_SUSPENDED":
        return {
          icon: <AlertTriangle className="size-4 text-warning" strokeWidth={1.75} aria-hidden="true" />,
          bg: "bg-warning/10",
        };
      default:
        return {
          icon: <Bell className="size-4 text-primary" strokeWidth={1.75} aria-hidden="true" />,
          bg: "bg-primary-soft",
        };
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* 🔔 Bell Trigger Button */}
      <IconButton
        label="الإشعارات"
        icon={<Bell className="size-5" strokeWidth={1.75} aria-hidden="true" />}
        onClick={handleToggle}
        onKeyDown={(event) => { if (event.key === "Escape") setIsOpen(false); }}
        aria-expanded={isOpen}
        badge={unreadCount}
        className={isOpen ? "bg-primary-soft text-primary" : undefined}
      />

      {/* 📬 Notifications Dropdown Panel */}
      {isOpen && (
        <div onKeyDown={(event) => { if (event.key === "Escape") setIsOpen(false); }} className="absolute end-0 top-full z-50 mt-2.5 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-0 shadow-pop animate-[viora-drop-in_200ms_ease-out] sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl border-b border-border bg-surface-muted px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-heading">الإشعارات</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-bold text-danger">
                  {unreadCount} غير مقروء
                </span>
              ) : (
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">
                  محدّث
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                variant="ghost" size="sm" className="gap-1 px-2 text-xs"
              >
                <CheckCheck className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>{markingAll ? "جاري التعليم..." : "تعليم الكل كمقروء"}</span>
              </Button>
            )}
          </div>

          {/* Body */}
          <ErrorBanner message={error} onRetry={() => void loadList()} />
          <div className="max-h-[380px] divide-y divide-border overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Spinner variant="inline" className="size-6 border-2" />
                <p className="mt-2 text-xs font-bold text-text-secondary">
                  جاري جلب الإشعارات...
                </p>
              </div>
            ) : notifications.length === 0 && !error ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-2">
                  <Sparkles className="size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <p className="text-sm font-bold text-heading">
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
                  <Button
                    key={n.id}
                    type="button" variant="ghost"
                    onClick={() => handleItemClick(n)}
                    disabled={readingId !== null || markingAll}
                    className={`h-auto w-full items-start justify-start gap-3 rounded-none p-3.5 text-start ${
                      isUnread
                        ? "bg-primary-soft hover:bg-primary-subtle"
                        : "bg-surface hover:bg-surface-muted"
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
                              ? "font-bold text-heading"
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
                        <Clock className="size-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span>{formatDate(n.createdAt)}</span>
                      </div>
                    </div>
                  </Button>
                );
              })
            )}
          </div>
          {page < totalPages && <Button type="button" variant="ghost" disabled={loading} onClick={() => void loadList(page + 1)} className="w-full">تحميل المزيد</Button>}
        </div>
      )}
    </div>
  );
}
