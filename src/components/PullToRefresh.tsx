import { ReactNode } from 'react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  enabled?: boolean;
  className?: string;
}

export const PullToRefresh = ({
  onRefresh,
  children,
  enabled = true,
  className = '',
}: PullToRefreshProps) => {
  const { containerRef, isPulling, isRefreshing, pullDistance, shouldRefresh } =
    usePullToRefresh({
      onRefresh,
      enabled,
      threshold: 80,
    });

  const refreshOpacity = Math.min(pullDistance / 80, 1);
  const refreshRotation = pullDistance * 2;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      style={{ height: '100%' }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute left-0 right-0 top-0 flex items-center justify-center transition-all duration-200"
        style={{
          height: isRefreshing ? '60px' : `${Math.min(pullDistance, 60)}px`,
          opacity: isPulling || isRefreshing ? refreshOpacity : 0,
          transform: `translateY(${isRefreshing ? 0 : -20}px)`,
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2
            className={`h-6 w-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: isRefreshing ? 'none' : `rotate(${refreshRotation}deg)`,
            }}
          />
          {isRefreshing ? (
            <span className="text-xs font-medium text-primary">Refreshing...</span>
          ) : shouldRefresh ? (
            <span className="text-xs font-medium text-primary">Release to refresh</span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Pull to refresh</span>
          )}
        </div>
      </div>

      {/* Content with padding when pulling/refreshing */}
      <div
        style={{
          paddingTop: isRefreshing ? '60px' : isPulling ? `${Math.min(pullDistance, 60)}px` : 0,
          transition: isRefreshing ? 'padding-top 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};
