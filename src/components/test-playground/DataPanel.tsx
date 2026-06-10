import type { Key } from "react";
import type { ChartData } from "chart.js";
import { CalendarBlank, CreditCard, UsersThree } from "@phosphor-icons/react";
import { MetricCard } from "@/components/cards/MetricCard";
import { DashboardChart } from "@/components/charts";
import { DataTable, type DataTableColumn } from "@/components/tables";
import { SectionTitle } from "@/components/ui/SectionTitle";

export type DataPanelProps<TData> = {
  chartData: ChartData<"line">;
  tableColumns: Array<DataTableColumn<TData>>;
  tableData: TData[];
  rowKey: keyof TData | ((row: TData, index: number) => Key);
};

export function DataPanel<TData>({
  chartData,
  tableColumns,
  tableData,
  rowKey,
}: DataPanelProps<TData>) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Reservations", value: "128", Icon: CalendarBlank },
          { label: "Guests", value: "342", Icon: UsersThree },
          { label: "Payments", value: "96%", Icon: CreditCard },
        ].map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <DashboardChart
        type="line"
        title="Dashboard chart setup"
        description="Contoh Chart.js terkonfigurasi untuk dashboard owner/admin."
        data={chartData}
        height={280}
        footer="Chart ini memakai warna dan font global Rooma Ceritarasa."
      />

      <div>
        <div className="mb-5">
          <SectionTitle eyebrow="Table" title="Reusable DataTable" />
        </div>
        <DataTable
          caption="Reservation testing rows"
          columns={tableColumns}
          data={tableData}
          rowKey={rowKey}
          initialPageSize={5}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>
    </div>
  );
}
