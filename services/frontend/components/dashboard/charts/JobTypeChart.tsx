"use client";

import { Bar, BarChart, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Job = {
  employment_type?: string;
};

type JobTypeChartProps = {
  jobs?: Job[];
  stats?: {
    full_time: number;
    part_time: number;
    contract: number;
    internship: number;
    entry_level: number;
  };
};

export function JobTypeChart({ jobs, stats }: JobTypeChartProps) {
  let chartData;

  if (stats) {
    chartData = [
      { type: "Full Time", count: stats.full_time, fill: "hsl(var(--chart-1))" },
      { type: "Part Time", count: stats.part_time, fill: "hsl(var(--chart-2))" },
      { type: "Contract", count: stats.contract, fill: "hsl(var(--chart-3))" },
      { type: "Internship", count: stats.internship, fill: "hsl(var(--chart-4))" },
      { type: "Entry Level", count: stats.entry_level, fill: "hsl(var(--chart-5))" },
    ];
  } else if (jobs) {
    // ... logic for jobs array remains similar but with theme colors
    const counts: Record<string, number> = {
      "Full Time": 0,
      "Part Time": 0,
      Contract: 0,
      Internship: 0,
      "Entry Level": 0,
    };

    jobs.forEach((job) => {
      const rawType = job.employment_type?.toLowerCase() || "";
      if (rawType.includes("full")) counts["Full Time"]++;
      else if (rawType.includes("part")) counts["Part Time"]++;
      else if (rawType.includes("contract")) counts["Contract"]++;
      else if (rawType.includes("intern")) counts["Internship"]++;
      else if (rawType.includes("entry")) counts["Entry Level"]++;
      else counts["Full Time"]++;
    });

    const getHslColor = (type: string) => {
      switch (type) {
        case "Full Time": return "hsl(var(--chart-1))";
        case "Part Time": return "hsl(var(--chart-2))";
        case "Contract": return "hsl(var(--chart-3))";
        case "Internship": return "hsl(var(--chart-4))";
        case "Entry Level": return "hsl(var(--chart-5))";
        default: return "hsl(var(--chart-1))";
      }
    };

    chartData = Object.keys(counts).map((type) => ({
      type,
      count: counts[type],
      fill: getHslColor(type),
    }));
  } else {
    return <div>Loading chart...</div>;
  }

  const chartConfig = {
    count: { label: "Jobs" },
  } satisfies ChartConfig;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Job Type Distribution</CardTitle>
        <CardDescription>Breakdown by employment type</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
            >
              <XAxis
                dataKey="type"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                fontSize={12}
                className="fill-muted-foreground"
              />
              <YAxis
                type="number"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, "auto"]}
                tickCount={6}
                fontSize={12}
                className="fill-muted-foreground"
              />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}