import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResponsiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  position?: "left" | "right" | "bottom";
}

export function ResponsiveDrawer({
  isOpen,
  onClose,
  title,
  children,
  position = "right",
}: ResponsiveDrawerProps) {
  if (!isOpen) return null;

  const positionClasses = {
    left: "left-0 w-64 h-screen",
    right: "right-0 w-64 h-screen",
    bottom: "bottom-0 w-full h-1/2",
  };

  const transformClasses = {
    left: isOpen ? "translate-x-0" : "-translate-x-full",
    right: isOpen ? "translate-x-0" : "translate-x-full",
    bottom: isOpen ? "translate-y-0" : "translate-y-full",
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 show-mobile"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed ${positionClasses[position]} bg-white shadow-lg transform transition-transform duration-300 z-50 show-mobile ${transformClasses[position]}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-60px)] p-4">
          {children}
        </div>
      </div>
    </>
  );
}
