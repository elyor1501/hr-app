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
    { name: "Open", value: stats.open_jobs, fill: "#4285F4" },
    { name: "Closed", value: stats.closed_jobs, fill: "#2c7397" },
  ]

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Jobs Overview</CardTitle>
        <CardDescription>Open vs Closed Jobs</CardDescription>
      </CardHeader>

      <CardContent className="flex items-center justify-between">
        <RadialBarChart
          width={250}
          height={250}
          data={chartData}
          innerRadius={80}
          outerRadius={130}
          endAngle={180}
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
                        className="fill-foreground text-2xl font-bold"
                      >
                        {totalJobs}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 10}
                        className="fill-muted-foreground"
                      >
                        Total Jobs
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </PolarRadiusAxis>
          <RadialBar dataKey="value" background cornerRadius={6} />
        </RadialBarChart>

        <div className="flex flex-col gap-4 ml-6 w-40">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Open Jobs</span>
              <span>{stats.open_jobs}</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded">
              <div
                className="bg-[#4285F4] h-2 rounded"
                style={{
                  width: totalJobs ? `${(stats.open_jobs / totalJobs) * 100}%` : "0%",
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Closed Jobs</span>
              <span>{stats.closed_jobs}</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded">
              <div
                className="bg-[#2c7397] h-2 rounded"
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