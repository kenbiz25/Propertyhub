
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import RequireAuth from "@/components/auth/RequireAuth";
import { withRoleGuard } from "@/components/auth/withRoleGuard";
import DashboardLayout from "@/components/layouts/DashboardLayout";

// Top-level pages
import Auth from "@/pages/auth/Auth";
import OAuthCallback from "@/pages/auth/OAuthCallback";
import Index from "@/pages/Index";

function Loader() {
  return <div className="p-6">Loading…</div>;
}

/* ---------- Lazy imports ---------- */
// Auth flow
const PostLoginRouter = lazy(() => import("@/pages/auth/PostLoginRouter"));
const OnboardingWizard = lazy(() => import("@/pages/auth/OnboardingWizard"));
const EmailVerificationPending = lazy(() => import("@/pages/auth/EmailVerificationPending"));
const UpdatePassword = lazy(() => import("@/pages/UpdatePassword"));
const Reauth = lazy(() => import("@/pages/Reauth"));

// Agent dashboard
const AgentOverview = lazy(() => import("@/pages/agent/AgentOverview"));
const AgentProperties = lazy(() => import("@/pages/agent/AgentProperties"));
const AgentSettings = lazy(() => import("@/pages/agent/Settings"));
const AgentMessages = lazy(() => import("@/pages/agent/AgentMessages"));
const AgentKyc = lazy(() => import("@/pages/agent/AgentKyc"));
const TeamMembers = lazy(() => import("@/pages/agent/TeamMembers"));
const PromotionRequests = lazy(() => import("@/pages/agent/PromotionRequests"));
const AgentProfile = lazy(() => import("@/pages/agent/AgentProfile"));
const ListPropertyAgent = lazy(() => import("@/pages/agent/ListProperty"));

// Customer dashboard
const CustomerView = lazy(() => import("@/pages/users/CustomerView"));

// Admin dashboard
const AdminConsole = lazy(() => import("@/pages/admin/AdminConsole"));
const PromotionDetails = lazy(() => import("@/pages/admin/PromotionDetails"));

// Public browse
const Listings = lazy(() => import("@/pages/property/Listings"));
const ListingDetail = lazy(() => import("@/pages/property/ListingDetail"));

// Subscription
const Billing = lazy(() => import("@/pages/subscription/Billing"));
const BillingPortal = lazy(() => import("@/pages/subscription/BillingPortal"));
const PaymentSuccess = lazy(() => import("@/pages/subscription/PaymentSuccess"));
const PaymentFailed = lazy(() => import("@/pages/subscription/PaymentFailed"));
const SubscribeCancel = lazy(() => import("@/pages/subscription/SubscribeCancel"));

// Misc pages
const About = lazy(() => import("@/pages/About"));
const Agents = lazy(() => import("@/pages/Agents"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Search = lazy(() => import("@/pages/Search"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Favorites = lazy(() => import("@/pages/users/Favorites"));
const SavedSearches = lazy(() => import("@/pages/SavedSearches"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const ReportContent = lazy(() => import("@/pages/ReportContent"));
const DeleteAccount = lazy(() => import("@/pages/DeleteAccount"));
const Support = lazy(() => import("@/pages/Support"));
const Unauthorized = lazy(() => import("@/pages/Unauthorized"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const ListPropertyPublic = lazy(() => import("@/pages/ListProperty"));

/* ---------- Role Guards ---------- */
const AdminConsoleGuarded = withRoleGuard(AdminConsole, ["admin", "superadmin"]);
const PromotionDetailsGuarded = withRoleGuard(PromotionDetails, ["admin", "superadmin"]);
const SuperadminAdminConsole = withRoleGuard(AdminConsole, ["superadmin"]);
const AgentKycGuarded = withRoleGuard(AgentKyc, ["agent", "admin", "superadmin"]);
const TeamMembersGuarded = withRoleGuard(TeamMembers, ["agent", "admin", "superadmin"]);
const PromotionRequestsGuarded = withRoleGuard(PromotionRequests, ["agent", "admin", "superadmin"]);

/* ---------- Routes ---------- */
const routes = [
  { path: "/", element: <Index /> },
  { path: "/auth", element: <Auth /> },
  { path: "/oauth/callback", element: <OAuthCallback /> },

  {
    path: "/post-login",
    element: (
      <Suspense fallback={<Loader />}>
        <PostLoginRouter />
      </Suspense>
    ),
  },

  { path: "/onboarding", element: (<Suspense fallback={<Loader />}><OnboardingWizard /></Suspense>) },
  { path: "/verify-email", element: (<Suspense fallback={<Loader />}><EmailVerificationPending /></Suspense>) },
  { path: "/update-password", element: (<Suspense fallback={<Loader />}><UpdatePassword /></Suspense>) },

  {
    path: "/reauth",
    element: (
      <RequireAuth>
        <Suspense fallback={<Loader />}><Reauth /></Suspense>
      </RequireAuth>
    ),
  },

  /* Public browse */
  { path: "/listings", element: (<Suspense fallback={<Loader />}><Listings /></Suspense>) },
  { path: "/listing/:id", element: (<Suspense fallback={<Loader />}><ListingDetail /></Suspense>) },
  { path: "/about", element: (<Suspense fallback={<Loader />}><About /></Suspense>) },
  { path: "/agents", element: (<Suspense fallback={<Loader />}><Agents /></Suspense>) },
  { path: "/privacy", element: (<Suspense fallback={<Loader />}><Privacy /></Suspense>) },
  { path: "/terms", element: (<Suspense fallback={<Loader />}><Terms /></Suspense>) },

  /* Customer dashboard */
  {
    path: "/customer",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <Suspense fallback={<Loader />}><CustomerView /></Suspense>
        </DashboardLayout>
      </RequireAuth>
    ),
  },

  /* Agent dashboard */
  {
    path: "/agent",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <Suspense fallback={<Loader />}><AgentOverview /></Suspense>
        </DashboardLayout>
      </RequireAuth>
    ),
  },
  {
    path: "/agent/properties",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <Suspense fallback={<Loader />}><AgentProperties /></Suspense>
        </DashboardLayout>
      </RequireAuth>
    ),
  },
  {
    path: "/agent/settings",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <Suspense fallback={<Loader />}><AgentSettings /></Suspense>
        </DashboardLayout>
      </RequireAuth>
    ),
  },
  {
    path: "/agent/messages",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <Suspense fallback={<Loader />}><AgentMessages /></Suspense>
        </DashboardLayout>
      </RequireAuth>
    ),
  },
  {
    path: "/agent/list-property",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <Suspense fallback={<Loader />}><ListPropertyAgent /></Suspense>
        </DashboardLayout>
      </RequireAuth>
    ),
  },

  /* Admin dashboard */
  {
    path: "/admin",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <Suspense fallback={<Loader />}><AdminConsoleGuarded /></Suspense>
        </DashboardLayout>
      </RequireAuth>
    ),
  },
  {
    path: "/admin/promotions/:id",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <Suspense fallback={<Loader />}><PromotionDetailsGuarded /></Suspense>
        </DashboardLayout>
      </RequireAuth>
    ),
  },

  /* Subscription */
  { path: "/subscription/success", element: (<Suspense fallback={<Loader />}><PaymentSuccess /></Suspense>) },
  { path: "/subscription/failed", element: (<Suspense fallback={<Loader />}><PaymentFailed /></Suspense>) },
  { path: "/subscription/cancel", element: (<Suspense fallback={<Loader />}><SubscribeCancel /></Suspense>) },
  {
    path: "/subscription/billing",
    element: (
      <RequireAuth>
        <Suspense fallback={<Loader />}><Billing /></Suspense>
      </RequireAuth>
    ),
  },
  {
    path: "/subscription/portal",
    element: (
      <RequireAuth>
        <Suspense fallback={<Loader />}><BillingPortal /></Suspense>
      </RequireAuth>
    ),
  },

  /* Misc */
  { path: "/search", element: (<Suspense fallback={<Loader />}><Search /></Suspense>) },
  { path: "/notifications", element: (<Suspense fallback={<Loader />}><Notifications /></Suspense>) },
  { path: "/favorites", element: (<Suspense fallback={<Loader />}><Favorites /></Suspense>) },
  { path: "/saved-searches", element: (<Suspense fallback={<Loader />}><SavedSearches /></Suspense>) },
  { path: "/reviews", element: (<Suspense fallback={<Loader />}><Reviews /></Suspense>) },
  { path: "/report", element: (<Suspense fallback={<Loader />}><ReportContent /></Suspense>) },
  { path: "/delete-account", element: (<Suspense fallback={<Loader />}><DeleteAccount /></Suspense>) },
  { path: "/support", element: (<Suspense fallback={<Loader />}><Support /></Suspense>) },
  { path: "/unauthorized", element: (<Suspense fallback={<Loader />}><Unauthorized /></Suspense>) },
  { path: "*", element: (<Suspense fallback={<Loader />}><NotFound /></Suspense>) },
];

const router = createBrowserRouter(routes);
const queryClient = new QueryClient();

export default function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
