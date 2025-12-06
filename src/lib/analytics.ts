/**
 * Analytics Utilities
 * Tracks user events and page views
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
}

class Analytics {
  private enabled: boolean;

  constructor() {
    this.enabled = import.meta.env.PROD; // Only track in production
  }

  /**
   * Track a page view
   */
  pageView(path: string) {
    if (!this.enabled) return;

    console.log('[Analytics] Page View:', path);

    // Example: Send to your analytics service
    // posthog.capture('$pageview', { path });
  }

  /**
   * Track a custom event
   */
  track(event: string, properties?: Record<string, any>) {
    if (!this.enabled) return;

    console.log('[Analytics] Event:', event, properties);

    // Example: Send to your analytics service
    // posthog.capture(event, properties);
  }

  /**
   * Identify a user
   */
  identify(userId: string, traits?: Record<string, any>) {
    if (!this.enabled) return;

    console.log('[Analytics] Identify:', userId, traits);

    // Example: Identify user in your analytics service
    // posthog.identify(userId, traits);
  }

  /**
   * Track search queries
   */
  trackSearch(query: string, category?: string) {
    this.track('search_performed', {
      query,
      category,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track venue views
   */
  trackVenueView(venueId: string, venueName: string) {
    this.track('venue_viewed', {
      venue_id: venueId,
      venue_name: venueName,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track event views
   */
  trackEventView(eventId: string, eventTitle: string) {
    this.track('event_viewed', {
      event_id: eventId,
      event_title: eventTitle,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track pull to refresh
   */
  trackPullToRefresh(page: string) {
    this.track('pull_to_refresh', {
      page,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track offline status
   */
  trackOfflineStatus(isOnline: boolean) {
    this.track('network_status_change', {
      is_online: isOnline,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track authentication events
   */
  trackAuth(event: 'login' | 'signup' | 'logout', method?: string) {
    this.track(`auth_${event}`, {
      method,
      timestamp: new Date().toISOString(),
    });
  }
}

export const analytics = new Analytics();
