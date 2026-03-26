"use client";

import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      { type: "Full Time", count: stats.full_time, fill: "#6366F1" },
      { type: "Part Time", count: stats.part_time, fill: "#2c7397" },
      { type: "Contract", count: stats.contract, fill: "#F97316" },
      { type: "Internship", count: stats.internship, fill: "#0EA5E9" },
      { type: "Entry Level", count: stats.entry_level, fill: "#10B981" },
    ];
  } else if (jobs) {
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

    const getColor = (type: string) => {
      switch (type) {
        case "Full Time": return "#6366F1";
        case "Part Time": return "#2c7397";
        case "Contract": return "#F97316";
        case "Internship": return "#0EA5E9";
        case "Entry Level": return "#10B981";
        default: return "#6366F1";
      }
    };

    chartData = Object.keys(counts).map((type) => ({
      type,
      count: counts[type],
      fill: getColor(type),
    }));
  } else {
    return <div>Loading chart...</div>;
  }

  const chartConfig = {
    count: { label: "Jobs" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Type Distribution</CardTitle>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="type"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis
              type="number"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, "auto"]}
              tickCount={6}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}