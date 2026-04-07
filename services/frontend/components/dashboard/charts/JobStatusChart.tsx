"use client"

import {
  Label,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

type JobStatusChartProps = {
  stats: {
    open_jobs: number;
    closed_jobs: number;
  };
  totalJobs: number;
}

export function JobStatusChart({ stats, totalJobs }: JobStatusChartProps) {
  const chartData = [
    { name: "Open", value: stats.open_jobs, fill: "hsl(var(--chart-1))" },
    { name: "Closed", value: stats.closed_jobs, fill: "hsl(var(--chart-2))" },
  ]

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Jobs Overview</CardTitle>
        <CardDescription>Real-time status of job postings</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex justify-center">
          <RadialBarChart
            width={200}
            height={200}
            data={chartData}
            innerRadius={60}
            outerRadius={90}
            endAngle={180}
            startAngle={0}
          >
            <PolarRadiusAxis tick={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 10}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalJobs}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 15}
                          className="fill-muted-foreground text-xs font-medium"
                        >
                          Total Jobs
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
            <RadialBar dataKey="value" background cornerRadius={10} />
          </RadialBarChart>
        </div>

        <div className="flex flex-col gap-4 w-full sm:w-48">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-muted-foreground">Open Jobs</span>
              <span className="font-bold">{stats.open_jobs}</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{
                  width: totalJobs ? `${(stats.open_jobs / totalJobs) * 100}%` : "0%",
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-muted-foreground">Closed Jobs</span>
              <span className="font-bold">{stats.closed_jobs}</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className="bg-chart-2 h-2 rounded-full transition-all duration-500"
                style={{
                  width: totalJobs ? `${(stats.closed_jobs / totalJobs) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}