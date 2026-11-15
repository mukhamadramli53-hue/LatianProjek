"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import {
  User,
  Shield,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Info,
  BadgeCheck,
  Check,
  Send,
} from "lucide-react";
import { updateMyProfile, updateMyPassword, verifyMyContactEmail } from "@/lib/actions/user";

interface UserProfileData {
  id: string;
  name: string;
  email: string;
  emailVerified?: Date | string | null;
  phone: string | null;
  address: string | null;
  nik: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date | string;
}

interface StatsData {
  total?: number;
  processed?: number;
  needsRepair?: number;
  completed?: number;
  rejected?: number;
  auditCount?: number;
}

interface Props {
  user: UserProfileData;
  stats?: StatsData;
  initialTab?: "biodata" | "keamanan" | "info";
}

const roleBadgeConfig: Record<Role, { label: string; bg: string; color: string; gradient: string }> = {
  WARGA: {
    label: "Warga Masyarakat Desa",
    bg: "rgba(94, 114, 228, 0.12)",
    color: "#5e72e4",
    gradient: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
  },
  STAF: {
    label: "Staf Pelayanan & Verifikator",
    bg: "rgba(17, 205, 239, 0.12)",
    color: "#11cdef",
    gradient: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
  },
  SUPERVISOR: {
    label: "Supervisor Pengawas Pelayanan",
    bg: "rgba(251, 99, 64, 0.12)",
    color: "#fb6340",
    gradient: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
  },
  KEPALA_DESA: {
    label: "Kepala Desa (Pimpinan Eksekutif)",
    bg: "rgba(45, 206, 137, 0.12)",
    color: "#2dce89",
    gradient: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
  },
};

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

export function ProfileClient({ user, stats, initialTab = "biodata" }: Props) {
  const [activeTab, setActiveTab] = useState<"biodata" | "keamanan" | "info">(initialTab);

  // Form State: Biodata & Kontak
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [address, setAddress] = useState(user.address || "");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState<Date | string | null>(user.emailVerified || null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State: Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const roleMeta = roleBadgeConfig[user.role] || roleBadgeConfig.WARGA;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const formattedJoinDate = new Date(user.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Handle Verifikasi Email
  const handleVerifyEmail = async () => {
    setIsVerifyingEmail(true);
    setProfileMsg(null);
    try {
      const res = await verifyMyContactEmail();
      if (res.success) {
        setEmailVerified(res.emailVerified || new Date());
        setProfileMsg({ type: "success", text: res.message });
      } else {
        setProfileMsg({ type: "error", text: res.error });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Terjadi kesalahan saat memverifikasi email." });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Handle Profile Save
  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("address", address);
    if (currentPasswordForEmail) {
      formData.append("currentPassword", currentPasswordForEmail);
    }

    const res = await updateMyProfile(formData);
    setIsUpdatingProfile(false);

    if (res.success) {
      setProfileMsg({ type: "success", text: res.message });
      setEmailVerified(res.emailVerified ?? null);
      setCurrentPasswordForEmail("");
    } else {
      setProfileMsg({ type: "error", text: res.error });
    }
  };

  // Handle Password Save
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordMsg(null);

    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);
    formData.append("confirmPassword", confirmPassword);

    const res = await updateMyPassword(formData);
    setIsUpdatingPassword(false);

    if (res.success) {
      setPasswordMsg({ type: "success", text: res.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordMsg({ type: "error", text: res.error });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* ── 1. Top Identity Header Card ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "28px 32px",
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, flex: "1 1 340px" }}>
          {/* Avatar Circle */}
          <div
            style={{
              width: 82,
              height: 82,
              borderRadius: "50%",
              background: roleMeta.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 800,
              boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)",
              flexShrink: 0,
              border: "4px solid #ffffff",
            }}
          >
            {initials}
          </div>

          {/* Identity Info */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span
                style={{
                  background: roleMeta.bg,
                  color: roleMeta.color,
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Shield size={12} />
                {roleMeta.label}
              </span>
              {emailVerified ? (
                <span
                  style={{
                    background: "rgba(45, 206, 137, 0.12)",
                    color: "#2dce89",
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <BadgeCheck size={13} />
                  Email Terverifikasi Resmi
                </span>
              ) : (
                <span
                  style={{
                    background: "rgba(251, 99, 64, 0.12)",
                    color: "#fb6340",
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <AlertCircle size={13} />
                  Email Belum Diverifikasi
                </span>
              )}
            </div>

            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b", letterSpacing: "-0.01em" }}>
              {user.name}
            </h3>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: "#64748b" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Mail size={14} color="#64748b" /> {email}
              </span>
              {phone && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Phone size={14} color="#16a34a" /> {formatWhatsAppDisplay(phone) || phone}
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Calendar size={14} color="#64748b" /> Bergabung {formattedJoinDate}
              </span>
            </div>
          </div>
        </div>

        {/* NIK Badge Pill (if available) */}
        {user.nik && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "12px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Nomor Induk Kependudukan (NIK)
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", letterSpacing: "0.04em" }}>
              {user.nik}
            </span>
          </div>
        )}
      </div>

      {/* ── 2. Quick Stats Row (Khusus Warga atau Role terkait) ── */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {stats.total !== undefined && (
            <div style={{ background: "#ffffff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Pengajuan</span>
              <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800, color: "#1e293b" }}>{stats.total}</p>
            </div>
          )}
          {stats.processed !== undefined && (
            <div style={{ background: "#ffffff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase" }}>Sedang Diproses</span>
              <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800, color: "#3b82f6" }}>{stats.processed}</p>
            </div>
          )}
          {stats.needsRepair !== undefined && (
            <div style={{ background: "#ffffff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" }}>Perlu Perbaikan</span>
              <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>{stats.needsRepair}</p>
            </div>
          )}
          {stats.completed !== undefined && (
            <div style={{ background: "#ffffff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>Berkas Selesai</span>
              <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800, color: "#10b981" }}>{stats.completed}</p>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Tab Navigation ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#ffffff",
          borderRadius: 14,
          padding: "6px 8px",
          border: "1px solid rgba(0,0,0,0.05)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("biodata")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s ease",
            background: activeTab === "biodata" ? roleMeta.gradient : "transparent",
            color: activeTab === "biodata" ? "#ffffff" : "#64748b",
            boxShadow: activeTab === "biodata" ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
          }}
        >
          <User size={15} />
          Data Diri & Kontak
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("keamanan")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s ease",
            background: activeTab === "keamanan" ? roleMeta.gradient : "transparent",
            color: activeTab === "keamanan" ? "#ffffff" : "#64748b",
            boxShadow: activeTab === "keamanan" ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
          }}
        >
          <KeyRound size={15} />
          Keamanan & Password
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("info")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s ease",
            background: activeTab === "info" ? roleMeta.gradient : "transparent",
            color: activeTab === "info" ? "#ffffff" : "#64748b",
            boxShadow: activeTab === "info" ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
          }}
        >
          <Info size={15} />
          Informasi Akun
        </button>
      </div>

      {/* ── 4. Tab 1: Biodata & Kontak ── */}
      {activeTab === "biodata" && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            padding: "28px 32px",
          }}
        >
          <div style={{ marginBottom: 24, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
              Informasi Kontak Kependudukan
            </h4>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#64748b" }}>
              Pastikan nomor telepon WhatsApp dan alamat domisili selalu aktif untuk menerima pemberitahuan resmi dari pihak desa.
            </p>
          </div>

          {profileMsg && (
            <div
              style={{
                marginBottom: 20,
                padding: "14px 18px",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 600,
                background: profileMsg.type === "success" ? "#f0fdf4" : "#fef2f2",
                border: profileMsg.type === "success" ? "1px solid #bbf7d0" : "1px solid #fecaca",
                color: profileMsg.type === "success" ? "#166534" : "#991b1b",
              }}
            >
              {profileMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Row 1: Nama & NIK (Read-only) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                  Nama Lengkap (Sesuai KTP)
                </label>
                <input
                  type="text"
                  value={user.name}
                  disabled
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#64748b",
                    fontSize: 14,
                    fontWeight: 600,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <span style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4, display: "block" }}>
                  Nama terkunci sesuai data registrasi kependudukan desa.
                </span>
              </div>

              {user.nik ? (
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                    Nomor Induk Kependudukan (NIK)
                  </label>
                  <input
                    type="text"
                    value={user.nik}
                    disabled
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#64748b",
                      fontSize: 14,
                      fontWeight: 600,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={{ fontSize: 11.5, color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <ShieldCheck size={13} /> Terverifikasi dalam basis data kependudukan desa
                  </span>
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                    Peran Pengguna
                  </label>
                  <input
                    type="text"
                    value={roleMeta.label}
                    disabled
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#64748b",
                      fontSize: 14,
                      fontWeight: 600,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4, display: "block" }}>
                    Hak akses ditetapkan oleh administrator sistem desa.
                  </span>
                </div>
              )}
            </div>

            {/* Row 2: Alamat Email & Verifikasi */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#344767", margin: 0 }}>
                  Alamat Email Akun & Notifikasi <span style={{ color: "#e11d48" }}>*</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {emailVerified ? (
                    <span
                      style={{
                        background: "#dcfce7",
                        color: "#15803d",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Check size={12} /> Email Terverifikasi Resmi
                    </span>
                  ) : (
                    <>
                      <span
                        style={{
                          background: "#fef3c7",
                          color: "#b45309",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <AlertCircle size={12} /> Belum Diverifikasi
                      </span>
                      <button
                        type="button"
                        onClick={handleVerifyEmail}
                        disabled={isVerifyingEmail}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #cbd5e1",
                          color: "#1e293b",
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: isVerifyingEmail ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          transition: "all 0.2s ease",
                        }}
                      >
                        {isVerifyingEmail ? (
                          <>
                            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                            Memproses...
                          </>
                        ) : (
                          <>
                            <Send size={11} /> Verifikasi Sekarang
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@domain.com"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 38px",
                    borderRadius: 10,
                    border: "1.5px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#1e293b",
                    fontSize: 14,
                    fontWeight: 600,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#5e72e4")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                />
                <Mail size={16} style={{ position: "absolute", left: 12, top: 13, color: "#64748b" }} />
              </div>
              <span style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, display: "block" }}>
                Alamat email digunakan sebagai kredensial masuk akun dan penerima notifikasi resmi dokumen pelayanan desa.
              </span>

              {email.toLowerCase() !== user.email.toLowerCase() && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "12px 16px",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#92400e", fontSize: 12.5, fontWeight: 600 }}>
                    <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0 }} />
                    <span>
                      Anda sedang mengganti alamat email dari <strong>{user.email}</strong> ke <strong>{email}</strong>. Status verifikasi email akan direset hingga diverifikasi kembali.
                    </span>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#78350f", marginBottom: 4 }}>
                      Konfirmasi Kata Sandi Saat Ini (jika akun memiliki password):
                    </label>
                    <input
                      type="password"
                      value={currentPasswordForEmail}
                      onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                      placeholder="Masukkan kata sandi akun untuk verifikasi keamanan"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #d97706",
                        fontSize: 13,
                        background: "#ffffff",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Row 3: Nomor Telepon / WhatsApp */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#344767", margin: 0 }}>
                  Nomor WhatsApp Penerima Notifikasi <span style={{ color: "#e11d48" }}>*</span>
                </label>
                <span
                  style={{
                    background: "#ecfdf5",
                    color: "#059669",
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Kanal Resmi WhatsApp
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890 atau +6281234567890"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 38px",
                    borderRadius: 10,
                    border: "1.5px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#1e293b",
                    fontSize: 14,
                    fontWeight: 600,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#2dce89")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                />
                <Phone size={16} style={{ position: "absolute", left: 12, top: 13, color: "#16a34a" }} />
              </div>

              {phone ? (
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                  <Check size={14} />
                  <span>
                    Format WhatsApp Terdeteksi: <strong>{formatWhatsAppDisplay(phone)}</strong> (Nomor ini ditargetkan menerima notifikasi desa)
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 11.5, color: "#e11d48", marginTop: 4, display: "block" }}>
                  Nomor WhatsApp wajib diisi agar Anda dapat menerima pemberitahuan instan saat status surat berubah.
                </span>
              )}
              <span style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, display: "block" }}>
                Sistem desa tidak pernah membagikan nomor kontak Anda. Nomor ini disimpan secara aman dan terenkripsi untuk pengiriman notifikasi resmi.
              </span>
            </div>

            {/* Row 4: Alamat Domisili */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                Alamat Domisili / Tempat Tinggal
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: RT 003 / RW 002, Dusun Krajan, Desa Digital"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#1e293b",
                  fontSize: 14,
                  fontWeight: 500,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  resize: "vertical",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#5e72e4")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
              />
              <span style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, display: "block" }}>
                Alamat domisili saat ini di wilayah desa.
              </span>
            </div>

            {/* Action Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                type="submit"
                disabled={isUpdatingProfile}
                style={{
                  padding: "12px 28px",
                  borderRadius: 10,
                  background: isUpdatingProfile ? "#94a3b8" : "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: isUpdatingProfile ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(94, 114, 228, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Simpan Perubahan Kontak
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 5. Tab 2: Keamanan & Password ── */}
      {activeTab === "keamanan" && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            padding: "28px 32px",
          }}
        >
          <div style={{ marginBottom: 24, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
              Perbarui Kata Sandi Akun
            </h4>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#64748b" }}>
              Pastikan menggunakan kombinasi kata sandi yang aman untuk melindungi data layanan kependudukan Anda.
            </p>
          </div>

          {passwordMsg && (
            <div
              style={{
                marginBottom: 20,
                padding: "14px 18px",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 600,
                background: passwordMsg.type === "success" ? "#f0fdf4" : "#fef2f2",
                border: passwordMsg.type === "success" ? "1px solid #bbf7d0" : "1px solid #fecaca",
                color: passwordMsg.type === "success" ? "#166534" : "#991b1b",
              }}
            >
              {passwordMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 520 }}>
            {/* Current Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                Kata Sandi Saat Ini <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Masukkan kata sandi saat ini"
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 14px",
                    borderRadius: 10,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 14,
                    color: "#1e293b",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                Kata Sandi Baru <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 14px",
                    borderRadius: 10,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 14,
                    color: "#1e293b",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                Konfirmasi Kata Sandi Baru <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Ulangi kata sandi baru"
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 14px",
                    borderRadius: 10,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 14,
                    color: "#1e293b",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                type="submit"
                disabled={isUpdatingPassword}
                style={{
                  padding: "12px 28px",
                  borderRadius: 10,
                  background: isUpdatingPassword ? "#94a3b8" : "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: isUpdatingPassword ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(17, 205, 239, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Perbarui Kata Sandi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 6. Tab 3: Informasi Akun & Kebijakan ── */}
      {activeTab === "info" && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            padding: "28px 32px",
          }}
        >
          <div style={{ marginBottom: 24, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
              Informasi Akun & Perlindungan Data
            </h4>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#64748b" }}>
              Status otorisasi, hak akses peran dalam sistem, dan jaminan kerahasiaan data kependudukan.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            <div style={{ background: "#f8fafc", borderRadius: 14, padding: "20px 22px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <ShieldCheck size={18} color="#5e72e4" />
                <h5 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "#1e293b" }}>Hak Akses Peran</h5>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                Akun Anda berstatus <strong>{roleMeta.label}</strong>. Seluruh permohonan surat dan tindakan administrasi diproses sesuai dengan kewenangan operasional standar desa.
              </p>
            </div>

            <div style={{ background: "#f8fafc", borderRadius: 14, padding: "20px 22px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Lock size={18} color="#10b981" />
                <h5 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "#1e293b" }}>Kerahasiaan Data (UU PDP)</h5>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                Data NIK, kartu keluarga, dan dokumen berkas Anda dilindungi dengan enkripsi ketat. Tidak dibagikan kepada pihak ketiga di luar keperluan administrasi resmi desa.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
