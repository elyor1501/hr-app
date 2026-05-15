"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
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
        <p className="text-muted-foreground animate-pulse text-sm sm:text-base">Loading charts...</p>
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
    <Card className="w-full overflow-hidden border-border/50 shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
          Candidate Pipeline
        </CardTitle>
        <CardDescription className="text-xs font-medium text-muted-foreground">
          Distribution of active vs inactive profiles
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2 sm:pt-4">
        <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
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
                fontSize={11}
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
                    fill={
                      entry.status === "Active"
                        ? "#429ABD" 
                        : "#F5A623" 
                    }
                    className="transition-all duration-300 hover:opacity-90"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4 border-t border-border/50 pt-3 sm:pt-4">
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active
            </p>
            <p className="text-xl sm:text-2xl font-bold" style={{ color: '#429ABD' }}>
              {stats?.active || 0}
            </p>
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Inactive
            </p>
            <p className="text-xl sm:text-2xl font-bold" style={{ color: '#F5A623' }}>
              {stats?.inactive || 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}