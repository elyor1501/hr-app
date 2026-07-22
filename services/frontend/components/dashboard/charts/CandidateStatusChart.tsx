"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Employee = {
  candidate_status?: string;
};

type EmployeeStatusChartProps = {
  employees?: Employee[];
  stats?: {
    active: number;
    inactive: number;
  };
};

export function EmployeeStatusChart({
  employees,
  stats,
}: EmployeeStatusChartProps) {
  let chartData;

  if (stats) {
    chartData = [
      { status: "Active", total: stats.active },
      { status: "Inactive", total: stats.inactive },
    ];
  } else if (employees) {
    const activeCount = employees.filter(
      (emp) => emp.candidate_status?.toLowerCase() === "active",
    ).length;
    const inactiveCount = employees.length - activeCount;

    chartData = [
      { status: "Active", total: activeCount },
      { status: "Inactive", total: inactiveCount },
    ];
  } else {
    return (
      <Card className="w-full h-[300px] sm:h-[350px] flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm sm:text-base">
          Loading charts...
        </p>
      </Card>
    );
  }

  const chartConfig = {
    total: {
      label: "Candidates",
      color: "#429ABD",
    },
  } satisfies ChartConfig;

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden border-border/50 shadow-sm">
      <CardHeader className="px-3 pt-3 pb-1 shrink-0">
        <CardTitle className="text-sm font-semibold">
         Candidate Pipeline
        </CardTitle>
        <CardDescription className="text-xs font-medium text-muted-foreground">
          Distribution of active vs inactive profiles
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-4 sm:gap-6 p-4">
        <ChartContainer
          config={chartConfig}
          className="h-[100px] sm:h-[150px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 5, right: 20, top: 0, bottom: 0 }}
            >
              <XAxis type="number" dataKey="total" allowDecimals={false} hide />
              <YAxis
                dataKey="status"
                type="category"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                fontSize={13}
                fontWeight={500}
                className="fill-foreground"
                width={70}
              />

              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                content={<ChartTooltipContent hideLabel />}
              />

              <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={28}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.status === "Active" ? "#429ABD" : "#F5A623"}
                  />
                ))}

                <LabelList
                  dataKey="total"
                  position="right"
                  style={{
                    fill: "#374151",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
