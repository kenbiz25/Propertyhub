
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Home, Search, User, Building2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebaseClient";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(auth.currentUser ?? null);
  const [authReady, setAuthReady] = useState(false); // avoid flicker on first paint

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const signInHref = useMemo(
    () => `/auth?from=${encodeURIComponent(location.pathname + location.search)}`,
    [location.pathname, location.search]
  );

  const onClickListProperty = () => {
    if (!auth.currentUser) {
      navigate(`/auth?from=${encodeURIComponent("/list-property")}`);
    } else {
      navigate("/list-property");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center glow-orange">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">
              House<span className="text-primary">hunter</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/listings" className="text-muted-foreground hover:text-foreground transition-colors">
              Browse
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="glass" size="sm" asChild>
              <Link to="/listings">
                <Search className="w-4 h-4" />
                Search
              </Link>
            </Button>

            {/* Guard until auth initializes to prevent flicker */}
            {!authReady ? (
              <div className="h-9 w-[200px] animate-pulse rounded-md bg-muted/60" />
            ) : fbUser ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/account">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                </Button>
                <Button size="sm" onClick={onClickListProperty}>
                  <Building2 className="w-4 h-4" />
                  List Property
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to={signInHref}>
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                </Button>
                <Button size="sm" onClick={onClickListProperty}>
                  <Building2 className="w-4 h-4" />
                  List Property
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/listings"
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Browse
              </Link>
              <Link
                to="/about"
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>

              <div className="flex flex-col gap-2 px-4 pt-4 border-t border-border">
                {!authReady ? (
                  <div className="h-9 w-full animate-pulse rounded-md bg-muted/60" />
                ) : fbUser ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      asChild
                      onClick={() => setIsOpen(false)}
                    >
                      <Link to="/account">
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </Button>
                    <Button
                      className="w-full justify-start"
                      onClick={() => {
                        setIsOpen(false);
                        onClickListProperty();
                      }}
                    >
                      <Building2 className="w-4 h-4" />
                      List Property
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      asChild
                      onClick={() => setIsOpen(false)}
                    >
                      <Link to={signInHref}>
                        <LogIn className="w-4 h-4" />
                        Sign In
                      </Link>
                    </Button>
                    <Button
                      className="w-full justify-start"
                      onClick={() => {
                        setIsOpen(false);
                        onClickListProperty();
                      }}
                    >
                      <Building2 className="w-4 h-4" />
                      List Property
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
