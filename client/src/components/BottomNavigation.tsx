import { ReactNode } from "react";
import { useLocation } from "wouter";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface BottomNavigationProps {
  items: NavItem[];
}

export function BottomNavigation({ items }: BottomNavigationProps) {
  const [location, setLocation] = useLocation();

  return (
    <nav className="show-mobile fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = location === item.href;
          return (
            <button
              key={item.href}
              onClick={() => setLocation(item.href)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive
                  ? "text-[#76B900] bg-green-50"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
