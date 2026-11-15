"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWarga, updateWargaContactByOfficer, deleteWarga } from "@/lib/actions/user";
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Lock,
  User,
  ShieldCheck,
  Edit2,
  Save,
  Check,
  Trash2,
} from "lucide-react";

interface WargaItem {
  id: string;
  name: string;
  email: string;
  nik: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date | string;
  _count: {
    applications: number;
  };
}

interface WargaManagementClientProps {
  initialWarga: WargaItem[];
  canAddWarga?: boolean;
}

function formatWhatsAppDisplay(phoneInput: string) {
  const digits = phoneInput.replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("08")) {
    return `+62 ${digits.substring(1, 4)}-${digits.substring(4, 8)}-${digits.substring(8)}`;
  } else if (digits.startsWith("628")) {
    return `+62 ${digits.substring(2, 5)}-${digits.substring(5, 9)}-${digits.substring(9)}`;
  }
  return phoneInput;
}

export function WargaManagementClient({ initialWarga, canAddWarga = true }: WargaManagementClientProps) {
  const router = useRouter();
  const [wargaList, setWargaList] = useState<WargaItem[]>(initialWarga);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Form State Tambah Warga
  const [name, setName] = useState("");
  const [nik, setNik] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("Warga@123");

  // State Edit Kontak Warga
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWarga, setEditingWarga] = useState<WargaItem | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  // State Hapus Warga
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingWarga, setDeletingWarga] = useState<WargaItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const filteredWarga = wargaList.filter((w) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      w.name.toLowerCase().includes(q) ||
      (w.nik && w.nik.includes(q)) ||
      w.email.toLowerCase().includes(q) ||
      (w.phone && w.phone.includes(q)) ||
      (w.address && w.address.toLowerCase().includes(q))
    );
  });

  function resetForm() {
    setName("");
    setNik("");
    setEmail("");
    setPhone("");
    setAddress("");
    setPassword("Warga@123");
    setFieldErrors({});
    setErrorMessage("");
  }

  function handleOpenEditModal(warga: WargaItem) {
    setEditingWarga(warga);
    setEditEmail(warga.email);
    setEditPhone(warga.phone || "");
    setEditAddress(warga.address || "");
    setEditError("");
    setEditFieldErrors({});
    setIsEditModalOpen(true);
  }

  function handleOpenDeleteModal(warga: WargaItem) {
    setDeletingWarga(warga);
    setDeleteError("");
    setIsDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingWarga) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await deleteWarga(deletingWarga.id);
      if (res.success) {
        setSuccessInfo(res.message);
        setIsDeleteModalOpen(false);
        setWargaList((prev) => prev.filter((item) => item.id !== deletingWarga.id));
        setDeletingWarga(null);
        router.refresh();
      } else {
        setDeleteError(res.error || "Gagal menghapus data warga.");
      }
    } catch {
      setDeleteError("Terjadi kesalahan sistem saat menghapus data warga.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleUpdateWargaContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingWarga) return;

    setEditLoading(true);
    setEditError("");
    setEditFieldErrors({});

    try {
      const formData = new FormData();
      formData.set("email", editEmail);
      formData.set("phone", editPhone);
      formData.set("address", editAddress);

      const res = await updateWargaContactByOfficer(editingWarga.id, formData);
      if (res.success) {
        setSuccessInfo(res.message);
        setIsEditModalOpen(false);
        setWargaList((prev) =>
          prev.map((item) =>
            item.id === editingWarga.id
              ? {
                  ...item,
                  email: editEmail.trim().toLowerCase(),
                  phone: editPhone.trim() || null,
                  address: editAddress.trim() || null,
                }
              : item
          )
        );
        router.refresh();
      } else {
        setEditError(res.error || "Gagal memperbarui data kontak warga.");
        if (res.fieldErrors) setEditFieldErrors(res.fieldErrors);
      }
    } catch {
      setEditError("Terjadi kesalahan sistem saat menyimpan pembaruan kontak warga.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleCreateWarga(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setFieldErrors({});

    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("nik", nik);
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("address", address);
      formData.set("password", password);

      const res = await createWarga(formData);
      if (res.success) {
        setSuccessInfo(`Warga baru atas nama "${res.user.name}" (NIK: ${res.user.nik || "-"}) berhasil ditambahkan.`);
        resetForm();
        setIsModalOpen(false);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Gagal menambahkan warga baru.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    } catch {
      setErrorMessage("Terjadi kesalahan sistem saat menyimpan data warga.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Banner Sukses Jika Baru Saja Menambah Warga ── */}
      {successInfo && (
        <div
          style={{
            padding: "16px 20px",
            background: "#f0fdf4",
            border: "1.5px solid #bbf7d0",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            color: "#166534",
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0 }} />
            <span>{successInfo}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessInfo(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#166534",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Toolbar: Pencarian & Tombol Tambah Warga ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          background: "#ffffff",
          padding: "18px 22px",
          borderRadius: 14,
          boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
          border: "1px solid #eef2f6",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 460 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#8898aa",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, NIK (16 digit), email, atau no HP..."
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: 10,
              border: "1px solid #d2d6da",
              fontSize: 13,
              color: "#344767",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "#64748b",
              background: "#f8fafc",
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            Total: <strong>{filteredWarga.length} Warga</strong>
          </div>

          {canAddWarga && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 10,
                background: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
                color: "#ffffff",
                fontSize: 13.5,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(251, 99, 64, 0.35)",
                transition: "transform 0.15s ease",
              }}
            >
              <UserPlus size={16} />
              <span>Tambah Warga Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tabel Daftar Warga ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "14px 20px", fontSize: 11.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", minWidth: 170 }}>
                  Nama Warga
                </th>
                <th style={{ padding: "14px 16px", fontSize: 11.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", minWidth: 140 }}>
                  NIK (KTP)
                </th>
                <th style={{ padding: "14px 16px", fontSize: 11.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", minWidth: 200 }}>
                  Kontak (Email / WhatsApp)
                </th>
                <th style={{ padding: "14px 16px", fontSize: 11.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", minWidth: 220 }}>
                  Alamat Domisili
                </th>
                <th style={{ padding: "14px 16px", fontSize: 11.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", textAlign: "center", minWidth: 100 }}>
                  Pengajuan
                </th>
                <th style={{ padding: "14px 20px", fontSize: 11.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", textAlign: "center", minWidth: 95 }}>
                  Status
                </th>
                <th style={{ padding: "14px 20px", fontSize: 11.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", textAlign: "center", minWidth: 155 }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredWarga.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px 20px", textAlign: "center", color: "#8898aa", fontSize: 13.5 }}>
                    Tidak ada data warga yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredWarga.map((warga) => (
                  <tr
                    key={warga.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {warga.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{warga.name}</div>
                          <div style={{ fontSize: 11.5, color: "#8898aa" }}>
                            Terdaftar: {new Date(warga.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 16px", fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "#344767" }}>
                      {warga.nik ? (
                        <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                          {warga.nik}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "16px 16px", fontSize: 12.5 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569" }}>
                          <Mail size={13} color="#64748b" />
                          <span>{warga.email}</span>
                        </div>
                        {warga.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontWeight: 600 }}>
                            <Phone size={13} />
                            <span>{formatWhatsAppDisplay(warga.phone) || warga.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", minWidth: 220, maxWidth: 320 }}>
                      {warga.address ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 9,
                            padding: "8px 12px",
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                          }}
                          title={warga.address}
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              background: "#e0f2fe",
                              color: "#0284c7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            <MapPin size={12} strokeWidth={2.4} />
                          </div>
                          <span
                            style={{
                              fontSize: 12.5,
                              fontWeight: 500,
                              color: "#334155",
                              lineHeight: 1.45,
                              wordBreak: "break-word",
                            }}
                          >
                            {warga.address}
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            color: "#94a3b8",
                            fontSize: 12,
                            background: "#f8fafc",
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px dashed #cbd5e1",
                          }}
                        >
                          <MapPin size={12} color="#94a3b8" />
                          <span style={{ fontStyle: "italic" }}>Alamat belum diisi</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "16px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: warga._count.applications > 0 ? "#eff6ff" : "#f8fafc",
                          color: warga._count.applications > 0 ? "#2563eb" : "#94a3b8",
                          border: warga._count.applications > 0 ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                        }}
                      >
                        {warga._count.applications} Berkas
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: warga.isActive ? "#eafaf3" : "#feecee",
                          color: warga.isActive ? "#2dce89" : "#f5365c",
                          border: warga.isActive ? "1px solid #bbf1dc" : "1px solid #fec5b8",
                        }}
                      >
                        {warga.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(warga)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                            color: "#334155",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            transition: "all 0.15s ease",
                          }}
                          title="Perbarui email atau nomor WhatsApp resmi warga"
                        >
                          <Edit2 size={13} color="#5e72e4" />
                          <span>Edit Kontak</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(warga)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 8,
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#ef4444",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s ease",
                          }}
                          title={`Hapus data warga ${warga.name}`}
                          aria-label={`Hapus data warga ${warga.name}`}
                        >
                          <Trash2 size={13} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL TAMBAH WARGA BARU (SUPERVISOR & KADES) ── */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              width: "100%",
              maxWidth: 580,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 28,
              position: "relative",
            }}
          >
            {/* Header Modal */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(251, 99, 64, 0.35)",
                    flexShrink: 0,
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
                    Tambah Warga Baru
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#64748b" }}>
                    Bantu warga baru mendaftar agar dapat mengajukan layanan administrasi desa.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: 8,
                  padding: 6,
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "#feecee",
                  color: "#f5365c",
                  borderRadius: 10,
                  border: "1px solid #fec5b8",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Pendaftaran Warga */}
            <form onSubmit={handleCreateWarga} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Nama Lengkap */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                  Nama Lengkap Sesuai KTP <span style={{ color: "#f5365c" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8898aa" }} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 36px",
                      borderRadius: 8,
                      border: fieldErrors.name ? "1.5px solid #f5365c" : "1px solid #d2d6da",
                      fontSize: 13.5,
                      color: "#344767",
                      outline: "none",
                    }}
                  />
                </div>
                {fieldErrors.name && <span style={{ fontSize: 11.5, color: "#f5365c", marginTop: 4, display: "block" }}>{fieldErrors.name}</span>}
              </div>

              {/* NIK */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                  Nomor Induk Kependudukan (NIK 16 Digit) <span style={{ color: "#f5365c" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <CreditCard size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8898aa" }} />
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                    placeholder="Contoh: 3201010101010006"
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 36px",
                      borderRadius: 8,
                      border: fieldErrors.nik ? "1.5px solid #f5365c" : "1px solid #d2d6da",
                      fontSize: 13.5,
                      fontFamily: "monospace",
                      color: "#344767",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  {fieldErrors.nik ? (
                    <span style={{ fontSize: 11.5, color: "#f5365c" }}>{fieldErrors.nik}</span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: "#8898aa" }}>Tepat 16 digit angka sesuai KTP</span>
                  )}
                  <span style={{ fontSize: 11.5, color: nik.length === 16 ? "#16a34a" : "#8898aa", fontWeight: 700, fontFamily: "monospace" }}>
                    {nik.length}/16
                  </span>
                </div>
              </div>

              {/* Email & No HP (WhatsApp) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                    Email Warga <span style={{ color: "#f5365c" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8898aa" }} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="warga@email.com"
                      style={{
                        width: "100%",
                        padding: "10px 14px 10px 36px",
                        borderRadius: 8,
                        border: fieldErrors.email ? "1.5px solid #f5365c" : "1px solid #d2d6da",
                        fontSize: 13,
                        color: "#344767",
                        outline: "none",
                      }}
                    />
                  </div>
                  {fieldErrors.email && <span style={{ fontSize: 11.5, color: "#f5365c", marginTop: 4, display: "block" }}>{fieldErrors.email}</span>}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                    No. WhatsApp/HP <span style={{ color: "#f5365c" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Phone size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8898aa" }} />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="081234567890"
                      style={{
                        width: "100%",
                        padding: "10px 14px 10px 36px",
                        borderRadius: 8,
                        border: fieldErrors.phone ? "1.5px solid #f5365c" : "1px solid #d2d6da",
                        fontSize: 13,
                        color: "#344767",
                        outline: "none",
                      }}
                    />
                  </div>
                  {fieldErrors.phone && <span style={{ fontSize: 11.5, color: "#f5365c", marginTop: 4, display: "block" }}>{fieldErrors.phone}</span>}
                </div>
              </div>

              {/* Alamat Domisili */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                  Alamat Domisili Desa <span style={{ color: "#f5365c" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <MapPin size={16} style={{ position: "absolute", left: 12, top: 12, color: "#8898aa" }} />
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Contoh: RT 02 / RW 04 Dusun Sukamaju, Desa Karangjati"
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 36px",
                      borderRadius: 8,
                      border: fieldErrors.address ? "1.5px solid #f5365c" : "1px solid #d2d6da",
                      fontSize: 13,
                      color: "#344767",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>
                {fieldErrors.address && <span style={{ fontSize: 11.5, color: "#f5365c", marginTop: 4, display: "block" }}>{fieldErrors.address}</span>}
              </div>

              {/* Password Default */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                  Password Awal Login <span style={{ color: "#8898aa", fontWeight: 500 }}>(Default: Warga@123)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8898aa" }} />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Warga@123"
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 36px",
                      borderRadius: 8,
                      border: "1px solid #d2d6da",
                      fontSize: 13,
                      fontFamily: "monospace",
                      color: "#344767",
                      outline: "none",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11.5, color: "#8898aa", marginTop: 4, display: "block" }}>
                  Beritahukan password ini kepada warga setelah akun berhasil dibuat.
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 10, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    background: "#f1f5f9",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 22px",
                    borderRadius: 8,
                    background: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
                    color: "#ffffff",
                    fontSize: 13.5,
                    fontWeight: 700,
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(251, 99, 64, 0.35)",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Menyimpan Warga...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Daftarkan Warga</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT KONTAK WARGA (SUPERVISOR & KADES) ── */}
      {isEditModalOpen && editingWarga && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              width: "100%",
              maxWidth: 540,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 28,
              position: "relative",
            }}
          >
            {/* Header Modal */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(94, 114, 228, 0.35)",
                    flexShrink: 0,
                  }}
                >
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
                    Perbarui Kontak Warga
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#64748b" }}>
                    Kelola nomor WhatsApp dan email resmi warga atas nama <strong>{editingWarga.name}</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={editLoading}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  color: "#64748b",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Banner */}
            {editError && (
              <div
                style={{
                  marginBottom: 18,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateWargaContact} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Info Warga (Read-only) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={editingWarga.name}
                    disabled
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#64748b",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                    NIK (KTP)
                  </label>
                  <input
                    type="text"
                    value={editingWarga.nik || "-"}
                    disabled
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#64748b",
                      fontSize: 13,
                      fontFamily: "monospace",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Alamat Email */}
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#344767", marginBottom: 4 }}>
                  Alamat Email Notifikasi <span style={{ color: "#e11d48" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="nama@domain.com"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px 9px 36px",
                      borderRadius: 8,
                      border: editFieldErrors.email ? "1.5px solid #e11d48" : "1px solid #cbd5e1",
                      fontSize: 13,
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <Mail size={15} style={{ position: "absolute", left: 11, top: 11, color: "#64748b" }} />
                </div>
                {editFieldErrors.email && (
                  <span style={{ fontSize: 11.5, color: "#e11d48", marginTop: 4, display: "block" }}>
                    {editFieldErrors.email}
                  </span>
                )}
                <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>
                  Email tujuan korespondensi dan salinan surat digital warga.
                </span>
              </div>

              {/* Nomor WhatsApp */}
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#344767", marginBottom: 4 }}>
                  Nomor WhatsApp Penerima Notifikasi <span style={{ color: "#e11d48" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Contoh: 081234567890 atau +6281234567890"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px 9px 36px",
                      borderRadius: 8,
                      border: editFieldErrors.phone ? "1.5px solid #e11d48" : "1px solid #cbd5e1",
                      fontSize: 13,
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <Phone size={15} style={{ position: "absolute", left: 11, top: 11, color: "#16a34a" }} />
                </div>
                {editFieldErrors.phone && (
                  <span style={{ fontSize: 11.5, color: "#e11d48", marginTop: 4, display: "block" }}>
                    {editFieldErrors.phone}
                  </span>
                )}
                {editPhone && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#16a34a", fontWeight: 600 }}>
                    <Check size={13} />
                    <span>
                      Format WhatsApp: <strong>{formatWhatsAppDisplay(editPhone)}</strong>
                    </span>
                  </div>
                )}
                <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>
                  Pastikan nomor ini aktif pada gawai WhatsApp warga. Notifikasi status pelayanan dikirim ke nomor ini.
                </span>
              </div>

              {/* Alamat Domisili */}
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#344767", marginBottom: 4 }}>
                  Alamat Domisili Warga
                </label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="RT / RW, Dusun, Desa Digital"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Tombol Aksi Modal */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 10, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editLoading}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    background: "#f1f5f9",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={editLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 22px",
                    borderRadius: 8,
                    background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                    color: "#ffffff",
                    fontSize: 13.5,
                    fontWeight: 700,
                    border: "none",
                    cursor: editLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(94, 114, 228, 0.35)",
                    opacity: editLoading ? 0.7 : 1,
                  }}
                >
                  {editLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Simpan Kontak Warga</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL KONFIRMASI HAPUS WARGA ── */}
      {isDeleteModalOpen && deletingWarga && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              width: "100%",
              maxWidth: 460,
              padding: 24,
              position: "relative",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ef4444",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                  Konfirmasi Hapus Warga
                </h3>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                  Data warga akan dihapus secara permanen dari sistem.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!deleteLoading) {
                    setIsDeleteModalOpen(false);
                    setDeletingWarga(null);
                  }
                }}
                disabled={deleteLoading}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: 8,
                  padding: 6,
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                }}
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error Message */}
            {deleteError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#b91c1c",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Data Preview */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 20,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>Nama:</span>
                <span style={{ fontWeight: 700, color: "#1e293b" }}>{deletingWarga.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>NIK:</span>
                <span style={{ fontFamily: "monospace", color: "#334155" }}>{deletingWarga.nik || "-"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>Email:</span>
                <span style={{ color: "#334155" }}>{deletingWarga.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Pengajuan Berkas:</span>
                <span style={{ fontWeight: 600, color: deletingWarga._count.applications > 0 ? "#f59e0b" : "#64748b" }}>
                  {deletingWarga._count.applications} berkas
                </span>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 18px", lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus akun dan data warga <strong>{deletingWarga.name}</strong>?
            </p>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingWarga(null);
                }}
                disabled={deleteLoading}
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: deleteLoading ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                }}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
