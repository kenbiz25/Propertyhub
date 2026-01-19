
// src/utils/roles.ts
export const isAdmin = (role?: string) => role === "admin" || role === "superadmin";
export const isSuperAdmin = (role?: string) => role === "superadmin";
export const isAgent = (role?: string) => role === "agent";
export const isCustomer = (role?: string) => role === "customer";