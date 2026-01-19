import { Link } from "react-router-dom";
import { Home, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
                <Home className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">
                House<span className="text-primary">hunter</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Kenya's premier real estate marketplace. Find your dream home across Africa with verified listings and trusted agents.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/listings?type=rent" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Properties for Rent
                </Link>
              </li>
              <li>
                <Link to="/listings?type=sale" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Properties for Sale
                </Link>
              </li>
              <li>
                <Link to="/listings?type=lease" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Commercial Leases
                </Link>
              </li>
              <li>
                <Link to="/agents" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Find an Agent
                </Link>
              </li>
              <li>
                <Link to="/list-property" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  List Your Property
                </Link>
              </li>
            </ul>
          </div>

          {/* Locations */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-4">Popular Cities</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/listings?city=nairobi" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Nairobi
                </Link>
              </li>
              <li>
                <Link to="/listings?city=mombasa" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Mombasa
                </Link>
              </li>
              <li>
                <Link to="/listings?city=kisumu" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Kisumu
                </Link>
              </li>
              <li>
                <Link to="/listings?city=nakuru" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Nakuru
                </Link>
              </li>
              <li>
                <Link to="/listings?city=eldoret" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Eldoret
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                Westlands, Nairobi, Kenya
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                +254 700 000 000
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                hello@househunter.co.ke
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Househunter. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground text-center md:text-left">
            Househunter.com is a marketplace. Buyers and tenants must independently verify property ownership,
            conduct title searches, and comply with local laws and county planning regulations.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
