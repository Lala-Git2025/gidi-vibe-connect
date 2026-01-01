/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals for performance optimization
 */

import { onCLS, onFID, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';

interface AnalyticsEvent {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

/**
 * Send metric to analytics service
 */
const sendToAnalytics = (metric: Metric) => {
  // Determine rating based on thresholds
  const rating = getRating(metric);

  const event: AnalyticsEvent = {
    name: metric.name,
    value: metric.value,
    rating,
    delta: metric.delta,
    id: metric.id,
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('[Web Vitals]', event);
  }

  // Send to analytics service in production
  if (import.meta.env.PROD) {
    // Example: Send to Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
        metric_rating: rating,
      });
    }

    // Example: Send to custom analytics
    // fetch('/api/analytics', {
    //   method: 'POST',
    //   body: JSON.stringify(event),
    //   headers: { 'Content-Type': 'application/json' },
    // });
  }
};

/**
 * Determine performance rating based on Web Vitals thresholds
 */
const getRating = (metric: Metric): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25],        // Cumulative Layout Shift
    FID: [100, 300],         // First Input Delay (ms)
    LCP: [2500, 4000],       // Largest Contentful Paint (ms)
    FCP: [1800, 3000],       // First Contentful Paint (ms)
    TTFB: [800, 1800],       // Time to First Byte (ms)
  };

  const [goodThreshold, poorThreshold] = thresholds[metric.name] || [0, 0];

  if (metric.value <= goodThreshold) return 'good';
  if (metric.value <= poorThreshold) return 'needs-improvement';
  return 'poor';
};

/**
 * Initialize Web Vitals monitoring
 * Call this once in your app entry point
 */
export const reportWebVitals = () => {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Cumulative Layout Shift (CLS)
  // Measures visual stability
  // Good: < 0.1, Needs Improvement: < 0.25, Poor: >= 0.25
  onCLS(sendToAnalytics);

  // First Input Delay (FID)
  // Measures interactivity
  // Good: < 100ms, Needs Improvement: < 300ms, Poor: >= 300ms
  onFID(sendToAnalytics);

  // Largest Contentful Paint (LCP)
  // Measures loading performance
  // Good: < 2.5s, Needs Improvement: < 4s, Poor: >= 4s
  onLCP(sendToAnalytics);

  // First Contentful Paint (FCP)
  // Measures perceived load speed
  // Good: < 1.8s, Needs Improvement: < 3s, Poor: >= 3s
  onFCP(sendToAnalytics);

  // Time to First Byte (TTFB)
  // Measures server response time
  // Good: < 800ms, Needs Improvement: < 1800ms, Poor: >= 1800ms
  onTTFB(sendToAnalytics);
};

/**
 * Get current Web Vitals scores
 * Useful for debugging and performance dashboards
 */
export const getWebVitalsScores = async (): Promise<Record<string, number>> => {
  return new Promise((resolve) => {
    const scores: Record<string, number> = {};
    let count = 0;
    const total = 5;

    const collect = (metric: Metric) => {
      scores[metric.name] = metric.value;
      count++;
      if (count === total) {
        resolve(scores);
      }
    };

    onCLS(collect);
    onFID(collect);
    onLCP(collect);
    onFCP(collect);
    onTTFB(collect);

    // Timeout after 10 seconds
    setTimeout(() => resolve(scores), 10000);
  });
};
