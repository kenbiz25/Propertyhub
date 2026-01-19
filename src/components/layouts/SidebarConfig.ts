
// src/components/layouts/sidebarConfig.ts

export type Role = "agent" | "admin" | "superadmin" | "customer";

export type SidebarContext = {
  role: Role;
  kycVerified?: boolean;
  subscriptionActive?: boolean;
  featureFlags?: Record<string, boolean>;
};

export type SidebarItem = {
  label: string;
  path: string;
  icon?: string;
  roles?: Role[];                      // restrict to these roles if set
  visibleIf?: (ctx: SidebarContext) => boolean; // extra conditions
};

export const baseSidebar: SidebarItem[] = [
  // Shared/public items could go here if you want one config to drive all
];

/**
 * Role-specific items. NOTE: We avoid dynamic params in sidebar (e.g. /:id).
 * If you need admin-only deep links, use buttons from within pages, not the sidebar.
 */
export const roleSidebar: Record<Role, SidebarItem[]> = {
  agent: [
    { label: "Overview",     path: "/agent",               icon: "Home",         roles: ["agent", "admin", "superadmin"] },
    { label: "Properties",   path: "/agent/properties",    icon: "Building2",    roles: ["agent", "admin", "superadmin"] },
    { label: "Messages",     path: "/agent/messages",      icon: "MessageSquare",roles: ["agent", "admin", "superadmin"] },
    { label: "Add Property", path: "/agent/list-property", icon: "Plus",         roles: ["agent", "admin", "superadmin"] },
    { label: "Settings",     path: "/agent/settings",      icon: "Settings",     roles: ["agent", "admin", "superadmin"] },

    // Show KYC only while not verified (for agents)
    {
      label: "KYC",
      path: "/agent/kyc",
      icon: "ShieldCheck",
      roles: ["agent", "admin", "superadmin"],
      visibleIf: (ctx) => ctx.role === "agent" && !ctx.kycVerified,
    },

    { label: "Team",         path: "/agent/team",          icon: "Users",        roles: ["agent", "admin", "superadmin"] },

    // Promotions: show if role supports OR feature flag enabled
    {
      label: "Promotions",
      path: "/agent/promotions",
      icon: "Star",
      roles: ["agent", "admin", "superadmin"],
      visibleIf: (ctx) => (ctx.featureFlags?.promotions ?? true), // default on; gate via FF
    },

    // Subscription link appears only if subscription is not active
    {
      label: "Subscription",
      path: "/subscription/billing",
      icon: "LayoutDashboard",
      roles: ["agent", "admin", "superadmin"],
      visibleIf: (ctx) => !ctx.subscriptionActive,
    },
  ],

  admin: [
    { label: "Admin Console", path: "/admin",              icon: "LayoutDashboard", roles: ["admin", "superadmin"] },
    // If you have an admin tab for promotions inside console, keep a single link
    // Deep link routes like /admin/promotions/:id should not appear in the sidebar
  ],

  superadmin: [
    // For now superadmin uses the same Admin Console
    { label: "Admin Console", path: "/admin",              icon: "LayoutDashboard", roles: ["superadmin"] },
  ],

  customer: [
    { label: "Dashboard",     path: "/customer",           icon: "Home",        roles: ["customer"] },
    { label: "Favorites",     path: "/favorites",          icon: "Heart",       roles: ["customer"] },
    { label: "Saved Searches",path: "/saved-searches",     icon: "Search",      roles: ["customer"] },
    { label: "Profile",       path: "/profile",            icon: "User",        roles: ["customer"] },
  ],
};

/**
 * Compute final sidebar links for the given user context.
 */
export function getSidebarLinks(ctx: SidebarContext): SidebarItem[] {
  const roleItems = roleSidebar[ctx.role] ?? [];
  return roleItems
    .filter((item) => {
      // role check
      if (item.roles && !item.roles.includes(ctx.role)) return false;
      // visibility predicate
      if (item.visibleIf && !item.visibleIf(ctx)) return false;
      return true;
    });
}
