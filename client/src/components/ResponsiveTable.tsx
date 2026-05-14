import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface ResponsiveTableProps {
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: any) => ReactNode;
  }>;
  data: any[];
  isLoading?: boolean;
  onRowClick?: (row: any) => void;
}

export function ResponsiveTable({
  columns,
  data,
  isLoading = false,
  onRowClick,
}: ResponsiveTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <p>Keine Daten verfügbar</p>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hide-mobile overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-semibold text-gray-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-gray-200 ${
                  onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-900">
                    {col.render
                      ? col.render(row[col.key], row)
                      : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="show-mobile space-y-3">
        {data.map((row, idx) => (
          <Card
            key={idx}
            onClick={() => onRowClick?.(row)}
            className={`p-4 ${
              onRowClick
                ? "cursor-pointer active:bg-gray-100 transition-colors"
                : ""
            }`}
          >
            <div className="space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between items-start">
                  <span className="text-xs font-medium text-gray-500">
                    {col.label}
                  </span>
                  <span className="text-sm text-gray-900 text-right flex-1 ml-2">
                    {col.render
                      ? col.render(row[col.key], row)
                      : row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
