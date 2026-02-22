import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import SEO from "@/components/SEO";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy | Kenya Properties"
        description="Read the Kenya Properties privacy policy – how we collect, use, and protect your personal data in compliance with Kenyan data protection laws."
        canonical="/privacy"
        noindex={false}
      />
      <Navbar />

      <main className="pt-20">
        <div className="container mx-auto px-4 py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl font-bold mb-8">Privacy Policy</h1>
            
            <div className="prose prose-invert max-w-none space-y-6">
              <p className="text-muted-foreground">
                Last updated: January 2026
              </p>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">1. Information We Collect</h2>
                <p className="text-muted-foreground mb-4">
                  We collect information you provide directly to us, such as when you create an account, 
                  list a property, contact an agent, or communicate with us. This information may include:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Name, email address, and phone number</li>
                  <li>Profile information and photos</li>
                  <li>Property details and images</li>
                  <li>Messages and communications</li>
                  <li>Payment and transaction information</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Connect property seekers with property owners and agents</li>
                  <li>Process transactions and send related information</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments, questions, and requests</li>
                  <li>Detect, investigate, and prevent fraudulent transactions</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">3. Information Sharing</h2>
                <p className="text-muted-foreground mb-4">
                  We may share information about you as follows:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>With property agents when you express interest in a listing</li>
                  <li>With service providers who perform services on our behalf</li>
                  <li>In response to legal process or government requests</li>
                  <li>To protect our rights, privacy, safety, or property</li>
                  <li>With your consent or at your direction</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">4. Cookies & Advertising</h2>
                <p className="text-muted-foreground mb-4">
                  We use cookies and similar technologies to keep you signed in, remember preferences,
                  analyze traffic, and serve relevant ads. Some cookies are essential for the site to function.
                </p>
                <p className="text-muted-foreground mb-4">
                  We partner with Google AdSense to display ads. Google and its partners may use cookies
                  and device identifiers to personalize ads based on your visits to this and other sites.
                </p>
                <p className="text-muted-foreground">
                  You can learn more about Google's advertising practices and opt out of personalized ads at{" "}
                  <a
                    href="https://adssettings.google.com/"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    adssettings.google.com
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">5. Data Security</h2>
                <p className="text-muted-foreground">
                  We take reasonable measures to help protect information about you from loss, theft, 
                  misuse, unauthorized access, disclosure, alteration, and destruction. We use 
                  industry-standard encryption and security protocols to protect your data.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">6. Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Access, correct, or delete your personal information</li>
                  <li>Opt out of marketing communications</li>
                  <li>Request a copy of your data</li>
                  <li>Close your account at any time</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">7. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy, please contact us at{" "}
                  <a href="mailto:privacy@kenyaproperties.co.ke" className="text-primary hover:underline">
                    privacy@kenyaproperties.co.ke
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

export default Privacy;
