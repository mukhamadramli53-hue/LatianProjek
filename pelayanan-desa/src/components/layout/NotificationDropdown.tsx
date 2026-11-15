"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  FilePlus2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileDown,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  getRecentNotifications,
  getMyUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notification";

interface NotificationDropdownProps {
  userRole: Role;
  initialUnreadCount?: number;
}

interface RecentNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
  application: {
    id: string;
    nomor_pengajuan: string;
    status: string;
    service?: { name: string } | null;
  } | null;
}

function formatRelativeTime(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return "Baru saja";
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function getCategoryConfig(type: string, title: string, status?: string) {
  const lowerTitle = title.toLowerCase();

  if (type === "APPLICATION_CREATED" || lowerTitle.includes("baru masuk") || lowerTitle.includes("berhasil dikirim")) {
    return {
      icon: FilePlus2,
      gradient: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
      label: "Pengajuan Baru",
    };
  }

  if (type === "DOCUMENT_REPAIR" || lowerTitle.includes("perbaikan") || lowerTitle.includes("revisi")) {
    return {
      icon: AlertTriangle,
      gradient: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
      label: "Perbaikan Berkas",
    };
  }

  if (type === "APPROVED" || lowerTitle.includes("disetujui")) {
    return {
      icon: CheckCircle2,
      gradient: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
      label: "Persetujuan",
    };
  }

  if (type === "COMPLETED" || lowerTitle.includes("resmi terbit") || lowerTitle.includes("selesai")) {
    return {
      icon: FileDown,
      gradient: "linear-gradient(310deg, #2dce89 0%, #11cdef 100%)",
      label: "Surat Terbit",
    };
  }

  if (lowerTitle.includes("ditolak") || status === "DITOLAK") {
    return {
      icon: XCircle,
      gradient: "linear-gradient(310deg, #f5365c 0%, #f56036 100%)",
      label: "Penolakan",
    };
  }

  if (lowerTitle.includes("review") || lowerTitle.includes("kendali mutu") || status === "REVIEW_SUPERVISOR") {
    return {
      icon: ShieldCheck,
      gradient: "linear-gradient(310deg, #825ee4 0%, #5e72e4 100%)",
      label: "Kendali Mutu",
    };
  }

  return {
    icon: Clock,
    gradient: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
    label: "Status",
  };
}

export default function NotificationDropdown({
  userRole,
  initialUnreadCount = 0,
}: NotificationDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<RecentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sinkronisasi unread count jika prop berubah
  const [prevInitial, setPrevInitial] = useState(initialUnreadCount);
  if (prevInitial !== initialUnreadCount) {
    setPrevInitial(initialUnreadCount);
    setUnreadCount(initialUnreadCount);
  }

  // Polling berkala (20 detik) & sinkronisasi saat tab browser aktif kembali
  useEffect(() => {
    let isMounted = true;

    async function syncBadge() {
      try {
        const count = await getMyUnreadNotificationCount();
        if (isMounted) {
          setUnreadCount(count);
        }
      } catch {
        // Abaikan kegagalan jaringan saat background sync
      }
    }

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncBadge();
        if (isOpen) {
          getRecentNotifications(6)
            .then((res) => {
              if (res.success && isMounted) {
                setItems(res.notifications);
                setUnreadCount(res.unreadCount);
              }
            })
            .catch(() => {});
        }
      }
    }, 20000);

    function handleVisibility() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncBadge();
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibility);
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibility);
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [isOpen]);

  // Tentukan rute tujuan detail & halaman riwayat penuh
  const getHistoryRoute = () => {
    switch (userRole) {
      case "STAF":
        return "/staf/notifikasi";
      case "SUPERVISOR":
        return "/supervisor/notifikasi";
      case "KEPALA_DESA":
        return "/kades/notifikasi";
      case "WARGA":
      default:
        return "/warga/notifikasi";
    }
  };

  const getApplicationRoute = (applicationId: string) => {
    switch (userRole) {
      case "STAF":
        return `/staf/pengajuan/${applicationId}`;
      case "SUPERVISOR":
        return `/supervisor/pengajuan/${applicationId}`;
      case "KEPALA_DESA":
        return `/kades/persetujuan/${applicationId}`;
      case "WARGA":
      default:
        return `/warga/pengajuan/${applicationId}`;
    }
  };

  // Muat notifikasi terbaru saat dropdown dibuka
  async function fetchNotifications() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getRecentNotifications(6);
      if (result.success) {
        setItems(result.notifications);
        setUnreadCount(result.unreadCount);
      } else {
        setError(result.error || "Gagal memuat notifikasi.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba kembali.");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleDropdown() {
    if (!isOpen) {
      setIsOpen(true);
      fetchNotifications();
    } else {
      setIsOpen(false);
    }
  }

  // Tandai 1 notifikasi dibaca dan navigasi
  async function handleItemClick(item: RecentNotification) {
    if (!item.isRead) {
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(item.id).catch(console.error);
    }

    setIsOpen(false);
    if (item.application?.id) {
      router.push(getApplicationRoute(item.application.id));
    } else {
      router.push(getHistoryRoute());
    }
  }

  // Tandai 1 notifikasi dibaca dari tombol centang
  async function handleQuickRead(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await markNotificationRead(id);
  }

  // Tandai semua notifikasi sudah dibaca
  async function handleMarkAllRead() {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await markAllNotificationsRead();
    } catch {
      // rollback jika gagal
      fetchNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  }

  // Listener untuk menutup dropdown saat klik di luar atau menekan tombol Esc
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* ── Trigger Bell Button ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        title="Pusat Notifikasi"
        aria-label={`Notifikasi${unreadCount ? `, ${unreadCount} belum dibaca` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{
          position: "relative",
          cursor: "pointer",
          padding: "7px 10px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: isOpen ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          borderRadius: 8,
          color: "#ffffff",
          transition: "all 0.2s ease",
          outline: "none",
        }}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#f5365c",
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 800,
              padding: "2px 5px",
              borderRadius: 10,
              minWidth: 16,
              height: 16,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 5px rgba(245, 54, 92, 0.5)",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel (Argon 2 Glassmorphic / Solid Clean Card) ── */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Panel Notifikasi"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 380,
            maxWidth: "calc(100vw - 24px)",
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.18), 0 0 1px 1px rgba(0, 0, 0, 0.08)",
            zIndex: 1100,
            overflow: "hidden",
            animation: "fadeInDropdown 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header Panel */}
          <div
            style={{
              padding: "16px 18px",
              background: "linear-gradient(310deg, #1e293b 0%, #0f172a 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" }}>
                Notifikasi
              </span>
              {unreadCount > 0 ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: "rgba(94, 114, 228, 0.35)",
                    border: "1px solid rgba(94, 114, 228, 0.5)",
                    color: "#93c5fd",
                  }}
                >
                  {unreadCount} baru
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Semua terbaca</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#93c5fd",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  borderRadius: 6,
                  transition: "all 0.15s ease",
                }}
              >
                {isMarkingAll ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCheck size={14} />
                )}
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* Body Content */}
          <div
            style={{
              maxHeight: 390,
              overflowY: "auto",
              padding: "6px 0",
              background: "#ffffff",
            }}
          >
            {/* Loading State */}
            {isLoading && (
              <div style={{ padding: "28px 16px", textAlign: "center", color: "#64748b" }}>
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px", color: "#5e72e4" }} />
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600 }}>Memuat notifikasi...</p>
              </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <div style={{ padding: "20px 18px", textAlign: "center" }}>
                <div style={{ color: "#f5365c", fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
                  ⚠️ {error}
                </div>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={12} />
                  Coba Kembali
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && items.length === 0 && (
              <div style={{ padding: "34px 20px", textAlign: "center" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 10px",
                    color: "#94a3b8",
                  }}
                >
                  <BellOff size={22} />
                </div>
                <h5 style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: "#334155" }}>
                  Belum Ada Notifikasi
                </h5>
                <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                  Pemberitahuan perkembangan pengajuan Anda akan muncul di sini.
                </p>
              </div>
            )}

            {/* Notification Items */}
            {!isLoading &&
              !error &&
              items.map((item) => {
                const cfg = getCategoryConfig(item.type, item.title, item.application?.status);
                const IconComponent = cfg.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      borderBottom: "1px solid #f1f5f9",
                      background: !item.isRead ? "rgba(94, 114, 228, 0.04)" : "#ffffff",
                      transition: "background 0.15s ease",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = !item.isRead
                        ? "rgba(94, 114, 228, 0.08)"
                        : "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = !item.isRead
                        ? "rgba(94, 114, 228, 0.04)"
                        : "#ffffff";
                    }}
                  >
                    {/* Category Avatar */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: cfg.gradient,
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 3px 8px rgba(0, 0, 0, 0.12)",
                      }}
                    >
                      <IconComponent size={17} strokeWidth={2.4} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 6,
                          marginBottom: 2,
                        }}
                      >
                        <h6
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: !item.isRead ? 800 : 700,
                            color: !item.isRead ? "#0f172a" : "#334155",
                            lineHeight: 1.35,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title}
                        </h6>

                        {/* Unread dot */}
                        {!item.isRead && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#5e72e4",
                              flexShrink: 0,
                              boxShadow: "0 0 6px rgba(94, 114, 228, 0.8)",
                            }}
                          />
                        )}
                      </div>

                      <p
                        style={{
                          margin: "0 0 6px",
                          fontSize: 12,
                          color: "#64748b",
                          lineHeight: 1.45,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.message}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: "#94a3b8",
                        }}
                      >
                        <span>
                          {formatRelativeTime(item.createdAt)}
                          {item.application?.nomor_pengajuan && ` • ${item.application.nomor_pengajuan}`}
                        </span>

                        {!item.isRead && (
                          <button
                            type="button"
                            title="Tandai sudah dibaca"
                            onClick={(e) => handleQuickRead(e, item.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#5e72e4",
                              cursor: "pointer",
                              padding: "2px 4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 2,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            <Check size={12} />
                            Baca
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Footer Link: Menuju Halaman Khusus Riwayat Penuh */}
          <div
            style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <Link
              href={getHistoryRoute()}
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#5e72e4",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "color 0.15s ease",
              }}
            >
              Lihat Seluruh Riwayat Notifikasi <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
