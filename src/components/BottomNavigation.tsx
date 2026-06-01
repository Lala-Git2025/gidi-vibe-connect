import { Home, Search, MessageSquare, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { hapticClick } from "@/utils/haptics";

const navItems = [
  { icon: Home,           label: "Home",    path: "/" },
  { icon: Search,         label: "Explore", path: "/explore" },
  { icon: MessageSquare,  label: "Social",  path: "/social" },
  { icon: User,           label: "Profile", path: "/profile" },
];

export const BottomNavigation = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50 safe-area-inset-bottom"
      style={{
        padding: '8px 16px 18px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.95) 50%)',
      }}
    >
      <div
        style={{
          background: 'rgba(20,20,24,0.85)',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          border: '1px solid rgba(234,179,8,0.12)',
          borderRadius: 22,
          padding: 6,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          boxShadow:
            '0 12px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={hapticClick}
              style={{ flex: 1 }}
            >
              <button
                className="gc2-tap"
                style={{
                  flex: 1,
                  width: '100%',
                  background: 'transparent',
                  border: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '8px 4px',
                  position: 'relative',
                  color: isActive ? '#18181B' : '#9CA3AF',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    bottom: 4,
                    left: 14,
                    right: 14,
                    borderRadius: 16,
                    background: 'linear-gradient(180deg, #FDE047, #EAB308)',
                    boxShadow: '0 0 18px rgba(234,179,8,0.55)',
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 200ms cubic-bezier(0.4,0,0.2,1)',
                    pointerEvents: 'none',
                  }}
                />
                <Icon
                  className="w-5 h-5"
                  style={{ position: 'relative', zIndex: 1 }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {item.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
