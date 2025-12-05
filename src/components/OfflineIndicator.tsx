import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-0 right-0 bg-destructive text-destructive-foreground py-2 px-4 z-50 animate-slide-down">
      <div className="container mx-auto flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">You're offline. Some features may not work.</span>
      </div>
    </div>
  );
};
