# 🏡 Kenya Properties Platform

Kenya Properties is a modern, full-stack real estate platform built for search, leasing, agent management, and monetization.  
It brings buyers, renters, agents, and administrators into a single scalable system with subscriptions, promotions, and real-time communication.

Production-ready • Monetized • Role-based • Secure

---

## 🚀 Overview

Kenya Properties enables:
- Property discovery with advanced search
- Agent-managed listings and promotions
- Subscription-based monetization
- Real-time messaging and notifications
- Admin moderation, analytics, and compliance

Designed to scale from a local property marketplace to a regional housing platform.

---

## ✨ Key Features

### 👥 User Roles
- **Customer** – Browse listings, save favorites, message agents, manage subscription
- **Agent** – List properties, request promotions, manage team members
- **Admin** – Approve promotions, moderate reports, view analytics
- **Superadmin** – Full analytics, webhook monitoring, audits, and system control

---

### 🏘 Core Functionality
- Property listings & advanced search
- Favorites & saved searches
- Real-time messaging (Firestore listeners)
- Notifications system
- Reviews & reporting tools
- GDPR-compliant account deletion

---

### 💳 Monetization (Stripe)
- Subscription checkout via Stripe
- Self-service billing portal
- Promotion requests with admin approval workflow
- Webhook-driven role upgrades & access control

---

### 🛠 Admin & Superadmin Tools
- Promotion approval workflows
- Content moderation & reporting
- Analytics dashboards
- Stripe webhook status monitoring
- Role & access management

---

## 🧱 Tech Stack

**Frontend**
- React + Vite
- React Router
- React Query
- Tailwind CSS

**Backend & Infrastructure**
- Firebase Authentication
- Firestore (database + realtime listeners)
- Firebase Storage
- Firebase Functions (Stripe webhooks)

**Payments**
- Stripe Checkout
- Stripe Billing Portal

**Deployment**
- Vercel / Netlify / CPanel

---

## 🗂 Project Structure

## 🗂 Project Structure

```text
src/
 ├─ pages/
 │  ├─ dashboard/                 # Customer dashboards
 │  │  ├─ DashboardOverview.tsx
 │  │  ├─ DashboardProperties.tsx
 │  │  ├─ DashboardMessages.tsx
 │  │  ├─ DashboardSubscription.tsx
 │  │  ├─ MessageThread.tsx
 │  │  └─ Settings.tsx
 │  │
 │  ├─ admin/                     # Admin & Superadmin tools
 │  │  ├─ AdminPromotionRequests.tsx
 │  │  ├─ PromotionDetails.tsx
 │  │  ├─ AdminRoles.tsx
 │  │  ├─ AdminAnalytics.tsx
 │  │  ├─ AdminModeration.tsx
 │  │  ├─ SuperadminPanel.tsx
 │  │  └─ WebhookStatus.tsx
 │  │
 │  ├─ agent/                     # Agent tools & management
 │  │  ├─ AgentProfile.tsx
 │  │  ├─ PromotionRequests.tsx
 │  │  ├─ TeamMembers.tsx
 │  │  └─ AgentKyc.tsx
 │  │
 │  ├─ subscription/              # Stripe billing flows
 │  │  ├─ Billing.tsx
 │  │  ├─ BillingPortal.tsx
 │  │  ├─ PaymentSuccess.tsx
 │  │  └─ PaymentFailed.tsx
 │  │
 │  ├─ auth/                      # Authentication & onboarding
 │  │  ├─ Auth.tsx
 │  │  ├─ OAuthCallback.tsx
 │  │  ├─ OnboardingWizard.tsx
 │  │  └─ EmailVerificationPending.tsx
 │  │
 │  ├─ Search.tsx
 │  ├─ Favorites.tsx
 │  ├─ SavedSearches.tsx
 │  ├─ Notifications.tsx
 │  ├─ Reviews.tsx
 │  ├─ Support.tsx
 │  ├─ ReportContent.tsx
 │  ├─ DeleteAccount.tsx          # GDPR-compliant deletion
 │  └─ Unauthorized.tsx

```
🔐 Security & Access Control

Firebase Auth (Email/Password + OAuth)

Firestore Rules for role-based access

UI role guards (withRoleGuard, RoleGate)

Audited moderation actions

GDPR-compliant data deletion

🔄 Firebase Migration Summary

Migrated from Supabase to Firebase

Firestore replaces Postgres

Real-time messaging via Firestore listeners

Firebase Storage for media

Centralized role security in Firestore Rules

⚙️ Setup & Installation
git clone https://github.com/your-org/kenya-properties.git
cd kenya-properties
npm install
npm run dev

Environment Variables

Create a .env file:

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_STRIPE_PUBLIC_KEY=

📦 Deployment

Frontend: Vercel / Netlify / CPanel

Backend: Firebase Functions (Stripe webhooks)

🔮 Roadmap

Advanced analytics (growth, churn, revenue)

Bulk moderation tools

File uploads for reports

Multi-language support (including Swahili)

Mobile-first UX improvements

📜 Compliance

GDPR-compliant account deletion

Data minimization practices

Moderation audit trails

Webhook log retention limits (90 days)
