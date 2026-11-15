"use client";

import Link from "next/link";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileDown,
  FilePlus2,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  XCircle,
  ArrowRight,
  UploadCloud,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Settings,
} from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notification";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date | string;
  application: {
    id: string;
    nomor_pengajuan: string;
    status: string;
    service?: { name: string } | null;
    documents?: Array<{
      id: string;
      requirement_name: string;
      file_name: string;
      storage_key: string;
      file_size?: number;
    }>;
  } | null;
};

type FilterTab = "ALL" | "UNREAD" | "OFFICIAL_LETTER" | "ACTION_REQUIRED" | "DECISIONS";

interface NotificationListProps {
  initial: NotificationItem[];
  baseRoute?: string;
  actorRole?: "WARGA" | "STAF" | "SUPERVISOR" | "KEPALA_DESA";
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
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function formatExactDate(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return (
    date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB"
  );
}

interface CategoryConfig {
  icon: typeof Clock;
  gradient: string;
  badgeBg: string;
  badgeColor: string;
  label: string;
  cardBgRead: string;
  cardBgUnread: string;
  cardBorderRead: string;
  cardBorderUnread: string;
}

function getCategoryConfig(type: string, title: string, status?: string): CategoryConfig {
  const lowerTitle = title.toLowerCase();

  // 1. Surat Resmi Terbit (PDF Siap Diunduh)
  if (
    type === "COMPLETED" ||
    lowerTitle.includes("resmi terbit") ||
    lowerTitle.includes("surat resmi")
  ) {
    return {
      icon: FileDown,
      gradient: "linear-gradient(310deg, #2dce89 0%, #11cdef 100%)",
      badgeBg: "#eafaf3",
      badgeColor: "#2dce89",
      label: "Surat Resmi Terbit",
      cardBgRead: "#fbfdfc",
      cardBgUnread: "#f3fbf7",
      cardBorderRead: "1.5px solid #bbf1dc",
      cardBorderUnread: "1.5px solid #2dce89",
    };
  }

  // 2. Perbaikan Dokumen / Revisi
  if (
    type === "DOCUMENT_REPAIR" ||
    lowerTitle.includes("perbaikan") ||
    lowerTitle.includes("revisi") ||
    status === "PERLU_PERBAIKAN"
  ) {
    return {
      icon: AlertTriangle,
      gradient: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
      badgeBg: "#fff3f0",
      badgeColor: "#fb6340",
      label: "Perlu Perbaikan",
      cardBgRead: "#fffdfc",
      cardBgUnread: "#fff8f6",
      cardBorderRead: "1.5px solid #fed7d0",
      cardBorderUnread: "1.5px solid #fb6340",
    };
  }

  // 3. Persetujuan Resmi
  if (
    type === "APPROVED" ||
    lowerTitle.includes("disetujui") ||
    status === "DISETUJUI"
  ) {
    return {
      icon: CheckCircle2,
      gradient: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
      badgeBg: "#e8f9fd",
      badgeColor: "#2dce89",
      label: "Disetujui",
      cardBgRead: "#ffffff",
      cardBgUnread: "#f6fdfa",
      cardBorderRead: "1px solid #e9ecef",
      cardBorderUnread: "1.5px solid #82e2b9",
    };
  }

  // 4. Penolakan Resmi
  if (
    type === "REJECTED" ||
    lowerTitle.includes("ditolak") ||
    status === "DITOLAK"
  ) {
    return {
      icon: XCircle,
      gradient: "linear-gradient(310deg, #f5365c 0%, #f56036 100%)",
      badgeBg: "#feecee",
      badgeColor: "#f5365c",
      label: "Ditolak",
      cardBgRead: "#ffffff",
      cardBgUnread: "#fff5f6",
      cardBorderRead: "1px solid #fcd2d8",
      cardBorderUnread: "1.5px solid #f5365c",
    };
  }

  // 5. Pengajuan Baru Masuk / Diterima
  if (
    type === "APPLICATION_CREATED" ||
    lowerTitle.includes("baru masuk") ||
    lowerTitle.includes("diterima sistem") ||
    lowerTitle.includes("berhasil dikirim")
  ) {
    return {
      icon: FilePlus2,
      gradient: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
      badgeBg: "#eff2fe",
      badgeColor: "#1171ef",
      label: "Pengajuan Baru",
      cardBgRead: "#ffffff",
      cardBgUnread: "#f8fafd",
      cardBorderRead: "1px solid #e9ecef",
      cardBorderUnread: "1.5px solid #dce4fd",
    };
  }

  // 6. Kendali Mutu / Review Supervisor
  if (
    lowerTitle.includes("review") ||
    lowerTitle.includes("kendali mutu") ||
    status === "REVIEW_SUPERVISOR"
  ) {
    return {
      icon: ShieldCheck,
      gradient: "linear-gradient(310deg, #825ee4 0%, #5e72e4 100%)",
      badgeBg: "#f4f1fd",
      badgeColor: "#825ee4",
      label: "Kendali Mutu",
      cardBgRead: "#ffffff",
      cardBgUnread: "#faf8ff",
      cardBorderRead: "1px solid #e9ecef",
      cardBorderUnread: "1.5px solid #c9bcf7",
    };
  }

  // 7. Pengesahan Kepala Desa
  if (
    lowerTitle.includes("kepala desa") ||
    lowerTitle.includes("approval kades") ||
    status === "APPROVAL_KADES"
  ) {
    return {
      icon: UserCheck,
      gradient: "linear-gradient(310deg, #f5365c 0%, #825ee4 100%)",
      badgeBg: "#feecee",
      badgeColor: "#f5365c",
      label: "Keputusan Kades",
      cardBgRead: "#ffffff",
      cardBgUnread: "#fef8f9",
      cardBorderRead: "1px solid #e9ecef",
      cardBorderUnread: "1.5px solid #f9b6c4",
    };
  }

  // Default: Status Berkas
  return {
    icon: Clock,
    gradient: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
    badgeBg: "#eff2fe",
    badgeColor: "#5e72e4",
    label: "Status Berkas",
    cardBgRead: "#ffffff",
    cardBgUnread: "#f8fafd",
    cardBorderRead: "1px solid #e9ecef",
    cardBorderUnread: "1.5px solid #dce4fd",
  };
}

export default function NotificationList({
  initial,
  baseRoute = "/warga/pengajuan",
  actorRole = "WARGA",
}: NotificationListProps) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  // Loading & Error States
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [isRefreshing, startTransition] = useTransition();
  const [actionError, setActionError] = useState<{
    message: string;
    retryFn: () => Promise<void>;
  } | null>(null);

  // Sync state if initial prop changes
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItems(initial);
  }

  // Sinkronisasi otomatis saat tab browser kembali aktif
  useEffect(() => {
    function handleVisibilityChange() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        startTransition(() => {
          router.refresh();
        });
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityChange);
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityChange);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [router]);

  // Handlers
  async function handleRead(id: string) {
    setLoadingActionId(id);
    setActionError(null);
    try {
      await markNotificationRead(id);
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
    } catch {
      setActionError({
        message: "Gagal menandai notifikasi sebagai sudah dibaca. Silakan coba kembali.",
        retryFn: () => handleRead(id),
      });
    } finally {
      setLoadingActionId(null);
    }
  }

  async function handleReadAll() {
    if (isMarkingAll) return;
    setIsMarkingAll(true);
    setActionError(null);
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch {
      setActionError({
        message: "Gagal menandai semua notifikasi sudah dibaca. Silakan coba kembali.",
        retryFn: handleReadAll,
      });
    } finally {
      setIsMarkingAll(false);
    }
  }

  function handleRefresh() {
    setActionError(null);
    startTransition(() => {
      router.refresh();
    });
  }

  // Tab change handler (resets page to 1)
  function handleFilterChange(newFilter: FilterTab) {
    setFilter(newFilter);
    setCurrentPage(1);
  }

  // Calculations
  const unreadCount = items.filter((n) => !n.isRead).length;

  const letterCount = items.filter((n) => {
    const isLetterType =
      n.title.toLowerCase().includes("surat resmi") || n.type === "COMPLETED";
    const hasDoc = n.application?.documents?.some(
      (d) =>
        d.requirement_name === "Surat Resmi Terbit (PDF)" ||
        d.requirement_name.toLowerCase().includes("surat resmi")
    );
    return isLetterType && hasDoc;
  }).length;

  const actionRequiredCount = items.filter(
    (n) => n.type === "DOCUMENT_REPAIR" || n.title.toLowerCase().includes("perbaikan")
  ).length;

  const decisionsCount = items.filter(
    (n) =>
      n.type === "APPROVED" ||
      n.type === "REJECTED" ||
      n.title.toLowerCase().includes("disetujui") ||
      n.title.toLowerCase().includes("ditolak")
  ).length;

  // Filtered array
  const filteredItems = items.filter((item) => {
    if (filter === "UNREAD") return !item.isRead;
    if (filter === "OFFICIAL_LETTER") {
      const isLetterType =
        item.title.toLowerCase().includes("surat resmi") || item.type === "COMPLETED";
      const hasDoc = item.application?.documents?.some(
        (d) =>
          d.requirement_name === "Surat Resmi Terbit (PDF)" ||
          d.requirement_name.toLowerCase().includes("surat resmi")
      );
      return isLetterType && hasDoc;
    }
    if (filter === "ACTION_REQUIRED") {
      return item.type === "DOCUMENT_REPAIR" || item.title.toLowerCase().includes("perbaikan");
    }
    if (filter === "DECISIONS") {
      return (
        item.type === "APPROVED" ||
        item.type === "REJECTED" ||
        item.title.toLowerCase().includes("disetujui") ||
        item.title.toLowerCase().includes("ditolak")
      );
    }
    return true;
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
        border: "1px solid rgba(0, 0, 0, 0.05)",
        padding: "24px 26px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* ── Top Bar: Filter Tabs & Global Actions ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: "1px solid #f0f2f5",
          paddingBottom: 16,
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {/* Semua */}
          <button
            type="button"
            onClick={() => handleFilterChange("ALL")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              border: filter === "ALL" ? "1.5px solid #5e72e4" : "1px solid #e9ecef",
              background: filter === "ALL" ? "#eff2fe" : "#ffffff",
              color: filter === "ALL" ? "#5e72e4" : "#64748b",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Semua
            <span
              style={{
                fontSize: 11,
                background: filter === "ALL" ? "#5e72e4" : "#e9ecef",
                color: filter === "ALL" ? "#ffffff" : "#64748b",
                padding: "1px 6px",
                borderRadius: 10,
                fontWeight: 800,
              }}
            >
              {items.length}
            </span>
          </button>

          {/* Belum Dibaca */}
          <button
            type="button"
            onClick={() => handleFilterChange("UNREAD")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              border: filter === "UNREAD" ? "1.5px solid #5e72e4" : "1px solid #e9ecef",
              background: filter === "UNREAD" ? "#eff2fe" : "#ffffff",
              color: filter === "UNREAD" ? "#5e72e4" : "#64748b",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Belum Dibaca
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  background: "#5e72e4",
                  color: "#ffffff",
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontWeight: 800,
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Surat Resmi Terbit */}
          <button
            type="button"
            onClick={() => handleFilterChange("OFFICIAL_LETTER")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              border: filter === "OFFICIAL_LETTER" ? "1.5px solid #2dce89" : "1px solid #e9ecef",
              background: filter === "OFFICIAL_LETTER" ? "#eafaf3" : "#ffffff",
              color: filter === "OFFICIAL_LETTER" ? "#2dce89" : "#64748b",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Surat Resmi Terbit
            {letterCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  background: "#2dce89",
                  color: "#ffffff",
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontWeight: 800,
                }}
              >
                {letterCount}
              </span>
            )}
          </button>

          {/* Perlu Tindakan */}
          <button
            type="button"
            onClick={() => handleFilterChange("ACTION_REQUIRED")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              border: filter === "ACTION_REQUIRED" ? "1.5px solid #fb6340" : "1px solid #e9ecef",
              background: filter === "ACTION_REQUIRED" ? "#fff3f0" : "#ffffff",
              color: filter === "ACTION_REQUIRED" ? "#fb6340" : "#64748b",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Perlu Perbaikan
            {actionRequiredCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  background: "#fb6340",
                  color: "#ffffff",
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontWeight: 800,
                }}
              >
                {actionRequiredCount}
              </span>
            )}
          </button>

          {/* Keputusan / Hasil */}
          <button
            type="button"
            onClick={() => handleFilterChange("DECISIONS")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              border: filter === "DECISIONS" ? "1.5px solid #11cdef" : "1px solid #e9ecef",
              background: filter === "DECISIONS" ? "#e8f9fd" : "#ffffff",
              color: filter === "DECISIONS" ? "#11cdef" : "#64748b",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Persetujuan & Penolakan
            {decisionsCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  background: "#11cdef",
                  color: "#ffffff",
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontWeight: 800,
                }}
              >
                {decisionsCount}
              </span>
            )}
          </button>
        </div>

        {/* Action Buttons: Segarkan, Pengaturan & Tandai Semua Dibaca */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href={
              actorRole && actorRole !== "WARGA"
                ? `/${actorRole.toLowerCase()}/notifikasi`
                : "/warga/notifikasi/pengaturan"
            }
            title="Pengaturan Saluran Notifikasi & Email"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 8,
              background: "#ffffff",
              border: "1px solid #d2d6da",
              color: "#344767",
              fontSize: 12.5,
              fontWeight: 700,
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <Settings size={13} color="#5e72e4" />
            Pengaturan
          </Link>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Segarkan Data"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "7px 12px",
              borderRadius: 8,
              background: "#ffffff",
              border: "1px solid #d2d6da",
              color: "#344767",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: isRefreshing ? "wait" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: isRefreshing ? "spin 1s linear infinite" : "none",
                marginRight: 6,
              }}
            />
            Segarkan
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleReadAll}
              disabled={isMarkingAll}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                background: "#ffffff",
                border: "1px solid #d2d6da",
                color: "#344767",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: isMarkingAll ? "wait" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {isMarkingAll ? (
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <CheckCheck size={14} color="#5e72e4" />
              )}
              Tandai Semua Sudah Dibaca
            </button>
          )}
        </div>
      </div>

      {/* ── Error Banner with Retry Mechanism ── */}
      {actionError && (
        <div
          role="alert"
          style={{
            background: "#feecee",
            border: "1.5px solid #f9b6c4",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            color: "#842029",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} color="#f5365c" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{actionError.message}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => actionError.retryFn()}
              style={{
                padding: "5px 12px",
                background: "#f5365c",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <RefreshCw size={11} />
              Coba Kembali
            </button>
            <button
              type="button"
              onClick={() => setActionError(null)}
              title="Tutup pesan"
              style={{
                background: "transparent",
                border: "none",
                color: "#842029",
                cursor: "pointer",
                padding: 4,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Notification Items / Empty State ── */}
      {filteredItems.length === 0 ? (
        <div
          style={{
            padding: "54px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "#f8f9fa",
              border: "1px solid #e9ecef",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8898aa",
            }}
          >
            <BellOff size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
            Tidak Ada Notifikasi
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "#8898aa", maxWidth: 400, lineHeight: 1.5 }}>
            {filter === "UNREAD"
              ? "Semua notifikasi telah Anda baca. Tidak ada pemberitahuan baru yang tertunda."
              : filter === "OFFICIAL_LETTER"
              ? actorRole === "KEPALA_DESA"
                ? "Belum ada dokumen surat resmi yang diterbitkan saat ini."
                : "Belum ada dokumen surat resmi terbit yang siap diunduh saat ini."
              : filter === "ACTION_REQUIRED"
              ? "Tidak ada permohonan yang memerlukan perbaikan dokumen. Seluruh berkas berjalan normal."
              : filter === "DECISIONS"
              ? "Belum ada notifikasi terkait hasil keputusan persetujuan atau penolakan berkas."
              : "Belum ada riwayat pemberitahuan dari sistem pelayanan desa."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {paginatedItems.map((item) => {
            const isLetter =
              item.type === "COMPLETED" || item.title.toLowerCase().includes("surat resmi");
            const isRepair =
              item.type === "DOCUMENT_REPAIR" || item.title.toLowerCase().includes("perbaikan");

            // Look for official letter file strictly if exists
            const officialLetter = item.application?.documents?.find(
              (d) =>
                d.requirement_name === "Surat Resmi Terbit (PDF)" ||
                d.requirement_name.toLowerCase().includes("surat resmi")
            );

            // Icon & category config
            const cfg = getCategoryConfig(item.type, item.title, item.application?.status);
            const IconComponent = cfg.icon;
            const cardBg = item.isRead ? cfg.cardBgRead : cfg.cardBgUnread;
            const cardBorder = item.isRead ? cfg.cardBorderRead : cfg.cardBorderUnread;
            const isItemLoading = loadingActionId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: 14,
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  transition: "all 0.2s ease",
                  position: "relative",
                  boxShadow: item.isRead
                    ? "0 2px 6px rgba(0, 0, 0, 0.02)"
                    : "0 4px 14px rgba(94, 114, 228, 0.08)",
                }}
              >
                {/* Left Circular Icon Avatar */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: cfg.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    flexShrink: 0,
                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.12)",
                    marginTop: 2,
                  }}
                >
                  <IconComponent size={20} strokeWidth={2.3} />
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Row 1: Badges, Title, Unread Indicator, Date */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: cfg.badgeBg,
                          color: cfg.badgeColor,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {cfg.label}
                      </span>

                      {item.application && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "monospace",
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "#f8f9fa",
                            color: "#525f7f",
                            border: "1px solid #e9ecef",
                          }}
                        >
                          {item.application.nomor_pengajuan}
                        </span>
                      )}

                      {!item.isRead && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 10.5,
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 12,
                            background: "#eff2fe",
                            color: "#5e72e4",
                            border: "1px solid #cfd7fc",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#5e72e4",
                            }}
                          />
                          Baru
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 11.5,
                        color: "#8898aa",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#64748b" }}>
                        {formatRelativeTime(item.createdAt)}
                      </span>
                      <span>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Clock size={11} />
                        {formatExactDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Headline */}
                  <h4
                    style={{
                      margin: "0 0 6px",
                      fontSize: 15.5,
                      fontWeight: 800,
                      color: "#1e293b",
                      lineHeight: 1.35,
                    }}
                  >
                    {item.title}
                  </h4>

                  {/* Row 3: Full Message */}
                  <p style={{ margin: 0, fontSize: 13.5, color: "#475569", lineHeight: 1.6 }}>
                    {item.message}
                  </p>

                  {/* Row 4: Action Buttons */}
                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      borderTop: "1px solid rgba(0, 0, 0, 0.05)",
                      paddingTop: 12,
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      {/* Ikon Unduh PDF Surat HANYA untuk pemohon/warga (Kepala Desa adalah penerbit surat, bukan pengunduh) */}
                      {isLetter && officialLetter && actorRole !== "KEPALA_DESA" && (
                        <a
                          href={`/api/files/${officialLetter.storage_key}?download=1`}
                          download={officialLetter.file_name}
                          onClick={() => !item.isRead && handleRead(item.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 14px",
                            borderRadius: 8,
                            background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
                            color: "#ffffff",
                            fontSize: 12.5,
                            fontWeight: 800,
                            textDecoration: "none",
                            boxShadow: "0 3px 8px rgba(45, 206, 137, 0.35)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <FileDown size={14} strokeWidth={2.5} />
                          Unduh PDF Surat
                        </a>
                      )}

                      {/* Tombol Perbaikan jika PERLU_PERBAIKAN dan role WARGA */}
                      {actorRole === "WARGA" && isRepair && item.application && (
                        <Link
                          href={`${baseRoute}/${item.application.id}`}
                          onClick={() => !item.isRead && handleRead(item.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 14px",
                            borderRadius: 8,
                            background: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
                            color: "#ffffff",
                            fontSize: 12.5,
                            fontWeight: 800,
                            textDecoration: "none",
                            boxShadow: "0 3px 8px rgba(251, 99, 64, 0.35)",
                          }}
                        >
                          <UploadCloud size={14} />
                          Unggah Perbaikan Berkas
                        </Link>
                      )}

                      {/* Tombol Lihat Detail Pengajuan */}
                      {item.application && (
                        <Link
                          href={`${baseRoute}/${item.application.id}`}
                          onClick={() => !item.isRead && handleRead(item.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 14px",
                            borderRadius: 8,
                            background: "#ffffff",
                            border: "1px solid #d2d6da",
                            color: "#344767",
                            fontSize: 12.5,
                            fontWeight: 700,
                            textDecoration: "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          Lihat Detail Pengajuan
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>

                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={() => handleRead(item.id)}
                        disabled={isItemLoading}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "transparent",
                          border: "none",
                          color: "#5e72e4",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: isItemLoading ? "wait" : "pointer",
                        }}
                      >
                        {isItemLoading ? (
                          <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                        ) : (
                          <Check size={13} />
                        )}
                        Tandai dibaca
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination / Pemuatan Bertahap ── */}
      {filteredItems.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            borderTop: "1px solid #f0f2f5",
            paddingTop: 16,
            marginTop: 6,
          }}
        >
          {/* Summary Text */}
          <div style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>
            Menampilkan{" "}
            <span style={{ color: "#1e293b", fontWeight: 700 }}>
              {startIndex + 1} - {Math.min(startIndex + pageSize, filteredItems.length)}
            </span>{" "}
            dari <span style={{ color: "#1e293b", fontWeight: 700 }}>{filteredItems.length}</span>{" "}
            riwayat notifikasi
          </div>

          {/* Page Controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Prev Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage === 1}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #d2d6da",
                  background: validCurrentPage === 1 ? "#f8f9fa" : "#ffffff",
                  color: validCurrentPage === 1 ? "#94a3b8" : "#344767",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: validCurrentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronLeft size={14} />
                Sebelumnya
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                const isActive = pageNum === validCurrentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: isActive ? "1.5px solid #5e72e4" : "1px solid #d2d6da",
                      background: isActive ? "#5e72e4" : "#ffffff",
                      color: isActive ? "#ffffff" : "#344767",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage === totalPages}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #d2d6da",
                  background: validCurrentPage === totalPages ? "#f8f9fa" : "#ffffff",
                  color: validCurrentPage === totalPages ? "#94a3b8" : "#344767",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: validCurrentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Selanjutnya
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
