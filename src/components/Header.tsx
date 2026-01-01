import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Bell, User, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { hapticClick } from "@/utils/haptics";

export const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileNavClick = () => {
    hapticClick();
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center shadow-glow">
            <span className="text-primary-foreground font-bold text-sm">GC</span>
          </div>
          <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            GIDI CONNECT
          </span>
        </Link>

        {/* Navigation - Hidden on mobile */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/explore" 
            className={`transition-colors font-medium ${
              location.pathname === '/explore' ? 'text-primary' : 'text-foreground hover:text-primary'
            }`}
          >
            Explore
          </Link>
          <Link 
            to="/events" 
            className={`transition-colors font-medium ${
              location.pathname === '/events' ? 'text-primary' : 'text-foreground hover:text-primary'
            }`}
          >
            Events
          </Link>
          <Link 
            to="/#community" 
            className="text-foreground hover:text-primary transition-colors font-medium"
          >
            Community
          </Link>
          <Link 
            to="/#about" 
            className="text-foreground hover:text-primary transition-colors font-medium"
          >
            About
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open mobile menu"
                onClick={hapticClick}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8">
                <Link
                  to="/explore"
                  onClick={handleMobileNavClick}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium transition-colors ${
                    location.pathname === '/explore'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  Explore
                </Link>
                <Link
                  to="/events"
                  onClick={handleMobileNavClick}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium transition-colors ${
                    location.pathname === '/events'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  Events
                </Link>
                <Link
                  to="/#community"
                  onClick={handleMobileNavClick}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium hover:bg-accent transition-colors"
                >
                  Community
                </Link>
                <Link
                  to="/#about"
                  onClick={handleMobileNavClick}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium hover:bg-accent transition-colors"
                >
                  About
                </Link>
                <div className="border-t border-border mt-4 pt-4">
                  <Link to="/profile" onClick={handleMobileNavClick}>
                    <Button variant="outline" className="w-full justify-start gap-3 mb-2">
                      <User className="w-5 h-5" />
                      Profile
                    </Button>
                  </Link>
                  <Link to="/get-started" onClick={handleMobileNavClick}>
                    <Button variant="default" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="w-5 h-5" />
            </Button>
            <Link to="/profile">
              <Button variant="ghost" size="icon" aria-label="Profile">
                <User className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/get-started">
              <Button variant="default" size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};