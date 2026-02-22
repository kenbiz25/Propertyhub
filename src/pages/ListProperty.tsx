import { Link, useNavigate } from "react-router-dom";
import { Home, CheckCircle, ArrowRight, Building2, Users, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebaseClient";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import SEO from "@/components/SEO";

const plans = [
  {
    name: "Free",
    price: 0,
    description: "Perfect for getting started",
    features: [
      "1 property listing",
      "Basic listing visibility",
      "Email support",
      "Masked contact details",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Plus",
    price: 1000,
    description: "For growing property managers",
    features: [
      "Up to 5 property listings",
      "Priority listing placement",
      "Direct contact display",
      "Priority chat support",
      "Basic analytics",
    ],
    cta: "Upgrade to Plus",
    popular: true,
  },
  {
    name: "Pro",
    price: 3500,
    description: "For professional agents",
    features: [
      "Up to 20 property listings",
      "Featured placement",
      "Promotional discounts",
      "Bulk image upload",
      "Advanced analytics",
      "Dedicated account manager",
    ],
    cta: "Go Pro",
    popular: false,
  },
];

const benefits = [
  {
    icon: Users,
    title: "Reach Millions",
    description: "Access Kenya's largest property-seeking audience with thousands of daily visitors.",
  },
  {
    icon: Shield,
    title: "Verified Badge",
    description: "Get verified to build trust and stand out from unverified listings.",
  },
  {
    icon: TrendingUp,
    title: "Promotion Tools",
    description: "Boost your listings to the top with our promotion features and featured placements.",
  },
  {
    icon: Building2,
    title: "Easy Management",
    description: "Intuitive dashboard to manage all your properties, inquiries, and analytics.",
  },
];

const ListProperty = () => {
  const navigate = useNavigate();

  const handleStartListing = () => {
    if (auth.currentUser) {
      navigate("/agent/list-property");
    } else {
      navigate("/auth?role=agent&from=/agent/list-property");
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="List Your Property for Free | Kenya Properties"
        description="List your house, apartment, land, or commercial property for free on Kenya's leading real estate platform. Reach thousands of verified buyers and renters across Kenya."
        canonical="/list-property"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "List Your Property for Free in Kenya",
          "description": "Free property listing for agents, landlords, and developers across Kenya.",
          "url": "https://kenyaproperties.co.ke/list-property",
        }}
      />
      <Navbar />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 hero-gradient opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">List Your Property</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Sell or Rent Your Property
                <span className="text-gradient"> Faster</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of property owners and agents who trust Kenya Properties 
                to connect them with qualified buyers and tenants across Kenya.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="hero" onClick={handleStartListing}>
                  Start Listing
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/about">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Why List With Us?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Everything you need to successfully market your property
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="glass-card rounded-2xl p-6 hover-lift">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Choose Your Plan
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Flexible pricing for every property owner and agent
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`glass-card rounded-2xl p-6 relative ${
                    plan.popular ? "border-primary ring-2 ring-primary/20" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                      Most Popular
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="font-display text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-display text-4xl font-bold">
                        {plan.price === 0 ? "Free" : `KES ${plan.price.toLocaleString()}`}
                      </span>
                      {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <Link to="/auth?role=agent&from=/agent/list-property">{plan.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-muted-foreground mb-8">
                Create your account today and start listing your properties in minutes.
              </p>
              <Button size="lg" variant="hero" onClick={handleStartListing}>
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ListProperty;
