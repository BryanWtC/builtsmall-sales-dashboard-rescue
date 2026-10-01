"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { money } from "@/lib/analyze";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip);

const NAVY = "#111f75";
const YELLOW = "#e5e138";

// Shared look for both charts. Tooltip and axis labels are shown as dollars.
const dollars = (n: number | null | undefined) => money(Math.round((n ?? 0) * 100));

const barOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => ` ${dollars(item.parsed.y)}` } } },
  scales: { y: { beginAtZero: true, ticks: { callback: (v) => money(Number(v) * 100, true) } }, x: { grid: { display: false } } },
};

const lineOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => ` ${dollars(item.parsed.y)}` } } },
  scales: { y: { beginAtZero: true, ticks: { callback: (v) => money(Number(v) * 100, true) } }, x: { grid: { display: false } } },
};

type Point = { label: string; cents: number };

export function CategoryChart({ data }: { data: Point[] }) {
  return (
    <div className="chart" role="img" aria-label={`Bar chart of sales by category. ${data.map((d) => `${d.label} ${money(d.cents)}`).join(", ")}`}>
      <Bar
        options={barOptions}
        data={{
          labels: data.map((d) => d.label),
          datasets: [{ data: data.map((d) => d.cents / 100), backgroundColor: NAVY, borderRadius: 4 }],
        }}
      />
    </div>
  );
}

export function MonthChart({ data }: { data: Point[] }) {
  return (
    <div className="chart" role="img" aria-label={`Line chart of sales by month. ${data.map((d) => `${d.label} ${money(d.cents)}`).join(", ")}`}>
      <Line
        options={lineOptions}
        data={{
          labels: data.map((d) => d.label),
          datasets: [
            {
              data: data.map((d) => d.cents / 100),
              borderColor: NAVY,
              backgroundColor: "rgba(17, 31, 117, 0.08)",
              pointBackgroundColor: YELLOW,
              pointBorderColor: NAVY,
              pointRadius: 5,
              tension: 0.25,
              fill: true,
            },
          ],
        }}
      />
    </div>
  );
}
