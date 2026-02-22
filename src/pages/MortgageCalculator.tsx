import { useMemo, useState } from "react";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calculator, Info } from "lucide-react";
import SEO from "@/components/SEO";

const formatKes = (value: number) => {
  if (!Number.isFinite(value)) return "KES 0";
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
};

export default function MortgageCalculator() {
  const [price, setPrice] = useState("8500000");
  const [downPayment, setDownPayment] = useState("850000");
  const [rate, setRate] = useState("13.5");
  const [years, setYears] = useState("20");
  const [annualTax, setAnnualTax] = useState("0");
  const [insurance, setInsurance] = useState("0");

  const result = useMemo(() => {
    const homePrice = Number(price) || 0;
    const down = Number(downPayment) || 0;
    const loanAmount = Math.max(homePrice - down, 0);
    const annualRate = Number(rate) || 0;
    const termYears = Number(years) || 0;
    const n = termYears * 12;
    const monthlyRate = annualRate > 0 ? annualRate / 100 / 12 : 0;

    let principalAndInterest = 0;
    if (n > 0) {
      if (monthlyRate > 0) {
        const factor = Math.pow(1 + monthlyRate, n);
        principalAndInterest = loanAmount * (monthlyRate * factor) / (factor - 1);
      } else {
        principalAndInterest = loanAmount / n;
      }
    }

    const monthlyTax = (Number(annualTax) || 0) / 12;
    const monthlyInsurance = Number(insurance) || 0;
    const totalMonthly = principalAndInterest + monthlyTax + monthlyInsurance;

    return {
      loanAmount,
      principalAndInterest,
      monthlyTax,
      monthlyInsurance,
      totalMonthly,
    };
  }, [price, downPayment, rate, years, annualTax, insurance]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Kenya Mortgage Calculator | Estimate Your Home Loan Repayments"
        description="Calculate your monthly mortgage repayments for Kenyan home loans. Estimate principal, interest, property tax, and insurance costs for any property price in KES."
        canonical="/mortgage-calculator"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Kenya Mortgage Calculator",
          "description": "Free mortgage calculator for Kenya home loans – compute monthly repayments, total interest, and loan breakdown in KES.",
          "url": "https://kenyaproperties.co.ke/mortgage-calculator",
          "applicationCategory": "FinanceApplication",
          "operatingSystem": "Any",
        }}
      />
      <Navbar />
      <main className="pt-20">
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calculator className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-display text-3xl md:text-4xl font-bold">Mortgage Calculator</h1>
                <p className="text-muted-foreground">
                  Estimate monthly payments for your next home.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="price">Home price (KES)</Label>
                    <Input
                      id="price"
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="8,500,000"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="down">Down payment (KES)</Label>
                    <Input
                      id="down"
                      inputMode="numeric"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      placeholder="850,000"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rate">Interest rate (%)</Label>
                    <Input
                      id="rate"
                      inputMode="decimal"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="13.5"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="years">Loan term (years)</Label>
                    <Input
                      id="years"
                      inputMode="numeric"
                      value={years}
                      onChange={(e) => setYears(e.target.value)}
                      placeholder="20"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax">Annual property tax (KES)</Label>
                    <Input
                      id="tax"
                      inputMode="numeric"
                      value={annualTax}
                      onChange={(e) => setAnnualTax(e.target.value)}
                      placeholder="0"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="insurance">Monthly insurance (KES)</Label>
                    <Input
                      id="insurance"
                      inputMode="numeric"
                      value={insurance}
                      onChange={(e) => setInsurance(e.target.value)}
                      placeholder="0"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  This estimate assumes a fixed rate and does not include closing costs.
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h2 className="font-display text-xl font-semibold mb-4">Estimated Payment</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Loan amount</p>
                    <p className="text-lg font-semibold">{formatKes(result.loanAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Principal & interest</p>
                    <p className="text-lg font-semibold">{formatKes(result.principalAndInterest)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Property tax (monthly)</p>
                    <p className="text-lg font-semibold">{formatKes(result.monthlyTax)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Insurance (monthly)</p>
                    <p className="text-lg font-semibold">{formatKes(result.monthlyInsurance)}</p>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">Total monthly payment</p>
                    <p className="text-2xl font-bold text-primary">{formatKes(result.totalMonthly)}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button asChild className="w-full">
                    <Link to="/listings">Browse properties</Link>
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
}
