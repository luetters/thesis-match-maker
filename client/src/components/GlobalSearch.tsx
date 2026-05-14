import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  email?: string;
  type: "thesis" | "examiner" | "student";
}

interface GlobalSearchProps {
  onClose?: () => void;
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Queries
  const { data: thesisResults } = trpc.search.searchThesis.useQuery(
    { query: debouncedQuery },
    { enabled: !!debouncedQuery && debouncedQuery.length > 2 }
  );

  const { data: examinerResults } = trpc.search.searchExaminers.useQuery(
    { query: debouncedQuery },
    { enabled: !!debouncedQuery && debouncedQuery.length > 2 }
  );

  // Combine results
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length <= 2) {
      setResults([]);
      return;
    }

    const combined: SearchResult[] = [
      ...(thesisResults || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        type: "thesis" as const,
      })),
      ...(examinerResults || []).map((r: any) => ({
        id: r.userId,
        name: r.users?.name,
        email: r.users?.email,
        type: "examiner" as const,
      })),
    ];

    setResults(combined.slice(0, 10));
  }, [debouncedQuery, thesisResults, examinerResults]);

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }, []);

  const getResultLabel = (result: SearchResult) => {
    switch (result.type) {
      case "thesis":
        return result.title || "Anfrage";
      case "examiner":
        return `${result.name} (${result.email})`;
      case "student":
        return `${result.name} (${result.email})`;
      default:
        return "Ergebnis";
    }
  };

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

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Anfragen, Prüfer:innen, Studierende durchsuchen..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="max-h-96 overflow-y-auto">
            {results.map((result, idx) => (
              <button
                key={`${result.type}-${result.id}-${idx}`}
                onClick={() => {
                  // Handle navigation based on result type
                  handleClear();
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
              >
                <span>{getResultIcon(result.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getResultLabel(result)}
                  </p>
                  <p className="text-xs text-gray-500">{result.type}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query.length > 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 text-center text-sm text-gray-500">
          Keine Ergebnisse gefunden
        </div>
      )}
    </div>
  );
}
