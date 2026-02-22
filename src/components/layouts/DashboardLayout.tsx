
// src/components/layouts/DashboardLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, Link, useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebaseClient";
import { collection, doc, getCountFromServer, getDoc, query, where } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { getSidebarLinks, Role, SidebarContext } from "./sidebarConfig";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Menu, X,
  Home, Building2, Plus,
  Settings as SettingsIcon, ShieldCheck, Users, Star,
  LayoutDashboard, Heart, Search as SearchIcon, User as UserIcon, LogOut,
  Bell, BadgeDollarSign,
} from "lucide-react";

function getIconByName(name?: string) {
  switch (name) {
    case "Home": return Home;
    case "Building2": return Building2;
    case "Plus": return Plus;
    case "Settings": return SettingsIcon;
    case "ShieldCheck": return ShieldCheck;
    case "Users": return Users;
    case "Star": return Star;
    case "LayoutDashboard": return LayoutDashboard;
    case "Heart": return Heart;
    case "Search": return SearchIcon;
    case "User": return UserIcon;
    case "BadgeDollarSign": return BadgeDollarSign;
    default: return LayoutDashboard;
  }
}

// Fallback avatar (initials) when no photoURL is present
function getAvatarUrl() {
  const u = auth.currentUser;
  if (u?.photoURL) return u.photoURL;
  const seed = encodeURIComponent(u?.displayName ?? u?.email ?? "User");
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear&fontWeight=700`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [role, setRole] = useState<Role>("customer");
  const [viewRole, setViewRole] = useState<Role | null>(null);
  const [kycVerified, setKycVerified] = useState<boolean>(false);
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  // Header user menu
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  // Pending boost requests count (admin bell)
  const isAdmin = role === "admin" || role === "superadmin";
  const { data: pendingBoostCount = 0 } = useQuery({
    queryKey: ["pending-boost-count"],
    queryFn: async () => {
      const snap = await getCountFromServer(
        query(collection(db, "boost_requests"), where("status", "==", "pending"))
      );
      return snap.data().count;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Fetch user doc → role + flags
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cachedRole = typeof window !== "undefined" ? localStorage.getItem("hh_role") : null;
        if (cachedRole && ["agent", "admin", "superadmin", "customer"].includes(cachedRole)) {
          setRole(cachedRole as Role);
        }

        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          const r = (data.role ?? cachedRole ?? "customer") as Role;
          if (mounted) {
            setRole(r);
            setKycVerified(!!data.kyc_verified);
            setSubscriptionActive(!!data.subscription_active);
            setFeatureFlags((data.features ?? {}) as Record<string, boolean>);
            setLoading(false);
            try { localStorage.setItem("hh_role", r); } catch {}
          }
        } else {
          if (mounted) setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (role === "agent") {
      const saved = typeof window !== "undefined" ? localStorage.getItem("hh_view_role") : null;
      if (saved === "customer" || saved === "agent") {
        setViewRole(saved as Role);
      } else {
        setViewRole("agent");
      }
    } else {
      setViewRole(null);
    }
  }, [role]);

  // Build the context → compute links
  const effectiveRole = viewRole ?? role;

  const ctx: SidebarContext = useMemo(() => ({
    role: effectiveRole,
    kycVerified,
    subscriptionActive,
    featureFlags,
  }), [effectiveRole, kycVerified, subscriptionActive, featureFlags]);

  const links = useMemo(() => getSidebarLinks(ctx), [ctx]);
  const uniqueLinks = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getSidebarLinks>[number]>();
    links.forEach((link) => {
      if (!map.has(link.path)) map.set(link.path, link);
    });
    return Array.from(map.values());
  }, [links]);

  const headerNav = [
    { label: "Home", path: "/" },
    { label: "Browse", path: "/listings" },
    { label: "Agents", path: "/agents" },
    { label: "Mortgage", path: "/mortgage-calculator" },
    { label: "Support", path: "/support" },
  ];

  // Close mobile sidebar & user menu on route change
  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [location.pathname]);

  const u = auth.currentUser;
  const avatar = getAvatarUrl();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card text-foreground flex">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-40 top-0 left-0 h-full w-64 bg-sidebar/95 text-sidebar-foreground backdrop-blur border-r border-sidebar-border transition-transform md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:static md:block`}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col">
          <div className="px-4 py-4 flex items-center justify-between border-b border-sidebar-border">
            <div className="font-display text-lg font-bold text-gradient">Kenya Properties</div>
            <button
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role chip */}
          <div className="px-4 py-2">
            <span className="inline-flex items-center rounded-full bg-primary/20 text-primary px-3 py-1 text-xs uppercase tracking-wide">
              {effectiveRole}
            </span>
          </div>

          {/* Navigation */}
          <nav className="px-2 py-2 space-y-1 flex-1 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">Loading menu…</div>
            ) : uniqueLinks.length === 0 ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">No menu items available.</div>
            ) : (
              uniqueLinks.map((link) => {
                const Icon = getIconByName(link.icon);
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{link.label}</span>
                  </NavLink>
                );
              })
            )}
          </nav>

          {/* Sidebar footer with logout */}
          <div className="border-t border-sidebar-border p-3">
            <button
              // logout lives ONLY in the sidebar
              onClick={() => { import("firebase/auth").then(({ signOut }) => signOut(auth)).finally(() => { window.location.href = "/"; }); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
          <div className="h-14 px-4 flex items-center justify-between">
            {/* Mobile open */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb/title placeholder */}
            <div className="text-sm text-muted-foreground hidden sm:block">
              {uniqueLinks.find((l) => l.path === location.pathname)?.label ?? "Dashboard"}
            </div>

            {/* Header nav */}
            <div className="hidden lg:flex items-center gap-4 text-sm">
              {headerNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {role === "agent" && (
              <Button
                size="sm"
                variant="outline"
                className="hidden md:inline-flex"
                onClick={() => {
                  const next = effectiveRole === "agent" ? "customer" : "agent";
                  try { localStorage.setItem("hh_view_role", next); } catch {}
                  setViewRole(next as Role);
                  window.location.href = next === "customer" ? "/customer" : "/agent";
                }}
              >
                Switch to {effectiveRole === "agent" ? "Customer" : "Agent"} View
              </Button>
            )}

            {/* Admin notification bell */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin?tab=campaigns")}
                className="relative inline-flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Pending campaign payments"
              >
                <Bell className="h-5 w-5" />
                {pendingBoostCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {pendingBoostCount > 9 ? "9+" : pendingBoostCount}
                  </span>
                )}
              </button>
            )}

            {/* Header User Menu (no logout here) */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted"
                aria-label="Account menu"
              >
                <img
                  src={avatar}
                  alt="avatar"
                  className="h-8 w-8 rounded-full border border-border object-cover"
                />
                <span className="hidden sm:inline text-sm text-muted-foreground">
                  {u?.displayName ?? "Account"}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-popover shadow-lg">
                  <div className="px-3 py-2 text-sm">
                    <div className="font-medium truncate">{u?.displayName ?? "Account"}</div>
                  </div>
                  <div className="border-t border-border" />

                  {/* Quick links only—no logout */}
                  <div className="py-1">
                    <Link
                      to="/profile"
                      className="block px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/saved-searches"
                      className="block px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => setMenuOpen(false)}
                    >
                      Saved Searches
                    </Link>
                    <Link
                      to="/favorites"
                      className="block px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => setMenuOpen(false)}
                    >
                      Favorites
                    </Link>
                    {role === "agent" && (
                      <button
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => {
                          const next = effectiveRole === "agent" ? "customer" : "agent";
                          try { localStorage.setItem("hh_view_role", next); } catch {}
                          setViewRole(next as Role);
                          setMenuOpen(false);
                          window.location.href = next === "customer" ? "/customer" : "/agent";
                        }}
                      >
                        Switch to {effectiveRole === "agent" ? "Customer" : "Agent"} View
                      </button>
                    )}
                  </div>

                  <div className="border-t border-border" />
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Role: <span className="uppercase">{role}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-7xl w-full mr-auto flex-1">{children}</main>
        <footer className="w-full border-t border-border/20">
          <div className="max-w-7xl w-full mr-auto px-4 md:px-6 py-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 Kenya Properties. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
