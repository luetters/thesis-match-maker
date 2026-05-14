import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";

interface MobileMenuProps {
  items: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
  }>;
}

export function MobileMenu({ items }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const handleNavigate = (href: string) => {
    setLocation(href);
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="show-mobile fixed top-4 right-4 z-40"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </Button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 show-mobile z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <nav
        className={`fixed top-0 left-0 h-screen w-64 bg-white shadow-lg transform transition-transform duration-300 show-mobile z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Menü</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleNavigate(item.href)}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3"
              >
                {item.icon && <span className="text-lg">{item.icon}</span>}
                <span className="text-sm font-medium text-gray-700">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* User Info */}
          {user && (
            <div className="border-t pt-4 mt-4">
              <div className="px-4 py-2">
                <p className="text-xs text-gray-500">Angemeldet als</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name || user.email}
                </p>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
