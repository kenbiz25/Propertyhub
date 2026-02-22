
import { Link, Outlet, useLocation } from "react-router-dom";

export default function Account() {
  const { pathname } = useLocation();
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6">Your Account</h1>
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <Link to="/account/favorites" className={`px-3 py-2 rounded text-center sm:text-left ${pathname.endsWith("/favorites") || pathname === "/account" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
          Saved
        </Link>
        <Link to="/account/inquiries" className={`px-3 py-2 rounded text-center sm:text-left ${pathname.endsWith("/inquiries") ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
          Contacted
        </Link>
      </div>
      <Outlet />
    </div>
  );
}
