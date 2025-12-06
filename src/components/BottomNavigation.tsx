import { Home, Search, Bookmark, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { hapticClick } from "@/utils/haptics";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Explore", path: "/explore" },
  { icon: Bookmark, label: "Events", path: "/events" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNavigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border md:hidden z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item, index) => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link key={index} to={item.path} onClick={hapticClick}>
              <Button
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center gap-1 h-auto py-3 px-4 transition-all duration-200 ${
                  isActive
                    ? "text-primary scale-110"
                    : "text-muted-foreground hover:text-foreground hover:scale-105"
                }`}
              >
                <IconComponent
                  className={`w-5 h-5 transition-transform ${isActive ? 'animate-in zoom-in-50' : ''}`}
                />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-in fade-in zoom-in" />
                )}
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};