"use client";
import React from "react";

type TLProps = {
  title?: string;
  result: any; // expects shape from optimizeTransportRollingLease or Fixed (will normalize)
};

export default function ResultsTimeline({ title = "Timeline", result }: TLProps) {
  const perYear = result?.perYear ?? [];
  const openByYear: Record<number, string[]> =
    result?.openByYear ??
    Object.fromEntries(
      perYear.map((y: any) => [
        y.year,
        y.transport?.open_facilities ?? y.open_facilities ?? [],
      ])
    );

  const years = Object.keys(openByYear)
    .map((n) => Number(n))
    .sort((a, b) => a - b);

  const facilities = Array.from(
    new Set(years.flatMap((y) => openByYear[y]))
  ).sort();

  const capByFY: Record<string, Record<number, number>> = {};
  perYear.forEach((yr: any) => {
    const list = (yr.transport?.facility_metrics ?? yr.facility_metrics) || [];
    list.forEach((m: any) => {
      const f = m.Facility;
      const cap = m.Capacity ?? m.Total_Capacity ?? null;
      if (f == null || cap == null) return;
      capByFY[f] = capByFY[f] || {};
      capByFY[f][yr.year] = cap;
    });
  });

  const isOpen = (f: string, y: number) => (openByYear[y] || []).includes(f);
  const openedAt = (f: string, y: number) => {
    const idx = years.indexOf(y);
    const prev = years[idx - 1];
    return isOpen(f, y) && (!prev || !isOpen(f, prev));
  };
  const closedAfter = (f: string, y: number) => {
    const idx = years.indexOf(y);
    const next = years[idx + 1];
    return isOpen(f, y) && next != null && !isOpen(f, next);
  };

  const Badge = ({
    children,
    className = "",
  }: {
    children: any;
    className?: string;
  }) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${className}`}
    >
      {children}
    </span>
  );

  return (
    <div className="rounded-2xl p-4 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex gap-2 items-center text-xs text-gray-600">
          <Badge className="bg-green-50 border-green-300">Open</Badge>
          <Badge className="bg-blue-50 border-blue-300">Open (New)</Badge>
          <Badge className="bg-amber-50 border-amber-300">Closes next</Badge>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left px-2 py-1 border-b sticky left-0 bg-white z-10">
                Facility
              </th>
              {years.map((y) => (
                <th key={y} className="text-left px-2 py-1 border-b">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facilities.map((f) => (
              <tr key={f} className="odd:bg-white even:bg-gray-50">
                <td className="px-2 py-1 border-b sticky left-0 bg-white z-10 font-medium">
                  {f}
                </td>
                {years.map((y) => {
                  const open = isOpen(f, y);
                  const newOpen = openedAt(f, y);
                  const willClose = closedAfter(f, y);
                  const cap = capByFY[f]?.[y];
                  return (
                    <td
                      key={y}
                      className={`px-2 py-1 border-b align-top ${
                        open ? (newOpen ? "bg-blue-50" : "bg-green-50") : ""
                      }`}
                    >
                      {open ? (
                        <div className="grid gap-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                newOpen
                                  ? "bg-blue-50 border-blue-300"
                                  : "bg-green-50 border-green-300"
                              }
                            >
                              {newOpen ? "New" : "Open"}
                            </Badge>
                            {willClose && (
                              <Badge className="bg-amber-50 border-amber-300">
                                Closes next
                              </Badge>
                            )}
                          </div>
                          {cap != null && (
                            <div className="text-[10px] text-gray-600">
                              Capacity: {Intl.NumberFormat().format(cap)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
