import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Star, Building2, Phone, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";

const mockAgents = [
  {
    id: "1",
    name: "Grace Wanjiku",
    title: "Senior Property Consultant",
    company: "Househunter Realty",
    location: "Nairobi",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
    listings: 24,
    rating: 4.9,
    reviews: 48,
    verified: true,
    specialties: ["Luxury Homes", "Commercial"],
  },
  {
    id: "2",
    name: "James Mwangi",
    title: "Property Manager",
    company: "Prime Properties Kenya",
    location: "Nairobi",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
    listings: 18,
    rating: 4.7,
    reviews: 32,
    verified: true,
    specialties: ["Apartments", "Rentals"],
  },
  {
    id: "3",
    name: "Sarah Kimani",
    title: "Real Estate Agent",
    company: "Coastal Homes",
    location: "Mombasa",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400",
    listings: 15,
    rating: 4.8,
    reviews: 28,
    verified: true,
    specialties: ["Beachfront", "Vacation Homes"],
  },
  {
    id: "4",
    name: "David Otieno",
    title: "Commercial Specialist",
    company: "Urban Spaces",
    location: "Kisumu",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    listings: 12,
    rating: 4.6,
    reviews: 19,
    verified: false,
    specialties: ["Commercial", "Industrial"],
  },
  {
    id: "5",
    name: "Mary Akinyi",
    title: "Property Consultant",
    company: "Rift Valley Estates",
    location: "Nakuru",
    image: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400",
    listings: 20,
    rating: 4.9,
    reviews: 42,
    verified: true,
    specialties: ["Land", "Farms"],
  },
  {
    id: "6",
    name: "Peter Kamau",
    title: "Senior Agent",
    company: "Highland Properties",
    location: "Eldoret",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    listings: 16,
    rating: 4.5,
    reviews: 22,
    verified: true,
    specialties: ["Residential", "Land"],
  },
];

const Agents = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");

  const filteredAgents = mockAgents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "all" || agent.location.toLowerCase() === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        {/* Header */}
        <section className="bg-card border-b border-border py-8">
          <div className="container mx-auto px-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Find an Agent
            </h1>
            <p className="text-muted-foreground">
              Connect with verified property professionals across Kenya
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-lg border-b border-border py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or company..."
                  className="pl-10 bg-card"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {["all", "nairobi", "mombasa", "kisumu", "nakuru", "eldoret"].map((city) => (
                  <Button
                    key={city}
                    variant={selectedCity === city ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCity(city)}
                  >
                    {city === "all" ? "All Cities" : city.charAt(0).toUpperCase() + city.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Agents Grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">
                {filteredAgents.length} agents found
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <div key={agent.id} className="glass-card rounded-2xl overflow-hidden hover-lift">
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative">
                        <img
                          src={agent.image}
                          alt={agent.name}
                          className="w-20 h-20 rounded-xl object-cover"
                        />
                        {agent.verified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-semibold text-lg">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.title}</p>
                        <p className="text-sm text-primary">{agent.company}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {agent.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {agent.listings} listings
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{agent.rating}</span>
                      </div>
                      <span className="text-muted-foreground">({agent.reviews} reviews)</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {agent.specialties.map((specialty, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs bg-muted rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </Button>
                      <Button size="sm" className="flex-1">
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredAgents.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">
                  No agents found matching your criteria.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCity("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Are You a Property Agent?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join our network of verified professionals and reach thousands of property seekers.
            </p>
            <Button asChild size="lg">
              <Link to="/list-property">Join as an Agent</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Agents;
