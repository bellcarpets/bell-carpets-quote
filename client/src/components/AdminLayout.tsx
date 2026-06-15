import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useLocation } from "wouter";
import {
  FileText, Calendar, Users, Receipt, BookOpen,
  Building2, Bell, Lock, LayoutGrid, Settings,
  ExternalLink
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Quotes", path: "/admin", icon: LayoutGrid },
  { label: "Calendar", path: "/admin/calendar", icon: Calendar },
  { label: "Contacts", path: "/admin/contacts", icon: Users },
  { label: "Invoices", path: "/admin/invoices", icon: Receipt },
  { label: "Library", path: "/admin/library", icon: BookOpen },
  { label: "Agencies", path: "/admin/agencies", icon: Building2 },
  { label: "Notifs", path: "/admin/notifications", icon: Bell },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { logout } = useAdminAuth();
  const [location, navigate] = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation — exact match to original */}
      <header className="top-nav">
        <div className="top-nav-inner">
          {/* Logo */}
          <div className="top-nav-logo mr-3">
            <img src="/manus-storage/bell-carpets-logo-white_e8bda457.svg" alt="Bell Carpets" className="h-7 w-auto" />
          </div>

          {/* Scope pills */}
          <div className="top-nav-links mr-3 hidden md:flex">
            <span className="text-[oklch(55%_0_0)] text-[0.6rem] tracking-widest uppercase">RESIDENTIAL</span>
            <span className="mx-1.5 text-[oklch(28%_0_0)]">|</span>
            <span className="text-[oklch(55%_0_0)] text-[0.6rem] tracking-widest uppercase">COMMERCIAL</span>
            <span className="mx-1.5 text-[oklch(28%_0_0)]">|</span>
            <span className="text-[oklch(55%_0_0)] text-[0.6rem] tracking-widest uppercase">PROJECTS</span>
          </div>

          {/* Lock button — left of nav */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="top-nav-lock mr-1"
            title="Lock / Log out"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{loggingOut ? "..." : "Lock"}</span>
          </button>

          {/* Nav tabs */}
          <nav className="top-nav-tabs overflow-x-auto">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = item.path === "/admin"
                ? location === "/admin" || location === "/admin/" || location === "/"
                : location.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`top-nav-tab${isActive ? " active" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={() => navigate("/admin/settings")}
              className={`top-nav-tab${location.startsWith("/admin/settings") ? " active" : ""}`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </nav>

          {/* New Quote button */}
          <button
            onClick={() => navigate("/admin/quotes/new")}
            className="btn-new-quote ml-3 shrink-0"
          >
            + New Quote
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
