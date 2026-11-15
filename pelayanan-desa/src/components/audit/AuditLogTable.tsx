"use client";

import React, { useState, useTransition } from "react";
import {
  Trash2,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  X,
  Shield,
  Clock,
  Eye,
  Filter,
} from "lucide-react";
import {
  deleteAuditLog,
  deleteMultipleAuditLogs,
  clearAllAuditLogs,
} from "@/lib/actions/reporting";

export type AuditLogItem = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date | string;
  actor: {
    name: string | null;
    email: string | null;
    role: string | null;
  } | null;
};

interface AuditLogTableProps {
  initialLogs: AuditLogItem[];
  role: "SUPERVISOR" | "KEPALA_DESA";
  title?: string;
  subtitle?: string;
}

type ModalState = {
  isOpen: boolean;
  type: "single" | "selected" | "all";
  targetId?: string;
  targetLabel?: string;
  count?: number;
};

export default function AuditLogTable({
  initialLogs,
  role,
  title = "Rekaman Jejak Audit (Audit Trail)",
  subtitle = "Aktivitas Seluruh Aktor dan Sistem",
}: AuditLogTableProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal konfirmasi hapus
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: "single",
  });

  // Modal inspect metadata
  const [inspectMetadata, setInspectMetadata] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
  }>({
    isOpen: false,
    title: "",
    content: "",
  });

  // Notifikasi / alert status
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // Kumpulan aksi unik untuk filter dropdown
  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();

  // Filter logs berdasarkan pencarian & filter aksi
  const filteredLogs = logs.filter((log) => {
    const matchesAction =
      actionFilter === "ALL" || log.action === actionFilter;

    if (!matchesAction) return false;

    if (!search.trim()) return true;

    const q = search.toLowerCase();
    const actorName = log.actor?.name?.toLowerCase() || "";
    const actorEmail = log.actor?.email?.toLowerCase() || "";
    const actorRole = log.actor?.role?.toLowerCase() || "";
    const action = log.action.toLowerCase();
    const entity = log.entity.toLowerCase();
    const entityId = log.entityId?.toLowerCase() || "";
    const metadataStr = log.metadata
      ? JSON.stringify(log.metadata).toLowerCase()
      : "";

    return (
      actorName.includes(q) ||
      actorEmail.includes(q) ||
      actorRole.includes(q) ||
      action.includes(q) ||
      entity.includes(q) ||
      entityId.includes(q) ||
      metadataStr.includes(q)
    );
  });

  // Checkbox pemilihan baris
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allFilteredIds = filteredLogs.map((l) => l.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...allFilteredIds])));
    } else {
      const filteredIdSet = new Set(filteredLogs.map((l) => l.id));
      setSelectedIds(selectedIds.filter((id) => !filteredIdSet.has(id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllFilteredSelected =
    filteredLogs.length > 0 &&
    filteredLogs.every((l) => selectedIds.includes(l.id));

  // Trigger modal konfirmasi
  const requestDeleteSingle = (log: AuditLogItem) => {
    const actorName = log.actor?.name || "Sistem";
    setModal({
      isOpen: true,
      type: "single",
      targetId: log.id,
      targetLabel: `Aksi "${log.action}" pada entitas "${log.entity}" oleh ${actorName}`,
    });
  };

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setModal({
      isOpen: true,
      type: "selected",
      count: selectedIds.length,
      targetLabel: `${selectedIds.length} catatan log audit terpilih`,
    });
  };

  const requestClearAll = () => {
    if (logs.length === 0) return;
    setModal({
      isOpen: true,
      type: "all",
      count: logs.length,
      targetLabel: `Seluruh (${logs.length}) rekaman jejak audit sistem`,
    });
  };

  // Eksekusi penghapusan
  const executeDelete = () => {
    if (!modal.isOpen) return;

    if (modal.type === "single" && modal.targetId) {
      const idToDelete = modal.targetId;
      setDeletingId(idToDelete);
      setModal({ isOpen: false, type: "single" });

      startTransition(async () => {
        try {
          const res = await deleteAuditLog(idToDelete);
          if (res.success) {
            setLogs((prev) => prev.filter((l) => l.id !== idToDelete));
            setSelectedIds((prev) => prev.filter((id) => id !== idToDelete));
            showToast("success", "Catatan log audit berhasil dihapus.");
          } else {
            showToast("error", res.error || "Gagal menghapus log audit.");
          }
        } catch (err) {
          showToast("error", "Terjadi kesalahan jaringan atau server.");
        } finally {
          setDeletingId(null);
        }
      });
    } else if (modal.type === "selected") {
      const idsToDelete = [...selectedIds];
      setModal({ isOpen: false, type: "selected" });

      startTransition(async () => {
        try {
          const res = await deleteMultipleAuditLogs(idsToDelete);
          if (res.success) {
            const idSet = new Set(idsToDelete);
            setLogs((prev) => prev.filter((l) => !idSet.has(l.id)));
            setSelectedIds([]);
            showToast(
              "success",
              `${res.count || idsToDelete.length} catatan log audit berhasil dihapus.`
            );
          } else {
            showToast("error", res.error || "Gagal menghapus log terpilih.");
          }
        } catch (err) {
          showToast("error", "Terjadi kesalahan jaringan atau server.");
        }
      });
    } else if (modal.type === "all") {
      setModal({ isOpen: false, type: "all" });

      startTransition(async () => {
        try {
          const res = await clearAllAuditLogs();
          if (res.success) {
            setLogs([]);
            setSelectedIds([]);
            showToast("success", "Seluruh catatan audit log berhasil dibersihkan.");
          } else {
            showToast("error", res.error || "Gagal membersihkan seluruh log audit.");
          }
        } catch (err) {
          showToast("error", "Terjadi kesalahan jaringan atau server.");
        }
      });
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("SUBMIT")) {
      return { bg: "#e6fffa", text: "#00b894", border: "#b2f5ea" };
    }
    if (action.includes("APPROV") || action.includes("SETUJU")) {
      return { bg: "#e8f5e9", text: "#2dce89", border: "#c8e6c9" };
    }
    if (action.includes("REJECT") || action.includes("TOLAK") || action.includes("DELETE")) {
      return { bg: "#feecee", text: "#f5365c", border: "#fbb6be" };
    }
    if (action.includes("REPAIR") || action.includes("PERBAIKAN")) {
      return { bg: "#fff8e1", text: "#fb6340", border: "#ffe082" };
    }
    return { bg: "#f1f5f9", text: "#344767", border: "#e2e8f0" };
  };

  const getRoleBadgeStyle = (roleName?: string | null) => {
    switch (roleName) {
      case "SUPERVISOR":
        return { bg: "#fef3c7", text: "#d97706" };
      case "KEPALA_DESA":
        return { bg: "#f3e8ff", text: "#8b5cf6" };
      case "STAF":
        return { bg: "#e0f2fe", text: "#0284c7" };
      case "WARGA":
        return { bg: "#e6fffa", text: "#059669" };
      default:
        return { bg: "#f1f5f9", text: "#64748b" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toast Alert Notification */}
      {toast && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderRadius: 10,
            background: toast.type === "success" ? "#d4edda" : "#f8d7da",
            color: toast.type === "success" ? "#155724" : "#721c24",
            border: `1px solid ${toast.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
            fontSize: 13.5,
            fontWeight: 500,
            animation: "fadeIn 0.25s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {toast.type === "success" ? (
              <CheckCircle2 size={18} color="#2dce89" />
            ) : (
              <XCircle size={18} color="#f5365c" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 4px 20px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        {/* Card Header & Controls */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f0f2f5",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Shield size={20} color="#5e72e4" />
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#344767",
                    margin: 0,
                  }}
                >
                  {title}
                </h3>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "#f0f3f8",
                    color: "#5e72e4",
                  }}
                >
                  {logs.length} Log
                </span>
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  color: "#8392ab",
                  margin: "4px 0 0 0",
                }}
              >
                {subtitle}
              </p>
            </div>

            {/* Tombol Hapus Global (Hapus Terpilih & Hapus Semua) */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  id="btn-delete-selected-audit"
                  onClick={requestDeleteSelected}
                  disabled={isPending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 8,
                    background:
                      "linear-gradient(87deg, #f5365c 0, #f56036 100%)",
                    color: "#ffffff",
                    border: "none",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: isPending ? "not-allowed" : "pointer",
                    boxShadow: "0 3px 6px rgba(245, 54, 92, 0.25)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Trash2 size={14} />
                  <span>Hapus {selectedIds.length} Terpilih</span>
                </button>
              )}

              <button
                type="button"
                id="btn-clear-all-audit"
                onClick={requestClearAll}
                disabled={isPending || logs.length === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: "#ffffff",
                  color: "#f5365c",
                  border: "1px solid #fbb6be",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isPending || logs.length === 0 ? "not-allowed" : "pointer",
                  opacity: logs.length === 0 ? 0.5 : 1,
                  transition: "all 0.15s ease",
                }}
                title="Hapus seluruh rekaman jejak audit sistem"
              >
                <Trash2 size={13} />
                <span>Hapus Semua Log</span>
              </button>
            </div>
          </div>

          {/* Search Box & Action Filter */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Search Input */}
            <div
              style={{
                position: "relative",
                flex: "1 1 260px",
                maxWidth: 400,
              }}
            >
              <Search
                size={15}
                color="#8392ab"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="text"
                placeholder="Cari aktor, aksi, entitas, ID, atau metadata..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid #d2d6da",
                  color: "#495057",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#8392ab",
                    cursor: "pointer",
                    padding: 2,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Aksi Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Filter size={14} color="#8392ab" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  fontSize: 12.5,
                  borderRadius: 8,
                  border: "1px solid #d2d6da",
                  color: "#344767",
                  background: "#ffffff",
                  outline: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                <option value="ALL">Semua Jenis Aksi ({logs.length})</option>
                {uniqueActions.map((act) => (
                  <option key={act} value={act}>
                    {act} ({logs.filter((l) => l.action === act).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Info Filter */}
            {search && (
              <span style={{ fontSize: 12, color: "#8392ab" }}>
                Ditemukan <strong>{filteredLogs.length}</strong> dari {logs.length} catatan
              </span>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={handleSelectAll}
                    disabled={filteredLogs.length === 0}
                    style={{
                      cursor: filteredLogs.length === 0 ? "not-allowed" : "pointer",
                      width: 15,
                      height: 15,
                      accentColor: "#5e72e4",
                    }}
                    title="Pilih seluruh baris yang tampil"
                  />
                </th>
                <th>Waktu</th>
                <th>Aktor</th>
                <th>Aksi</th>
                <th>Entitas</th>
                <th>Metadata Rinci</th>
                <th style={{ textAlign: "center", width: 110 }}>Aksi Log</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "48px 24px",
                      textAlign: "center",
                      color: "#8392ab",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Shield size={36} color="#cbd5e1" />
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>
                        {logs.length === 0
                          ? "Belum ada catatan log aktivitas dalam sistem."
                          : "Tidak ada catatan log yang cocok dengan filter pencarian."}
                      </div>
                      {logs.length > 0 && search && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setActionFilter("ALL");
                          }}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 6,
                            background: "#f1f5f9",
                            border: "none",
                            color: "#5e72e4",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const actionStyle = getActionBadgeColor(log.action);
                  const roleStyle = getRoleBadgeStyle(log.actor?.role);
                  const isRowSelected = selectedIds.includes(log.id);
                  const isDeletingThis = deletingId === log.id;

                  return (
                    <tr
                      key={log.id}
                      style={{
                        background: isRowSelected ? "#f8faff" : undefined,
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => handleToggleSelectRow(log.id)}
                          style={{
                            cursor: "pointer",
                            width: 15,
                            height: 15,
                            accentColor: "#5e72e4",
                          }}
                        />
                      </td>

                      {/* Waktu */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "12.5px",
                            color: "#344767",
                            fontWeight: 500,
                          }}
                        >
                          <Clock size={13} color="#8392ab" />
                          <span>
                            {new Date(log.createdAt).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Aktor */}
                      <td>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "13px" }}>
                          {log.actor?.name || "Sistem"}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: roleStyle.bg,
                              color: roleStyle.text,
                            }}
                          >
                            {log.actor?.role || "SYSTEM"}
                          </span>
                          {log.actor?.email && (
                            <span style={{ fontSize: "11px", color: "#8392ab" }}>
                              {log.actor.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            fontWeight: 700,
                            background: actionStyle.bg,
                            color: actionStyle.text,
                            border: `1px solid ${actionStyle.border}`,
                            padding: "3px 8px",
                            borderRadius: 6,
                            whiteSpace: "nowrap",
                            display: "inline-block",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Entitas */}
                      <td>
                        <div style={{ fontWeight: 600, color: "#344767", fontSize: 13 }}>
                          {log.entity}
                        </div>
                        {log.entityId && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#8392ab",
                              fontFamily: "monospace",
                            }}
                          >
                            ID: {log.entityId}
                          </div>
                        )}
                      </td>

                      {/* Metadata */}
                      <td style={{ maxWidth: 320 }}>
                        {log.metadata ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "11px",
                                color: "#475569",
                                maxWidth: "240px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "inline-block",
                                background: "#f8f9fa",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                              title={JSON.stringify(log.metadata)}
                            >
                              {JSON.stringify(log.metadata)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setInspectMetadata({
                                  isOpen: true,
                                  title: `Metadata: ${log.action} (${log.entity})`,
                                  content: JSON.stringify(log.metadata, null, 2),
                                })
                              }
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#5e72e4",
                                cursor: "pointer",
                                padding: 2,
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                              title="Lihat Metadata Lengkap"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Tombol Hapus per Baris */}
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          onClick={() => requestDeleteSingle(log)}
                          disabled={isPending || isDeletingThis}
                          id={`btn-delete-log-${log.id}`}
                          title="Hapus catatan audit log ini"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "5px 10px",
                            borderRadius: 6,
                            background: "#feecee",
                            color: "#f5365c",
                            border: "1px solid #fbb6be",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor:
                              isPending || isDeletingThis
                                ? "not-allowed"
                                : "pointer",
                            opacity: isDeletingThis ? 0.6 : 1,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isDeletingThis ? (
                            <RefreshCw
                              size={12}
                              style={{ animation: "spin 1s linear infinite" }}
                            />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          <span>Hapus</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #f0f2f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#8392ab",
          }}
        >
          <div>
            Menampilkan <strong>{filteredLogs.length}</strong> dari{" "}
            <strong>{logs.length}</strong> total rekaman log
          </div>
          {selectedIds.length > 0 && (
            <div style={{ color: "#5e72e4", fontWeight: 600 }}>
              {selectedIds.length} baris sedang dipilih
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {modal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              maxWidth: 460,
              width: "100%",
              padding: 24,
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "#feecee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={24} color="#f5365c" />
              </div>
              <div style={{ flex: 1 }}>
                <h4
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#1e293b",
                    margin: 0,
                  }}
                >
                  {modal.type === "all"
                    ? "Hapus Seluruh Catatan Log?"
                    : modal.type === "selected"
                    ? "Hapus Catatan Terpilih?"
                    : "Hapus Catatan Audit Log?"}
                </h4>
                <p
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                    marginTop: 8,
                    marginBottom: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {modal.type === "all" ? (
                    <span>
                      Apakah Anda yakin ingin menghapus <strong>seluruh ({modal.count})</strong> catatan
                      audit log di database? Tindakan ini tidak dapat dibatalkan.
                    </span>
                  ) : modal.type === "selected" ? (
                    <span>
                      Apakah Anda yakin ingin menghapus <strong>{modal.count}</strong> catatan
                      log yang dipilih?
                    </span>
                  ) : (
                    <span>
                      Apakah Anda yakin ingin menghapus catatan log berikut?
                      <br />
                      <strong style={{ color: "#334155", display: "inline-block", marginTop: 4 }}>
                        {modal.targetLabel}
                      </strong>
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 24,
              }}
            >
              <button
                type="button"
                onClick={() => setModal({ isOpen: false, type: "single" })}
                disabled={isPending}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "#f1f5f9",
                  border: "none",
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isPending ? "not-allowed" : "pointer",
                }}
              >
                Batal
              </button>

              <button
                type="button"
                id="btn-confirm-delete-audit"
                onClick={executeDelete}
                disabled={isPending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 18px",
                  borderRadius: 8,
                  background:
                    "linear-gradient(87deg, #f5365c 0, #f56036 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isPending ? "not-allowed" : "pointer",
                  boxShadow: "0 3px 6px rgba(245, 54, 92, 0.3)",
                }}
              >
                {isPending ? (
                  <>
                    <RefreshCw
                      size={13}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Metadata Modal */}
      {inspectMetadata.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              maxWidth: 580,
              width: "100%",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f0f2f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Eye size={16} color="#5e72e4" />
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "#1e293b" }}>
                  {inspectMetadata.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() =>
                  setInspectMetadata({ isOpen: false, title: "", content: "" })
                }
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8392ab",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
              <pre
                style={{
                  background: "#0f172a",
                  color: "#38bdf8",
                  padding: 14,
                  borderRadius: 10,
                  fontSize: 12,
                  fontFamily: "monospace",
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {inspectMetadata.content}
              </pre>
            </div>

            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #f0f2f5",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setInspectMetadata({ isOpen: false, title: "", content: "" })
                }
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  background: "#f1f5f9",
                  border: "none",
                  color: "#475569",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
