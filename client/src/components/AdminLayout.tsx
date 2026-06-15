import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  FileText, Calendar, Users, Receipt, BookOpen,
  Building2, Bell, LogOut, LayoutGrid, Settings,
  ChevronDown
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
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
      {/* Top Navigation */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center h-12 px-4 gap-1">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <span className="font-bold text-sm tracking-widest text-foreground uppercase">Bell</span>
            <span className="text-primary font-bold text-sm tracking-widest uppercase">Carpets</span>
          </div>

          {/* Scope pills */}
          <div className="hidden md:flex items-center gap-1 mr-2 text-xs text-muted-foreground border-r border-border pr-3">
            <button className="px-2 py-0.5 rounded hover:bg-accent hover:text-foreground transition-colors">Residential</button>
            <span>|</span>
            <button className="px-2 py-0.5 rounded hover:bg-accent hover:text-foreground transition-colors">Commercial</button>
            <span>|</span>
            <button className="px-2 py-0.5 rounded hover:bg-accent hover:text-foreground transition-colors">Projects</button>
          </div>

          {/* Nav items */}
          <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = item.path === "/admin"
                ? location === "/admin" || location === "/admin/"
                : location.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <button
              onClick={() => navigate("/admin/settings")}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? "..." : "Lock"}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
