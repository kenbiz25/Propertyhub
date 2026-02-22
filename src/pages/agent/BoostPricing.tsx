import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { BOOST_DURATION_OPTIONS, BOOST_PAYMENT, BOOST_SLOTS, formatKes } from "@/lib/constants/boosting";
import { CheckCircle2, PhoneCall } from "lucide-react";
import { Link } from "react-router-dom";

export default function BoostPricing() {
  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Boost Pricing"
        description="Choose a promoted slot and duration. Pay via mobile money and submit confirmation for activation."
      />

      <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Pay via {BOOST_PAYMENT.provider}</div>
          <div className="text-lg font-semibold text-white flex items-center gap-2 mt-1">
            <PhoneCall className="w-4 h-4 text-primary" />
            {BOOST_PAYMENT.mobileNumber}
          </div>
          <div className="text-sm text-muted-foreground mt-1">Account: {BOOST_PAYMENT.accountLabel}</div>
        </div>
        <div className="text-sm text-muted-foreground max-w-xl">
          {BOOST_PAYMENT.instructions}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {BOOST_SLOTS.map((slot) => (
          <div key={slot.key} className="glass-card rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-white">{slot.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{slot.description}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                {slot.maxSlots} slot{slot.maxSlots > 1 ? "s" : ""}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {BOOST_DURATION_OPTIONS.map((duration) => (
                <div
                  key={duration.key}
                  className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
                >
                  <div className="text-sm text-white">{duration.label}</div>
                  <div className="font-semibold text-primary">
                    {formatKes(slot.prices[duration.key])}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              {[
                "Priority placement on homepage promoted slots",
                "Boosted visibility for the duration selected",
                "Admin activates after payment confirmation",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/agent/properties">Boost a Listing</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/agent/promotions">View Requests</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
