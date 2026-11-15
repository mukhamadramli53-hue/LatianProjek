"use client";

import { useState, useTransition } from "react";
import {
  Bell,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Save,
  Check,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import {
  updateNotificationPreferences,
  updateUserEmail,
  requestEmailVerification,
} from "@/lib/actions/notification";

interface NotificationSettingsFormProps {
  initialUser: {
    id: string;
    name: string;
    email: string;
    emailVerified: Date | string | null;
    role: string;
    createdAt: Date | string;
  };
  initialPreferences: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
    notifyOnStatus: boolean;
    notifyOnRepair: boolean;
  };
  policyDescription: string;
}

export default function NotificationSettingsForm({
  initialUser,
  initialPreferences,
  policyDescription,
}: NotificationSettingsFormProps) {
  const [user, setUser] = useState(initialUser);
  const [preferences, setPreferences] = useState(initialPreferences);

  // Status Form Email
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailFormError, setEmailFormError] = useState<string | null>(null);
  const [emailFormSuccess, setEmailFormSuccess] = useState<string | null>(null);
  const [isSubmittingEmail, startEmailTransition] = useTransition();

  // Status Verifikasi Email
  const [isVerifying, startVerifyTransition] = useTransition();
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  // Status Preferensi
  const [isSavingPref, startPrefTransition] = useTransition();
  const [prefSuccess, setPrefSuccess] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);

  // Handler Ganti Email
  function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailFormError(null);
    setEmailFormSuccess(null);

    if (!newEmail.trim()) {
      setEmailFormError("Alamat email baru wajib diisi.");
      return;
    }

    startEmailTransition(async () => {
      const res = await updateUserEmail({
        newEmail: newEmail.trim(),
        currentPassword: currentPassword || undefined,
      });

      if (res.success) {
        setUser((prev) => ({
          ...prev,
          email: res.email!,
          emailVerified: res.emailVerified ?? null,
        }));
        setEmailFormSuccess(res.message || null);
        setNewEmail("");
        setCurrentPassword("");
        setIsChangingEmail(false);
      } else {
        setEmailFormError(res.error || "Gagal memperbarui alamat email.");
      }
    });
  }

  // Handler Verifikasi Email
  function handleVerifyEmail() {
    setVerifyMessage(null);
    startVerifyTransition(async () => {
      const res = await requestEmailVerification();
      if (res.success) {
        setUser((prev) => ({ ...prev, emailVerified: new Date() }));
        setVerifyMessage(res.message || null);
      } else {
        setVerifyMessage(res.error || "Gagal memverifikasi email.");
      }
    });
  }

  // Handler Simpan Preferensi
  function handleSavePreferences() {
    setPrefError(null);
    setPrefSuccess(false);

    startPrefTransition(async () => {
      const res = await updateNotificationPreferences(preferences);
      if (res.success) {
        setPrefSuccess(true);
        setTimeout(() => setPrefSuccess(false), 3500);
      } else {
        setPrefError("Gagal menyimpan preferensi notifikasi. Silakan coba kembali.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── CARD 1: Alamat Email & Status Verifikasi ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "26px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 12px rgba(17, 205, 239, 0.3)",
            }}
          >
            <Mail size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#344767" }}>
              Alamat Email Terdaftar
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#8392ab" }}>
              Digunakan untuk pengiriman notifikasi resmi surat desa, salinan dokumen, dan konfirmasi permohonan.
            </p>
          </div>
        </div>

        {/* Info Alamat Email Saat Ini */}
        <div
          style={{
            background: "#f8f9fe",
            borderRadius: 12,
            border: "1px solid #e9ecef",
            padding: "16px 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8392ab", textTransform: "uppercase" }}>
              Email Akun Pemohon
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#344767" }}>
              {user.email}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user.emailVerified ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: "#eafaf3",
                  color: "#2dce89",
                  fontSize: 12.5,
                  fontWeight: 800,
                  border: "1px solid rgba(45, 206, 137, 0.3)",
                }}
              >
                <CheckCircle2 size={15} />
                Terverifikasi
              </span>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: "#fff8ec",
                    color: "#fbb140",
                    fontSize: 12.5,
                    fontWeight: 800,
                    border: "1px solid rgba(251, 177, 64, 0.3)",
                  }}
                >
                  <AlertTriangle size={15} />
                  Belum Terverifikasi
                </span>

                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={isVerifying}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    background: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: "none",
                    cursor: isVerifying ? "wait" : "pointer",
                    boxShadow: "0 3px 8px rgba(17, 113, 239, 0.25)",
                  }}
                >
                  {isVerifying ? "Memproses..." : "Verifikasi Sekarang"}
                </button>
              </div>
            )}

            {!isChangingEmail && (
              <button
                type="button"
                onClick={() => {
                  setIsChangingEmail(true);
                  setEmailFormError(null);
                  setEmailFormSuccess(null);
                }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  background: "#ffffff",
                  color: "#5e72e4",
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: "1.5px solid #5e72e4",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Ubah Email
              </button>
            )}
          </div>
        </div>

        {verifyMessage && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 8,
              background: "#eafaf3",
              border: "1px solid #2dce89",
              color: "#2dce89",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check size={16} />
            {verifyMessage}
          </div>
        )}

        {/* Formulir Ubah Email dengan Validasi Aman */}
        {isChangingEmail && (
          <form
            onSubmit={handleUpdateEmail}
            style={{
              marginTop: 18,
              padding: "20px 22px",
              background: "#ffffff",
              borderRadius: 12,
              border: "1.5px solid #d2d6da",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <KeyRound size={17} color="#5e72e4" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#344767" }}>
                Validasi Perubahan Alamat Email
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
              Demi keamanan akun, perubahan alamat email memerlukan konfirmasi kata sandi. Email baru akan divalidasi keunikannya di pangkalan data desa dan status verifikasi akan direset otomatis.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                  Alamat Email Baru
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="contoh: nama.warga@gmail.com"
                  required
                  style={{
                    width: "100%",
                    padding: "9px 13px",
                    borderRadius: 8,
                    border: "1px solid #d2d6da",
                    fontSize: 13,
                    color: "#344767",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#344767", marginBottom: 6 }}>
                  Konfirmasi Kata Sandi Saat Ini
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akun Anda"
                  required
                  style={{
                    width: "100%",
                    padding: "9px 13px",
                    borderRadius: 8,
                    border: "1px solid #d2d6da",
                    fontSize: 13,
                    color: "#344767",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {emailFormError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#feecee",
                  border: "1px solid #f5365c",
                  color: "#f5365c",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                {emailFormError}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  setIsChangingEmail(false);
                  setEmailFormError(null);
                }}
                disabled={isSubmittingEmail}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "#f8f9fa",
                  border: "1px solid #d2d6da",
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingEmail}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isSubmittingEmail ? "wait" : "pointer",
                  boxShadow: "0 4px 12px rgba(94, 114, 228, 0.3)",
                }}
              >
                {isSubmittingEmail ? "Memverifikasi..." : "Simpan Email Baru"}
              </button>
            </div>
          </form>
        )}

        {emailFormSuccess && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 8,
              background: "#eafaf3",
              border: "1px solid #2dce89",
              color: "#2dce89",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check size={16} />
            {emailFormSuccess}
          </div>
        )}
      </div>

      {/* ── CARD 2: Saluran Pemberitahuan yang Boleh Diatur ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "26px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 12px rgba(94, 114, 228, 0.3)",
            }}
          >
            <Bell size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#344767" }}>
              Preferensi Saluran Notifikasi
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#8392ab" }}>
              Pilih kanal komunikasi yang ingin Anda terima untuk perkembangan pengajuan berkas.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Opsi 1: Notifikasi Email Berkala */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              background: "#f8f9fe",
              borderRadius: 12,
              border: "1px solid #e9ecef",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "80%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14.5, fontWeight: 800, color: "#344767" }}>
                  Email Notifikasi Berkala
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: "#eff2fe",
                    color: "#5e72e4",
                  }}
                >
                  Dapat Diatur
                </span>
              </div>
              <span style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.45 }}>
                Kirimkan email otomatis ke alamat terdaftar ketika berkas Anda berpindah tahapan (verifikasi awal staf, telaah draf, dan registrasi desa).
              </span>
            </div>

            <label style={{ position: "relative", display: "inline-block", width: 48, height: 26 }}>
              <input
                type="checkbox"
                checked={preferences.emailEnabled}
                onChange={(e) =>
                  setPreferences((prev) => ({ ...prev, emailEnabled: e.target.checked }))
                }
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: preferences.emailEnabled ? "#2dce89" : "#cbd5e1",
                  borderRadius: 34,
                  transition: ".3s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    content: '""',
                    height: 20,
                    width: 20,
                    left: preferences.emailEnabled ? 24 : 3,
                    bottom: 3,
                    backgroundColor: "white",
                    borderRadius: "50%",
                    transition: ".3s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </span>
            </label>
          </div>

          {/* Opsi 2: Notifikasi In-App di Website */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              background: "#f8f9fe",
              borderRadius: 12,
              border: "1px solid #e9ecef",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "80%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14.5, fontWeight: 800, color: "#344767" }}>
                  Notifikasi In-App (Lonceng Website)
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: "#eff2fe",
                    color: "#5e72e4",
                  }}
                >
                  Dapat Diatur
                </span>
              </div>
              <span style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.45 }}>
                Tampilkan lencana angka belum dibaca dan daftar riwayat pada ikon lonceng navigasi website.
              </span>
            </div>

            <label style={{ position: "relative", display: "inline-block", width: 48, height: 26 }}>
              <input
                type="checkbox"
                checked={preferences.inAppEnabled}
                onChange={(e) =>
                  setPreferences((prev) => ({ ...prev, inAppEnabled: e.target.checked }))
                }
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: preferences.inAppEnabled ? "#2dce89" : "#cbd5e1",
                  borderRadius: 34,
                  transition: ".3s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    content: '""',
                    height: 20,
                    width: 20,
                    left: preferences.inAppEnabled ? 24 : 3,
                    bottom: 3,
                    backgroundColor: "white",
                    borderRadius: "50%",
                    transition: ".3s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </span>
            </label>
          </div>

          {/* Opsi 3: Pengingat Tindak Lanjut Berkas */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              background: "#f8f9fe",
              borderRadius: 12,
              border: "1px solid #e9ecef",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "80%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14.5, fontWeight: 800, color: "#344767" }}>
                  Pengingat Kelengkapan Persyaratan
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: "#eff2fe",
                    color: "#5e72e4",
                  }}
                >
                  Dapat Diatur
                </span>
              </div>
              <span style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.45 }}>
                Terima pemberitahuan pengingat berkala jika terdapat dokumen perbaikan yang belum diunggah kembali setelah 24 jam.
              </span>
            </div>

            <label style={{ position: "relative", display: "inline-block", width: 48, height: 26 }}>
              <input
                type="checkbox"
                checked={preferences.notifyOnRepair}
                onChange={(e) =>
                  setPreferences((prev) => ({ ...prev, notifyOnRepair: e.target.checked }))
                }
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: preferences.notifyOnRepair ? "#2dce89" : "#cbd5e1",
                  borderRadius: 34,
                  transition: ".3s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    content: '""',
                    height: 20,
                    width: 20,
                    left: preferences.notifyOnRepair ? 24 : 3,
                    bottom: 3,
                    backgroundColor: "white",
                    borderRadius: "50%",
                    transition: ".3s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </span>
            </label>
          </div>
        </div>

        {prefError && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: "#feecee",
              border: "1px solid #f5365c",
              color: "#f5365c",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {prefError}
          </div>
        )}

        {prefSuccess && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: "#eafaf3",
              border: "1px solid #2dce89",
              color: "#2dce89",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check size={16} />
            Preferensi notifikasi berhasil disimpan dan langsung diterapkan ke sistem.
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={isSavingPref}
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
              cursor: isSavingPref ? "wait" : "pointer",
              boxShadow: "0 4px 12px rgba(94, 114, 228, 0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <Save size={16} />
            {isSavingPref ? "Menyimpan..." : "Simpan Perubahan Preferensi"}
          </button>
        </div>
      </div>

      {/* ── CARD 3: Kebijakan Notifikasi Pelayanan Publik Desa (Policy Enforced) ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1.5px solid #5e72e4",
          padding: "26px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #5e72e4, #11cdef, #2dce89)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#eff2fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#5e72e4",
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17.5, fontWeight: 800, color: "#344767" }}>
              Kebijakan Pelayanan & Keamanan Notifikasi Desa
            </h2>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#5e72e4" }}>
              Kepatuhan Standar Pelayanan Publik & Keputusan Resmi Kepala Desa
            </span>
          </div>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#525f7f", lineHeight: 1.6 }}>
          {policyDescription}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {/* Item 1 */}
          <div
            style={{
              padding: "12px 16px",
              background: "#f8fafd",
              borderRadius: 10,
              border: "1px solid #e9ecef",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Lock size={16} color="#5e72e4" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#344767" }}>
                  Keputusan Persetujuan Resmi
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 800, background: "#feecee", color: "#f5365c", padding: "1px 6px", borderRadius: 6 }}>
                  Wajib Sistem
                </span>
              </div>
              <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                Pemberitahuan persetujuan dan penerbitan berkas resmi selalu dikirimkan agar warga dapat segera mengambil/mengunduh dokumen sah.
              </span>
            </div>
          </div>

          {/* Item 2 */}
          <div
            style={{
              padding: "12px 16px",
              background: "#f8fafd",
              borderRadius: 10,
              border: "1px solid #e9ecef",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Lock size={16} color="#5e72e4" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#344767" }}>
                  Instruksi Resmi Perbaikan Berkas
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 800, background: "#feecee", color: "#f5365c", padding: "1px 6px", borderRadius: 6 }}>
                  Wajib Sistem
                </span>
              </div>
              <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                Catatan revisi persyaratan staf desa wajib tersampaikan untuk mencegah permohonan kadaluarsa atau ditolak secara sepihak.
              </span>
            </div>
          </div>

          {/* Item 3 */}
          <div
            style={{
              padding: "12px 16px",
              background: "#f8fafd",
              borderRadius: 10,
              border: "1px solid #e9ecef",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Lock size={16} color="#5e72e4" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#344767" }}>
                  Pemberitahuan Hasil & Alasan Resmi
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 800, background: "#feecee", color: "#f5365c", padding: "1px 6px", borderRadius: 6 }}>
                  Wajib Sistem
                </span>
              </div>
              <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                Keterbukaan alasan penolakan berkas merupakan hak hukum administrasi warga pemohon sesuai asas keterbukaan informasi publik desa.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
