import { useNavigate } from 'react-router-dom';
import { LogOut, User, Bell } from 'lucide-react';
import { useBusinessAuth } from '../../contexts/BusinessAuthContext';
import { Button } from '../ui/button';

export function Header() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useBusinessAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-card border-b h-16 flex items-center justify-between px-6">
      <div className="flex items-center flex-1">
        <h1 className="text-lg font-semibold text-foreground">
          Welcome back, {profile?.full_name || 'Business Owner'}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full"></span>
        </Button>

        {/* User Menu */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden sm:block text-sm">
              <p className="font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
