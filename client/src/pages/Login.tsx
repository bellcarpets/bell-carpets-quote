import { useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Bell Carpets</h1>
          <p className="text-sm text-muted-foreground mt-1">Quote Management System</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!requires2FA ? (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="pr-10 bg-input border-border"
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
              <div className="space-y-2">
                <Label htmlFor="totp" className="text-sm font-medium">Authenticator Code</Label>
                <Input
                  id="totp"
                  type="text"
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value)}
                  placeholder="000000"
                  className="bg-input border-border text-center text-xl tracking-widest"
                  maxLength={6}
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app</p>
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : requires2FA ? "Verify Code" : "Access Admin"}
            </Button>

            {requires2FA && (
              <button
                type="button"
                onClick={() => { setRequires2FA(false); setTotpCode(""); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to password
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Bell Carpets © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
