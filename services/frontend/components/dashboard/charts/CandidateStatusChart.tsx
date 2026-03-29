"use client"

import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts"

import {
  Card,
  CardContent,
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
    return <div>Loading chart...</div>;
  }

  const chartConfig = {
    total: {
      label: "Candidates",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidate Status</CardTitle>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 0 }}
          >
            <XAxis type="number" dataKey="total" allowDecimals={false} />
            <YAxis
              dataKey="status"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />

            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />

            <Bar dataKey="total" radius={6}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.status === "Active"
                      ? "#4285F4"
                      : "#2c7397"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}