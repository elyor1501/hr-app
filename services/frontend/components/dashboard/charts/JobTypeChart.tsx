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
      { type: "Full Time", count: stats.full_time, fill: "#429ABD" },
      { type: "Part Time", count: stats.part_time, fill: "#5ba3c4" },
      { type: "Contract", count: stats.contract, fill: "#F5A623" },
      { type: "Internship", count: stats.internship, fill: "#f7b952" },
      { type: "Entry Level", count: stats.entry_level, fill: "#429ABD" },
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
        case "Full Time": return "#429ABD";
        case "Part Time": return "#5ba3c4";
        case "Contract": return "#F5A623";
        case "Internship": return "#f7b952";
        case "Entry Level": return "#429ABD";
        default: return "#429ABD";
      }
    };

    chartData = Object.keys(counts).map((type) => ({
      type,
      count: counts[type],
      fill: getColor(type),
    }));
  } else {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">Loading chart...</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    count: { label: "Jobs" },
  } satisfies ChartConfig;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">Job Type Distribution</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Breakdown by employment type</CardDescription>
      </CardHeader>

      <CardContent className="pt-2 sm:pt-4">
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            >
              <XAxis
                dataKey="type"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={10}
                className="fill-muted-foreground"
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis
                type="number"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, "auto"]}
                tickCount={5}
                fontSize={10}
                className="fill-muted-foreground"
                width={30}
              />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={35}>
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