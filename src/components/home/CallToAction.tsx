import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CallToAction = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-orange-600/10" />
      
      {/* Decorative circles */}
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="glass-card rounded-3xl p-8 md:p-12 lg:p-16 text-center max-w-4xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center mx-auto mb-8 glow-orange">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Ready to List Your
            <span className="block text-gradient">Property?</span>
          </h2>
          
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Join thousands of property owners and agents who trust Househunter 
            to connect them with serious buyers and tenants.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <Link to="/list-property">
                List Your Property
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="glass" size="xl" asChild>
              <Link to="/pricing">
                View Pricing Plans
              </Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Start with our free plan. Upgrade anytime for more features.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
