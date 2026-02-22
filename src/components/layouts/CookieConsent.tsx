import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "kp_cookie_consent";

type ConsentValue = "accepted" | "rejected";

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ConsentValue | null;
    if (!saved) {
      setIsVisible(true);
    }
  }, []);

  const handleConsent = (value: ConsentValue) => {
    localStorage.setItem(STORAGE_KEY, value);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            We use cookies to improve site performance, personalize content, and serve relevant ads.
            You can learn more in our {" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => handleConsent("rejected")}>
              Decline
            </Button>
            <Button onClick={() => handleConsent("accepted")}>Accept</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
