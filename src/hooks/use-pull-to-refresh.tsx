import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: UsePullToRefreshOptions) => {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
  });

  const touchStartY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if scrolled to top
      if (container.scrollTop === 0) {
        startY = e.touches[0].clientY;
        touchStartY.current = startY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startY || state.isRefreshing) return;

      currentY = e.touches[0].clientY;
      const distance = currentY - startY;

      // Only allow pull down when at the top
      if (distance > 0 && container.scrollTop === 0) {
        e.preventDefault();
        const pullDistance = Math.min(distance / resistance, threshold * 1.5);

        setState((prev) => ({
          ...prev,
          isPulling: true,
          pullDistance,
        }));
      }
    };

    const handleTouchEnd = async () => {
      if (state.pullDistance >= threshold && !state.isRefreshing) {
        setState((prev) => ({
          ...prev,
          isRefreshing: true,
          isPulling: false,
        }));

        try {
          await onRefresh();
        } finally {
          setState({
            isPulling: false,
            isRefreshing: false,
            pullDistance: 0,
          });
        }
      } else {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
        });
      }

      startY = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onRefresh, resistance, threshold, state.isRefreshing, state.pullDistance]);

  return {
    containerRef,
    ...state,
    shouldRefresh: state.pullDistance >= threshold,
  };
};
