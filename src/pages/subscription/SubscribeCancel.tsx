
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function SubscribeCancel() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-xl mx-auto glass-card rounded-2xl p-6 text-center">
          <h1 className="font-display text-2xl font-bold mb-3">Payment canceled</h1>
          <p className="text-muted-foreground mb-6">
            Your subscription wasn’t completed. You can retry anytime.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild variant="outline"><Link to="/list-property">Back to Pricing</Link></Button>
            <Button asChild><Link to="/subscription/billing">Go to Billing</Link></Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
