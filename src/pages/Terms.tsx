import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        <div className="container mx-auto px-4 py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl font-bold mb-8">Terms of Service</h1>
            
            <div className="prose prose-invert max-w-none space-y-6">
              <p className="text-muted-foreground">
                Last updated: January 2026
              </p>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">
                  By accessing or using Househunter.com ("the Service"), you agree to be bound by these 
                  Terms of Service. If you do not agree to these terms, please do not use the Service.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">2. Description of Service</h2>
                <p className="text-muted-foreground">
                  Househunter is a real estate marketplace that connects property seekers with property 
                  owners and agents. We provide a platform for listing and discovering properties for 
                  sale, rent, or lease across Kenya and Africa.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">3. User Responsibilities</h2>
                <p className="text-muted-foreground mb-4">
                  As a user of Househunter, you agree to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Provide accurate and truthful information in your listings and profile</li>
                  <li>Verify property ownership before listing a property for sale or rent</li>
                  <li>Not engage in fraudulent or deceptive practices</li>
                  <li>Respect the intellectual property rights of others</li>
                  <li>Not use the Service for any illegal purposes</li>
                  <li>Not harass or harm other users</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">4. Property Listings</h2>
                <p className="text-muted-foreground mb-4">
                  Property owners and agents who list properties on Househunter must:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Have legal authority to list the property</li>
                  <li>Provide accurate descriptions, prices, and images</li>
                  <li>Keep listing information up to date</li>
                  <li>Respond to inquiries in a timely manner</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">5. Disclaimer</h2>
                <p className="text-muted-foreground">
                  Househunter is a marketplace and does not own or control any properties listed on the 
                  platform. We do not guarantee the accuracy of listings, the quality of properties, or 
                  the conduct of users. Buyers and tenants must independently verify property ownership, 
                  conduct title searches (e.g., via official registries), and comply with local laws.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  Househunter shall not be liable for any direct, indirect, incidental, special, or 
                  consequential damages arising from your use of the Service or any transactions 
                  conducted through the platform.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">7. Payment Terms</h2>
                <p className="text-muted-foreground">
                  Certain features of Househunter require payment. All payments are processed securely 
                  through our payment partners (M-Pesa, Flutterwave, Paystack). Subscription fees are 
                  non-refundable unless otherwise stated.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">8. Termination</h2>
                <p className="text-muted-foreground">
                  We reserve the right to suspend or terminate your account at any time for violations 
                  of these Terms of Service or for any other reason at our sole discretion.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">9. Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We may modify these Terms of Service at any time. We will notify you of significant 
                  changes by posting a notice on our website or sending you an email.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">10. Contact</h2>
                <p className="text-muted-foreground">
                  For questions about these Terms of Service, please contact us at{" "}
                  <a href="mailto:legal@househunter.co.ke" className="text-primary hover:underline">
                    legal@househunter.co.ke
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
