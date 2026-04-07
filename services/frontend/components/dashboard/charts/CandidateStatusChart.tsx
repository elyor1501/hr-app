"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type Employee = {
  candidate_status?: string
}

type EmployeeStatusChartProps = {
  employees?: Employee[];
  stats?: {
    active: number;
    inactive: number;
  };
}

export function EmployeeStatusChart({ employees, stats }: EmployeeStatusChartProps) {
  let chartData;

  if (stats) {
    chartData = [
      { status: "Active", total: stats.active },
      { status: "Inactive", total: stats.inactive },
    ];
  } else if (employees) {
    const activeCount = employees.filter(
      emp => emp.candidate_status?.toLowerCase() === "active"
    ).length;
    const inactiveCount = employees.length - activeCount;

    chartData = [
      { status: "Active", total: activeCount },
      { status: "Inactive", total: inactiveCount },
    ];
  } else {
    return (
      <Card className="w-full h-[350px] flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading charts...</p>
      </Card>
    );
  }

  const chartConfig = {
    total: {
      label: "Candidates",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  return (
    <Card className="w-full overflow-hidden border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold tracking-tight text-foreground">
          Candidate Pipeline
        </CardTitle>
        <CardDescription className="text-xs font-medium text-muted-foreground">
          Distribution of active vs inactive profiles
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
            >
              <XAxis type="number" dataKey="total" allowDecimals={false} hide />
              <YAxis
                dataKey="status"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                fontSize={12}
                fontWeight={500}
                className="fill-foreground"
                width={80}
              />

              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                content={<ChartTooltipContent hideLabel />}
              />

              <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={32}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.status === "Active"
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground)/0.3)"
                    }
                    className="transition-all duration-500 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
          <div className="space-y-1">
             <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</p>
             <p className="text-2xl font-bold text-primary">{stats?.active || 0}</p>
          </div>
          <div className="space-y-1">
             <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inactive</p>
             <p className="text-2xl font-bold text-foreground/70">{stats?.inactive || 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
