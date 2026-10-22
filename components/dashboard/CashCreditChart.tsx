"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatINR } from "@/lib/utils";

export default function CashCreditChart({
  cash,
  credit,
}: {
  cash: number;
  credit: number;
}) {
  const total = cash + credit;
  const data = [
    { name: "Cash sales", value: cash, color: "#3E8240" },
    { name: "Credit sales (Udhaar)", value: credit, color: "#C98A1F" },
  ];

  return (
    <div className="flex items-center gap-6">
      <div className="h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={38}
              outerRadius={58}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatINR(value)}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E6E2D8",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm text-ink-muted">{d.name}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-ink">{formatINR(d.value)}</p>
              <p className="text-xs text-ink-faint">
                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
