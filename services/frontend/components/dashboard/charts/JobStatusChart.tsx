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
      color: "#429ABD",
    },
    {
      name: "In Progress",
      value: stats.in_progress_requests,
      color: "#5ba3c4",
    },
    {
      name: "Signed",
      value: stats.signed_requests,
      color: "#F5A623",
    },
    {
      name: "Closed",
      value: stats.closed_requests,
      color: "#f7b952",
    },
  ];

  return (
    <Card className="w-full overflow-hidden border-border/50 shadow-sm h-full">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-sm font-semibold">
          Request Jobs Overview
        </CardTitle>
        <CardDescription className="text-xs font-medium text-muted-foreground">
          Real-time status of request postings
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 ">
        <div className="relative flex items-center justify-center">
          <PieChart width={150} height={150}>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{
                pointerEvents: "none",
                zIndex: 9999,
              }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
              itemStyle={{
                color: "hsl(var(--foreground))",
              }}
              cursor={{ fill: "transparent" }}
              offset={25}
            />
          </PieChart>

          <div className="absolute text-center pointer-events-none z-0">
            <p className="text-xl sm:text-2xl font-bold">{totalJobs}</p>
            <p className="text-xs font-medium text-muted-foreground">
              Total
              <br />
              Requests
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-44">
          {chartData.map((item) => (
            <div key={item.name} className="space-y-1 sm:space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-xs font-medium text-muted-foreground">
                  {item.name}
                </span>
                <span className="font-bold">{item.value}</span>
              </div>

              <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                <div
                  className="h-1 rounded-full transition-all duration-500"
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
