import { useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useAdminAuth();
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(password, requires2FA ? totpCode : undefined);
      if (result.requires2FA) {
        setRequires2FA(true);
      } else {
        navigate("/admin");
      }
    } catch (err: any) {
      setError(err?.message ?? "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo block */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-semibold tracking-[0.2em] text-foreground uppercase mb-1">
          Bell Carpets
        </h1>
        <p className="text-[0.65rem] tracking-[0.25em] text-muted-foreground uppercase">
          Quote Management System
        </p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-xs bg-card border border-border rounded-xl p-7">
        <form onSubmit={handleSubmit} className="space-y-5">
          {!requires2FA ? (
            <div>
              <label className="field-label">Admin Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="field-input pr-10"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="field-label">Authenticator Code</label>
              <input
                type="text"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value)}
                placeholder="000000"
                className="field-input text-center text-xl tracking-[0.4em]"
                maxLength={6}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          )}

          {error && (
            <div className="text-xs text-[oklch(65%_0.18_30)] bg-[oklch(15%_0.05_27)] border border-[oklch(30%_0.08_27/0.5)] rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Verifying..." : requires2FA ? "Verify Code" : "Access Admin"}
          </button>

          {requires2FA && (
            <button
              type="button"
              onClick={() => { setRequires2FA(false); setTotpCode(""); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to password
            </button>
          )}
        </form>
      </div>

      <p className="text-center text-[0.65rem] text-muted-foreground mt-8 tracking-widest uppercase">
        Bell Carpets © {new Date().getFullYear()}
      </p>
    </div>
  );
}
