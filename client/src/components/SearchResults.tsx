import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  email?: string;
  status?: string;
  type: "thesis" | "examiner" | "student";
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  onResultClick?: (result: SearchResult) => void;
}

const ITEMS_PER_PAGE = 10;

export function SearchResults({
  results,
  isLoading = false,
  onResultClick,
}: SearchResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedResults = results.slice(startIdx, startIdx + ITEMS_PER_PAGE);

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

  if (results.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <p>Keine Ergebnisse gefunden</p>
      </Card>
    );
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case "thesis":
        return "📄";
      case "examiner":
        return "👨‍🏫";
      case "student":
        return "👨‍🎓";
      default:
        return "🔍";
    }
  };

  const getResultLabel = (result: SearchResult) => {
    switch (result.type) {
      case "thesis":
        return result.title || "Anfrage";
      case "examiner":
      case "student":
        return `${result.name} (${result.email})`;
      default:
        return "Ergebnis";
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {paginatedResults.map((result) => (
          <Card
            key={`${result.type}-${result.id}`}
            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onResultClick?.(result)}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{getResultIcon(result.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {getResultLabel(result)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {result.type}
                  </span>
                  {result.status && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {result.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={
                  currentPage === page
                    ? "bg-[#76B900] hover:bg-[#6aa300] text-white"
                    : ""
                }
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        Zeige {startIdx + 1} bis {Math.min(startIdx + ITEMS_PER_PAGE, results.length)} von{" "}
        {results.length} Ergebnissen
      </p>
    </div>
  );
}
