"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";
import Link from "next/link";
import styles from "./login.module.css";
import { AlertCircle, EyeOff, Eye, LogIn } from "lucide-react";

const initialState: LoginState = {};

export default function LoginForm() {
 const [state, formAction, isPending] = useActionState(loginAction, initialState);
 const [showPassword, setShowPassword] = useState(false);
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");

 return (
 <form action={formAction} className={styles.form} noValidate>
 {/* Error Alert */}
 {state.error && (
 <div className={`alert alert-error ${styles.alert}`} role="alert" aria-live="polite">
 <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
 {state.error}
 </div>
 )}

 {/* Email */}
 <div className="form-group">
 <label htmlFor="login-email" className="form-label">
 Alamat Email
 </label>
 <input
 id="login-email"
 name="email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 autoComplete="email"
 required
 disabled={isPending}
 className="form-input"
 placeholder="nama@email.com"
 aria-required="true"
 />
 </div>

 {/* Password */}
 <div className="form-group">
 <div className={styles.passwordLabelRow}>
 <label htmlFor="login-password" className="form-label">
 Password
 </label>
 </div>
 <div className={styles.passwordWrapper}>
 <input
 id="login-password"
 name="password"
 type={showPassword ? "text" : "password"}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 autoComplete="current-password"
 required
 disabled={isPending}
 className="form-input"
 placeholder="••••••••"
 aria-required="true"
 />
 <button
 type="button"
 className={styles.togglePassword}
 onClick={() => setShowPassword(!showPassword)}
 aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
 >
 {showPassword ? (
 <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
 ) : (
 <Eye size={18} strokeWidth={2} aria-hidden="true" />
 )}
 </button>
 </div>
 </div>

 {/* Submit Button */}
 <button
 type="submit"
 id="login-submit"
 className="btn btn-primary btn-full btn-lg"
 disabled={isPending}
 aria-busy={isPending}
 >
 {isPending ? (
 <>
 <span className="spinner" aria-hidden="true" />
 Memverifikasi...
 </>
 ) : (
 <>
 <LogIn size={18} strokeWidth={2} aria-hidden="true" />
 Masuk
 </>
 )}
 </button>

 <div className={styles.footer}>
 <Link href="/" className={styles.backLink}>
          ← Kembali ke Beranda
        </Link>
      </div>
    </form>
  );
}
