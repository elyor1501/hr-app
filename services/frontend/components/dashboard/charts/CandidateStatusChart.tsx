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
  employees: Employee[]
}

export function EmployeeStatusChart({ employees }: EmployeeStatusChartProps) {

  const activeCount = employees.filter(
    emp => emp.candidate_status?.toLowerCase() === "active"
  ).length

  const inactiveCount = employees.length - activeCount

  const totalEmployees = employees.length

  const chartData = [
    { status: "Active", total: activeCount },
    { status: "Inactive", total: inactiveCount },
  ]

  const chartConfig = {
    total: {
      label: "Employees",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  if (!employees) return <div>Loading chart...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees Status</CardTitle>
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