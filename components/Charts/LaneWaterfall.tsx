"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  LabelList,
} from "recharts";

export type LaneDelta = { lane: string; baseline: number; selected: number };

type WFRow = {
  name: string;
  value: number;
  cumulative: number;
  type: "start" | "increase" | "decrease" | "end";
};

export default function LaneWaterfall({
  lanes,
  topN = 15,
  currency = "$",
}: {
  lanes: LaneDelta[];
  topN?: number;
  currency?: string;
}) {
  const data: WFRow[] = useMemo(() => {
    const rows = lanes.map((l) => ({
      lane: l.lane,
      delta: (l.selected ?? 0) - (l.baseline ?? 0),
    }));
    // sort by absolute magnitude and take topN contributors
    rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const top = rows.slice(0, topN);

    const startTotal = lanes.reduce((s, l) => s + (l.baseline ?? 0), 0);
    const endTotal = lanes.reduce((s, l) => s + (l.selected ?? 0), 0);

    const wf: WFRow[] = [];
    let cum = startTotal;
    wf.push({ name: "Baseline Total", value: startTotal, cumulative: startTotal, type: "start" });

    for (const t of top) {
      const isIncrease = t.delta > 0;
      cum += t.delta;
      wf.push({
        name: t.lane,
        value: t.delta,
        cumulative: cum,
        type: isIncrease ? "increase" : "decrease",
      });
    }
    // lump the rest into "Other"
    const otherDelta =
      endTotal - startTotal - top.reduce((s, t) => s + t.delta, 0);
    if (Math.abs(otherDelta) > 1e-6) {
      cum += otherDelta;
      wf.push({
        name: "Other lanes",
        value: otherDelta,
        cumulative: cum,
        type: otherDelta > 0 ? "increase" : "decrease",
      });
    }
    wf.push({ name: "Selected Total", value: endTotal, cumulative: endTotal, type: "end" });
    return wf;
  }, [lanes, topN]);

  const fmt = (v: number) =>
    `${currency}${Math.round(v).toLocaleString()}`;

  // Waterfall styling: start/end as solid bars; deltas as positive/negative bars from zero
  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmt} />
        <Tooltip formatter={(v: any) => fmt(Number(v))} />
        {/* Start/End */}
        <Bar
          dataKey="cumulative"
          data={data.filter((d) => d.type === "start" || d.type === "end")}
          barSize={26}
          fill="#0F172A"
        >
          <LabelList dataKey="cumulative" position="top" formatter={(v: any) => fmt(Number(v))} />
        </Bar>
        {/* Increases (positive deltas) */}
        <Bar
          dataKey="value"
          data={data.filter((d) => d.type === "increase")}
          barSize={22}
          fill="#16A34A"
        >
          <LabelList dataKey="value" position="top" formatter={(v: any) => `+${fmt(Number(v))}`} />
        </Bar>
        {/* Decreases (negative deltas) */}
        <Bar
          dataKey="value"
          data={data.filter((d) => d.type === "decrease")}
          barSize={22}
          fill="#DC2626"
        >
          <LabelList dataKey="value" position="bottom" formatter={(v: any) => fmt(Number(v))} />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
