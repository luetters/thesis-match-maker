import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BulkActionDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  actionLabel: string;
  count: number;
  onConfirm: (reason?: string) => Promise<void>;
  onCancel: () => void;
  showReasonField?: boolean;
  isLoading?: boolean;
}

export function BulkActionDialog({
  isOpen,
  title,
  message,
  actionLabel,
  count,
  onConfirm,
  onCancel,
  showReasonField = false,
  isLoading = false,
}: BulkActionDialogProps) {
  const [reason, setReason] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(reason);
    } finally {
      setIsConfirming(false);
      setReason("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{message}</p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-900">
            {count} {count === 1 ? "Anfrage" : "Anfragen"} werden {actionLabel.toLowerCase()}
          </p>
        </div>

        {showReasonField && (
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Grund (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Grund für die Ablehnung eingeben..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]"
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            onClick={onCancel}
            disabled={isConfirming || isLoading}
            variant="outline"
            className="border-gray-300"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || isLoading}
            className="bg-[#76B900] hover:bg-[#76B900] text-white"
          >
            {isConfirming ? "Wird verarbeitet..." : actionLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
