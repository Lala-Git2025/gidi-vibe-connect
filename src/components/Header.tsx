import { ArrowLeft, Bell, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        borderBottom: "1px solid rgba(234,179,8,0.08)",
      }}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isHomePage && (
            <button
              onClick={() => navigate(-1)}
              className="gc2-tap"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: 0,
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <span className="gc2-wordmark">GIDI CONNECT</span>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#22C55E",
                boxShadow: "0 0 10px rgba(34,197,94,0.9)",
                animation: "gc2Pulse 1.6s cubic-bezier(0.4,0,0.2,1) infinite",
                display: "inline-block",
              }}
            />
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="gc2-tap"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: 0,
              background: "transparent",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            className="gc2-tap"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: 0,
              background: "transparent",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span
              style={{
                position: "absolute",
                top: 9,
                right: 10,
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#EF4444",
                border: "2px solid #000",
                boxShadow: "0 0 6px rgba(239,68,68,0.8)",
              }}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
