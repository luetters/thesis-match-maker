import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle, XCircle, Mail } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onAccept: () => void;
  onReject: () => void;
  onReminder: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

export function BulkActionBar({
  selectedCount,
  onAccept,
  onReject,
  onReminder,
  onClearSelection,
  isLoading = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} {selectedCount === 1 ? "Anfrage" : "Anfragen"} ausgewählt
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-gray-600 hover:text-gray-900"
        >
          Abbrechen
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onAccept}
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Akzeptieren ({selectedCount})
        </Button>

        <Button
          onClick={onReject}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          Ablehnen ({selectedCount})
        </Button>

        <Button
          onClick={onReminder}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Erinnerung ({selectedCount})
        </Button>
      </div>
    </div>
  );
}
