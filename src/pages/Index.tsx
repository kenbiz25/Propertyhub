import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import Hero from "@/components/home/Hero";
import FeaturedListings from "@/components/home/FeaturedListings";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import PopularCities from "@/components/home/PopularCities";
import CallToAction from "@/components/home/CallToAction";
import PromotedListings from "@/components/home/PromotedListings";
import SEO from "@/components/SEO";

const homeSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Kenya Properties",
  "url": "https://kenyaproperties.co.ke/",
  "description": "Kenya's leading real estate marketplace for buying, selling, and renting houses, apartments, and land.",
  "areaServed": { "@type": "Country", "name": "Kenya" },
  "sameAs": ["https://x.com/Kenbiz25"],
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Kenya Properties | Houses, Apartments, Land & Plots for Sale & Rent in Kenya"
        description="Discover verified houses for sale & rent in Nairobi, apartments in Westlands/Kilimani, land & plots in Kiambu, Machakos, Ruiru. Free listings for agents & developers – Kenya's trusted real estate marketplace 2026!"
        canonical="/"
        schema={homeSchema}
      />
      <Navbar />
      <main>
        <Hero />
        <FeaturedListings />
        <PopularCities />
        <WhyChooseUs />
        <PromotedListings />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
