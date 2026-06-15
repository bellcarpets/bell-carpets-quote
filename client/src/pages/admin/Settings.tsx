import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Key, QrCode, Check, X, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const utils = trpc.useUtils();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpInput, setTotpInput] = useState("");

  const status2FA = trpc.admin.get2FAStatus.useQuery();
  const changePwMutation = trpc.admin.changePassword.useMutation({
    onSuccess: () => { toast.success("Password changed"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const setup2FAMutation = trpc.admin.setup2FA.useMutation({
    onSuccess: (data: any) => { setQrCode(data.qrCode); setSecret(data.secret); },
    onError: (e: any) => toast.error(e.message),
  });
  const verify2FAMutation = trpc.admin.verify2FA.useMutation({
    onSuccess: () => { toast.success("2FA enabled"); utils.admin.get2FAStatus.invalidate(); setQrCode(null); setSecret(null); setTotpInput(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const disable2FAMutation = trpc.admin.disable2FA.useMutation({
    onSuccess: () => { toast.success("2FA disabled"); utils.admin.get2FAStatus.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleChangePw = () => {
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    changePwMutation.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  const is2FAEnabled = status2FA.data?.enabled ?? false;

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="mb-4">
          <h1 className="font-display text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Security and account settings</p>
        </div>

        {/* Change Password */}
        <div className="section-accordion">
          <div className="section-accordion-header">
            <span className="flex items-center gap-2"><Key className="w-4 h-4 text-muted-foreground" /> Change Password</span>
          </div>
          <div className="section-accordion-body space-y-3">
            <div>
              <label className="field-label">Current Password</label>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="field-input" />
            </div>
            <div>
              <label className="field-label">New Password</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="field-input" />
            </div>
            <div>
              <label className="field-label">Confirm New Password</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="field-input" />
            </div>
            <button
              className="btn-primary"
              onClick={handleChangePw}
              disabled={!currentPw || !newPw || !confirmPw || changePwMutation.isPending}
            >
              {changePwMutation.isPending ? "Saving..." : "Change Password"}
            </button>
          </div>
        </div>

        {/* 2FA */}
        <div className="section-accordion">
          <div className="section-accordion-header">
            <span className="flex items-center gap-2"><QrCode className="w-4 h-4 text-muted-foreground" /> Two-Factor Authentication (2FA)</span>
          </div>
          <div className="section-accordion-body">
            <p className="text-xs text-muted-foreground mb-4">
              Use an authenticator app (Google Authenticator, Authy) to add an extra layer of security.
            </p>

            {is2FAEnabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(72% 0.18 145)" }}>
                  <Check className="w-4 h-4" /> 2FA is currently enabled
                </div>
                <button
                  className="btn-secondary flex items-center gap-1.5 text-[oklch(65%_0.18_25)] border-[oklch(30%_0.1_25)] hover:bg-[oklch(10%_0.03_25)]"
                  onClick={() => disable2FAMutation.mutate()}
                  disabled={disable2FAMutation.isPending}
                >
                  <X className="w-3.5 h-3.5" /> Disable 2FA
                </button>
              </div>
            ) : qrCode ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-foreground mb-3">Scan this QR code with your authenticator app:</p>
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg border border-border" />
                </div>
                {secret && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Or enter this key manually:</p>
                    <code className="text-xs bg-[oklch(8%_0_0)] border border-border px-2 py-1 rounded font-mono text-foreground">{secret}</code>
                  </div>
                )}
                <div>
                  <label className="field-label">Enter the 6-digit code from your app to verify</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      value={totpInput}
                      onChange={e => setTotpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="field-input w-32 font-mono text-center tracking-widest"
                      maxLength={6}
                    />
                    <button
                      className="btn-primary flex items-center gap-1.5"
                      onClick={() => verify2FAMutation.mutate({ token: totpInput })}
                      disabled={totpInput.length !== 6 || verify2FAMutation.isPending}
                    >
                      <Check className="w-3.5 h-3.5" /> Verify & Enable
                    </button>
                    <button className="btn-secondary" onClick={() => { setQrCode(null); setSecret(null); setTotpInput(""); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(75% 0.15 75)" }}>
                  <AlertCircle className="w-4 h-4" /> 2FA is not enabled
                </div>
                <button className="btn-primary flex items-center gap-1.5" onClick={() => setup2FAMutation.mutate()} disabled={setup2FAMutation.isPending}>
                  <QrCode className="w-3.5 h-3.5" /> Set Up 2FA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
