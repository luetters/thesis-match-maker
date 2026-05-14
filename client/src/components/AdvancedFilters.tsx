import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

export interface FilterConfig {
  status?: string[];
  department?: string[];
  language?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

interface AdvancedFiltersProps {
  onApply: (filters: FilterConfig) => void;
  onClear: () => void;
}

const STATUS_OPTIONS = [
  { value: "PENDING_FIRST_EXAMINER", label: "Warten auf Erstgutachter" },
  { value: "FIRST_EXAMINER_ACCEPTED", label: "Erstgutachter akzeptiert" },
  { value: "FIRST_EXAMINER_REJECTED", label: "Erstgutachter abgelehnt" },
  { value: "PENDING_SECOND_EXAMINER", label: "Warten auf Zweitgutachter" },
  { value: "SECOND_EXAMINER_ACCEPTED", label: "Zweitgutachter akzeptiert" },
  { value: "COMPLETED", label: "Abgeschlossen" },
];

const DEPARTMENT_OPTIONS = [
  { value: "FB1", label: "Fachbereich 1 - Wirtschaft" },
  { value: "FB2", label: "Fachbereich 2 - Informatik" },
  { value: "FB3", label: "Fachbereich 3 - Ingenieurwissenschaften" },
  { value: "FB4", label: "Fachbereich 4 - Gestaltung" },
];

const LANGUAGE_OPTIONS = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "Englisch" },
];

export function AdvancedFilters({ onApply, onClear }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterConfig>({});

  const handleStatusChange = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status?.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...(prev.status || []), status],
    }));
  };

  const handleDepartmentChange = (dept: string) => {
    setFilters((prev) => ({
      ...prev,
      department: prev.department?.includes(dept)
        ? prev.department.filter((d) => d !== dept)
        : [...(prev.department || []), dept],
    }));
  };

  const handleLanguageChange = (lang: string) => {
    setFilters((prev) => ({
      ...prev,
      language: prev.language?.includes(lang)
        ? prev.language.filter((l) => l !== lang)
        : [...(prev.language || []), lang],
    }));
  };

  const handleApply = () => {
    onApply(filters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilters({});
    onClear();
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        Filter
        {activeFilterCount > 0 && (
          <span className="ml-2 bg-[#76B900] text-white text-xs rounded-full px-2 py-1">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 mt-2 w-80 p-4 z-50 shadow-lg">
          <div className="space-y-4">
            {/* Status Filter */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Status</h3>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.status?.includes(option.value) || false}
                      onChange={() => handleStatusChange(option.value)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Department Filter */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-sm mb-2">Fachbereich</h3>
              <div className="space-y-2">
                {DEPARTMENT_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.department?.includes(option.value) || false}
                      onChange={() => handleDepartmentChange(option.value)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Language Filter */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-sm mb-2">Sprache</h3>
              <div className="space-y-2">
                {LANGUAGE_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.language?.includes(option.value) || false}
                      onChange={() => handleLanguageChange(option.value)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t pt-4 flex gap-2">
              <Button
                onClick={handleApply}
                className="flex-1 bg-[#76B900] hover:bg-[#6aa300] text-white"
              >
                Anwenden
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                className="flex-1"
              >
                Zurücksetzen
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
