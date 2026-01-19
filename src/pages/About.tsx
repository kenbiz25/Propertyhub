import { Home, Users, Shield, Award, Target, Heart, MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";

const stats = [
  { value: "10K+", label: "Properties Listed" },
  { value: "5K+", label: "Happy Customers" },
  { value: "500+", label: "Verified Agents" },
  { value: "47", label: "Counties Covered" },
];

const values = [
  {
    icon: Shield,
    title: "Trust & Transparency",
    description: "Every listing is verified. We ensure property ownership and documentation checks before publishing.",
  },
  {
    icon: Heart,
    title: "Customer First",
    description: "Your dream home journey matters to us. Our support team is available around the clock to help you.",
  },
  {
    icon: Target,
    title: "Local Expertise",
    description: "Deep knowledge of Kenyan and African real estate markets, from Nairobi to Mombasa and beyond.",
  },
  {
    icon: Award,
    title: "Quality Assurance",
    description: "We partner only with licensed agents and verified property managers to maintain high standards.",
  },
];

const team = [
  {
    name: "Amara Okafor",
    role: "CEO & Founder",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
  },
  {
    name: "James Mwangi",
    role: "Head of Operations",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
  },
  {
    name: "Sarah Kimani",
    role: "Lead Property Specialist",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400",
  },
  {
    name: "David Otieno",
    role: "Technology Director",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 hero-gradient opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Home className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">About Househunter</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Making Property Dreams
                <span className="text-gradient"> Reality in Africa</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Founded in 2023, Househunter is Kenya's leading real estate marketplace, 
                connecting millions of property seekers with verified listings across the continent.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="font-display text-4xl md:text-5xl font-bold text-gradient mb-2">
                    {stat.value}
                  </p>
                  <p className="text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                  Our Mission
                </h2>
                <p className="text-muted-foreground mb-4">
                  We believe everyone deserves a place to call home. Househunter was built to 
                  simplify the property search process in Africa, where fragmented markets and 
                  lack of transparency have long been barriers for property seekers.
                </p>
                <p className="text-muted-foreground mb-6">
                  Through technology and local expertise, we're creating a seamless experience 
                  that connects buyers, renters, and tenants with verified properties and 
                  trusted agents across Kenya and beyond.
                </p>
                <Button asChild>
                  <Link to="/listings">
                    Explore Properties
                  </Link>
                </Button>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-3xl overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"
                    alt="Modern African home"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-2xl bg-primary/20 backdrop-blur-xl border border-primary/30" />
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-2xl bg-accent/20 backdrop-blur-xl border border-accent/30" />
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Our Core Values
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These principles guide everything we do at Househunter
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="glass-card rounded-2xl p-6 hover-lift"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Meet Our Team
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Passionate professionals dedicated to transforming African real estate
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member, index) => (
                <div
                  key={index}
                  className="glass-card rounded-2xl overflow-hidden hover-lift group"
                >
                  <div className="aspect-[3/4] relative">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                  </div>
                  <div className="p-4 -mt-16 relative z-10">
                    <h3 className="font-display font-semibold text-lg">
                      {member.name}
                    </h3>
                    <p className="text-primary text-sm">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-20 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto glass-card rounded-3xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                    Get in Touch
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Have questions? Our team is here to help you find your perfect property.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">Westlands, Nairobi, Kenya</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">+254 700 000 000</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">hello@househunter.co.ke</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <Button asChild size="lg" className="w-full md:w-auto">
                    <Link to="/auth">
                      Join Househunter Today
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
