import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Key, QrCode, Check, X, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const utils = trpc.useUtils();

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // 2FA
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
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Settings
        </h1>

        {/* Change Password */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-primary" /> Change Password
          </h2>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Current Password</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="mt-1 bg-input border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">New Password</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="mt-1 bg-input border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="mt-1 bg-input border-border" />
            </div>
            <Button onClick={handleChangePw} disabled={!currentPw || !newPw || !confirmPw || changePwMutation.isPending}>
              {changePwMutation.isPending ? "Saving..." : "Change Password"}
            </Button>
          </div>
        </div>

        {/* 2FA */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
            <QrCode className="w-4 h-4 text-primary" /> Two-Factor Authentication (2FA)
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Use an authenticator app (Google Authenticator, Authy) to add an extra layer of security.
          </p>

          {is2FAEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check className="w-4 h-4" /> 2FA is currently enabled
              </div>
              <Button variant="outline" onClick={() => disable2FAMutation.mutate()} disabled={disable2FAMutation.isPending} className="text-destructive border-destructive hover:bg-destructive/10">
                <X className="w-4 h-4 mr-2" /> Disable 2FA
              </Button>
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
                  <code className="text-xs bg-input px-2 py-1 rounded font-mono text-foreground">{secret}</code>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Enter the 6-digit code from your app to verify</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={totpInput}
                    onChange={e => setTotpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="bg-input border-border w-32 font-mono text-center tracking-widest"
                    maxLength={6}
                  />
                  <Button onClick={() => verify2FAMutation.mutate({ token: totpInput })} disabled={totpInput.length !== 6 || verify2FAMutation.isPending}>
                    <Check className="w-4 h-4 mr-1" /> Verify & Enable
                  </Button>
                  <Button variant="outline" onClick={() => { setQrCode(null); setSecret(null); setTotpInput(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4" /> 2FA is not enabled
              </div>
              <Button onClick={() => setup2FAMutation.mutate()} disabled={setup2FAMutation.isPending}>
                <QrCode className="w-4 h-4 mr-2" /> Set Up 2FA
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
