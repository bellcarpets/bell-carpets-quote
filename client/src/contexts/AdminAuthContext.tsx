import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface AdminAuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string, totpCode?: string) => Promise<{ requires2FA?: boolean }>;
  logout: () => Promise<void>;
  refetch: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const checkQuery = trpc.admin.check.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const loginMutation = trpc.admin.login.useMutation();
  const logoutMutation = trpc.admin.logout.useMutation();
  const utils = trpc.useUtils();

  const isAuthenticated = checkQuery.data?.authenticated ?? false;
  const isLoading = checkQuery.isLoading;

  const login = useCallback(async (password: string, totpCode?: string) => {
    const result = await loginMutation.mutateAsync({ password, totpCode });
    if ((result as any).requires2FA) return { requires2FA: true };
    await utils.admin.check.invalidate();
    return {};
  }, [loginMutation, utils]);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    await utils.admin.check.invalidate();
  }, [logoutMutation, utils]);

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, refetch: () => utils.admin.check.invalidate() }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
