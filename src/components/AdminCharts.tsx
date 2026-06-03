"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";

interface AdminChartsProps {
  categoryData: { name: string; value: number }[];
  salesTrendData: { date: string; amount: number; orders: number }[];
}

export default function AdminCharts({ categoryData, salesTrendData }: AdminChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Category Revenue Bar Chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-lg font-bold text-white">Revenue by Category</h3>
        <div className="h-80 w-full">
          {categoryData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500 text-sm">
              No sales data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                  formatter={(val) => [`₹${val}`, "Revenue"]}
                />
                <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Sales Trend Area Chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-lg font-bold text-white">7-Day Sales & Order Trends</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                }}
                formatter={(value: any, name?: any) => {
                  if (name === "amount") return [`₹${value}`, "Sales"];
                  return [value, "Orders Count"];
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area
                name="amount"
                type="monotone"
                dataKey="amount"
                stroke="#0d9488"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
