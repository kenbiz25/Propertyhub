
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComponentType } from "react";

type StatsCardProps = {
  title: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
};

export default function StatsCard({ title, value, icon: Icon, change, changeType }: StatsCardProps) {
  const changeColor =
    changeType === "positive"
      ? "text-green-500"
      : changeType === "negative"
      ? "text-red-500"
      : "text-gray-400";

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 shadow-lg rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
        {Icon ? (
          <div className="p-2 rounded-full bg-orange-600">
            <Icon className="h-4 w-4 text-white" aria-hidden />
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {change && <p className={`text-xs mt-1 ${changeColor}`}>{change}</p>}
      </CardContent>
    </Card>
  );
}