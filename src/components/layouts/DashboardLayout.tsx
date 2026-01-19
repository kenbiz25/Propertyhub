
// src/components/layouts/DashboardLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import { getSidebarLinks, Role, SidebarContext } from "./sidebarConfig";
import {
  Menu, X,
  Home, Building2, MessageSquare, Plus,
  Settings as SettingsIcon, ShieldCheck, Users, Star,
  LayoutDashboard, Heart, Search as SearchIcon, User as UserIcon, LogOut
} from "lucide-react";

function getIconByName(name?: string) {
  switch (name) {
    case "Home": return Home;
    case "Building2": return Building2;
    case "MessageSquare": return MessageSquare;
    case "Plus": return Plus;
    case "Settings": return SettingsIcon;
    case "ShieldCheck": return ShieldCheck;
    case "Users": return Users;
    case "Star": return Star;
    case "LayoutDashboard": return LayoutDashboard;
    case "Heart": return Heart;
    case "Search": return SearchIcon;
    case "User": return UserIcon;
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
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [role, setRole] = useState<Role>("customer");
  const [kycVerified, setKycVerified] = useState<boolean>(false);
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  // Header user menu
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

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

  // Build the context → compute links
  const ctx: SidebarContext = useMemo(() => ({
    role,
    kycVerified,
    subscriptionActive,
    featureFlags,
  }), [role, kycVerified, subscriptionActive, featureFlags]);

  const links = useMemo(() => getSidebarLinks(ctx), [ctx]);

  // Close mobile sidebar & user menu on route change
  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [location.pathname]);

  const u = auth.currentUser;
  const avatar = getAvatarUrl();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className={`fixed z-40 top-0 left-0 h-full w-64 bg-gray-900/95 backdrop-blur border-r border-border transition-transform md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:static md:block`}
        aria-label="Sidebar"
      >
        <div className="px-4 py-4 flex items-center justify-between border-b border-border">
          <div className="font-display text-lg font-bold text-white">Househunter</div>
          <button
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-gray-800"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role chip */}
        <div className="px-4 py-2">
          <span className="inline-flex items-center rounded-full bg-orange-600/20 text-orange-300 px-3 py-1 text-xs uppercase tracking-wide">
            {role}
          </span>
        </div>

        {/* Navigation */}
        <nav className="px-2 py-2 space-y-1">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-400">Loading menu…</div>
          ) : links.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-400">No menu items available.</div>
          ) : (
            links.map((link) => {
              const Icon = getIconByName(link.icon);
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? "bg-orange-600/20 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{link.label}</span>
                </NavLink>
              );
            })
          )}
        </nav>

        {/* Sidebar footer with logout (kept here as requested) */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
          <button
            // logout lives ONLY in the sidebar
            onClick={() => { import("firebase/auth").then(({ signOut }) => signOut(auth)).finally(() => { window.location.href = "/"; }); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-64">
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
            <div className="text-sm text-muted-foreground">Dashboard</div>

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
                    <div className="text-muted-foreground truncate">{u?.email}</div>
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

        <main className="p-4 md:p-6 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
