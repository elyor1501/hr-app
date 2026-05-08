"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type JobStatusChartProps = {
  stats: {
    open_requests: number;
    in_progress_requests: number;
    signed_requests: number;
    closed_requests: number;
  };
};

export function JobStatusChart({ stats }: JobStatusChartProps) {
  const totalJobs =
    (stats.open_requests || 0) +
    (stats.in_progress_requests || 0) +
    (stats.signed_requests || 0) +
    (stats.closed_requests || 0);

  const chartData = [
    {
      name: "Open",
      value: stats.open_requests,
      color: "#2563EB",
    },
    {
      name: "In Progress",
      value: stats.in_progress_requests,
      color: "#5c8cf5",
    },
    {
      name: "Signed",
      value: stats.signed_requests,
      color: "#60A5FA",
    },
    {
      name: "Closed",
      value: stats.closed_requests,
      color: "#BFDBFE",
    },
  ];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">Request Jobs Overview</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Real-time status of request postings</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6">
        <div className="relative flex items-center justify-center">
          <PieChart width={180} height={180}>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              position={{ x: 160, y: 10 }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                fontSize: "11px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
          </PieChart>

          <div className="absolute text-center">
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalJobs}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 w-full sm:w-52">
          {chartData.map((item) => (
            <div key={item.name} className="space-y-1 sm:space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="font-medium text-muted-foreground">
                  {item.name}
                </span>
                <span className="font-bold">{item.value}</span>
              </div>

              <div className="w-full bg-secondary h-1.5 sm:h-2 rounded-full overflow-hidden">
                <div
                  className="h-1.5 sm:h-2 rounded-full transition-all duration-500"
                  style={{
                    width: totalJobs
                      ? `${(item.value / totalJobs) * 100}%`
                      : "0%",
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}