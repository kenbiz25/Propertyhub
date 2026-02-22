import { Shield, Clock, Users, Award, CheckCircle, Sparkles } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Verified Listings",
    description: "Every property is verified by our team to ensure authenticity and accurate information.",
  },
  {
    icon: Users,
    title: "Trusted Agents",
    description: "Connect with licensed, background-checked real estate professionals.",
  },
  {
    icon: Clock,
    title: "Fast Response",
    description: "Get quick responses from agents with our in-app messaging system.",
  },
  {
    icon: Award,
    title: "Best Prices",
    description: "Competitive pricing with no hidden fees. What you see is what you pay.",
  },
];

const WhyChooseUs = () => {
  return (
    <section className="py-20 bg-card relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-600/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Why Kenya Properties?</span>
            </div>
            
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
              We Make Finding Your
              <span className="block text-gradient">Dream Home Simple</span>
            </h2>
            
            <p className="text-muted-foreground text-lg mb-8">
              Kenya Properties connects you with verified properties and trusted agents across Kenya. 
              Our platform is designed to make your property search seamless, secure, and successful.
            </p>

            {/* Checklist */}
            <ul className="space-y-4">
              {[
                "Free property alerts tailored to your preferences",
                "Direct contact with property owners and agents",
                "Secure M-Pesa, Flutterwave & Paystack payments",
                "24/7 customer support",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right - Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="glass-card rounded-2xl p-6 hover-lift"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
