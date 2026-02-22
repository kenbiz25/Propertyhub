export type BoostDurationKey = "day" | "week" | "2weeks" | "month";
export type BoostSlotKey = "premium" | "standard";

export const BOOST_DURATION_OPTIONS: Array<{
  key: BoostDurationKey;
  label: string;
  days: number;
}> = [
  { key: "day", label: "1 Day", days: 1 },
  { key: "week", label: "7 Days", days: 7 },
  { key: "2weeks", label: "14 Days", days: 14 },
  { key: "month", label: "30 Days", days: 30 },
];

export const BOOST_SLOTS: Array<{
  key: BoostSlotKey;
  label: string;
  description: string;
  maxSlots: number;
  prices: Record<BoostDurationKey, number>;
}> = [
  {
    key: "premium",
    label: "Premium Spotlight",
    description: "Top promoted slot – maximum visibility right under the hero section.",
    maxSlots: 1,
    prices: {
      day: 500,
      week: 2500,
      "2weeks": 4000,
      month: 7000,
    },
  },
  {
    key: "standard",
    label: "Standard Boost",
    description: "Two promoted slots in the homepage Sponsored section.",
    maxSlots: 2,
    prices: {
      day: 200,
      week: 1000,
      "2weeks": 1800,
      month: 3000,
    },
  },
];

export const BOOST_PAYMENT = {
  provider: "M-Pesa",
  mobileNumber: "254705091683",
  displayNumber: "0705091683",
  accountLabel: "Kenya Properties Boost",
  instructions:
    "Send M-Pesa to 0705091683 (Account: Kenya Properties Boost), then paste your confirmation code below.",
};

export function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}
