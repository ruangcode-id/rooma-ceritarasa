"use client";

import { useEffect, useId, useRef } from "react";
import {
  Chart,
  defaults,
  registerables,
  type ChartConfiguration,
  type ChartData,
  type ChartOptions,
  type ChartType,
} from "chart.js";

let chartJsConfigured = false;

function ensureChartJsConfigured() {
  if (chartJsConfigured) return;

  Chart.register(...registerables);
  defaults.color = "#475569";
  defaults.borderColor = "rgba(148, 163, 184, 0.28)";
  defaults.font.family =
    "'Times New Roman Condensed', 'Times New Roman', Times, serif";
  defaults.plugins.legend.labels.boxWidth = 10;
  defaults.plugins.legend.labels.boxHeight = 10;
  defaults.plugins.tooltip.backgroundColor = "#0f172a";
  defaults.plugins.tooltip.padding = 12;
  defaults.plugins.tooltip.titleFont = {
    family: defaults.font.family,
    size: 13,
    weight: "bold",
  };
  defaults.plugins.tooltip.bodyFont = {
    family: defaults.font.family,
    size: 12,
  };

  chartJsConfigured = true;
}

export const chartPalette = {
  primary: "#e63946",
  primarySoft: "rgba(230, 57, 70, 0.16)",
  secondary: "#f4a261",
  secondarySoft: "rgba(244, 162, 97, 0.18)",
  dark: "#1d3557",
  darkSoft: "rgba(29, 53, 87, 0.18)",
  slate: "#64748b",
  slateSoft: "rgba(100, 116, 139, 0.16)",
};

export type DashboardChartProps<TType extends ChartType = "line"> = {
  type: TType;
  data: ChartData<TType>;
  options?: ChartOptions<TType>;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  height?: number;
  className?: string;
  canvasLabel?: string;
};

export function DashboardChart<TType extends ChartType = "line">({
  type,
  data,
  options,
  title,
  description,
  footer,
  height = 320,
  className = "",
  canvasLabel,
}: DashboardChartProps<TType>) {
  const canvasId = useId();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<TType> | null>(null);

  useEffect(() => {
    ensureChartJsConfigured();

    if (!canvasRef.current) return;

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
        },
      },
      scales:
        type === "doughnut" || type === "pie"
          ? undefined
          : {
              x: {
                grid: {
                  display: false,
                },
              },
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0,
                },
              },
            },
      ...options,
    } as ChartConfiguration<TType>["options"];

    const config: ChartConfiguration<TType> = {
      type,
      data,
      options: chartOptions,
    };

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, options, type]);

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {title || description ? (
        <div className="mb-6">
          {title ? (
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          ) : null}
          {description ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}

      <div style={{ height }} className="relative w-full">
        <canvas
          id={canvasId}
          ref={canvasRef}
          aria-label={canvasLabel ?? title ?? "Dashboard chart"}
          role="img"
        />
      </div>

      {footer ? (
        <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
