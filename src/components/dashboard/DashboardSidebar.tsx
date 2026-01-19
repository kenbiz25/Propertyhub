
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Building2,
  MessageSquare,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebaseClient"; // ✅ Firebase client import
import { cn as _cn } from "@/lib/utils";

const cn = (...classes: (string | false | null | undefined)[]) =>
  typeof _cn === "function" ? _cn(...classes) : classes.filter(Boolean).join(" ");

const menuItems = [
  { name: "Overview", icon: Home, path: "/dashboard" },
  { name: "My Properties", icon: Building2, path: "/dashboard/properties" },
  { name: "Messages", icon: MessageSquare, path: "/dashboard/messages" },
  { name: "Subscription", icon: CreditCard, path: "/dashboard/subscription" },
  { name: "Settings", icon: SettingsIcon, path: "/dashboard/settings" },
];

export default function DashboardSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut(); // ✅ Firebase logout
    } catch (e) {
      console.error("Sign out error:", e);
    } finally {
      localStorage.removeItem("hh_return_to"); // optional cleanup
      navigate("/auth", { replace: true });
    }
  };

  const baseLink =
    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-slate-200";
  const activeLink = "bg-orange-600 text-white shadow-md";
  const inactiveLink = "hover:bg-gray-800 hover:text-orange-400";

  return (
    <aside className="bg-gray-900 text-white w-64 flex flex-col justify-between h-screen p-4">
      {/* Branding */}
      <div>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">
            House<span className="text-orange-500">hunter</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) => cn(baseLink, isActive ? activeLink : inactiveLink)}
            >
              <item.icon className="w-5 h-5" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Logout */}
      <div className="mt-8">
        <Button
          variant="outline"
          className="w-full justify-start text-white border-gray-700 hover:bg-gray-800"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
