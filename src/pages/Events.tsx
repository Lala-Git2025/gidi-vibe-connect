import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Calendar, MapPin, Clock, Users, Star, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { PullToRefresh } from "@/components/PullToRefresh";
import { hapticClick, hapticSuccess } from "@/utils/haptics";

interface Event {
  id: string;
  title: string;
  description?: string;
  venue?: string;
  location: string;
  address?: string;
  start_date: string;
  end_date?: string;
  category: string;
  price_range?: string;
  featured_image?: string;
  ticket_url?: string;
  organizer?: string;
  tags?: string[];
  attendee_count?: number;
  is_featured?: boolean;
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All Events");
  const { toast } = useToast();

  const fetchEvents = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-lagos-events', {
        body: { category: activeFilter === 'All Events' ? 'all' : activeFilter, limit: 20 }
      });

      if (error) throw error;

      setEvents(data.data || []);

      if (refresh) {
        hapticSuccess();
        toast({
          title: "Events Updated",
          description: `Loaded ${data.data?.length || 0} live events`,
        });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load latest events. Showing cached content.",
        variant: "destructive",
      });
      
      // Fallback to cached events
      const { data: cachedEvents } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(20);
      
      setEvents(cachedEvents || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const categories = ["All Events", "Nightlife", "Food & Dining", "Technology", "Arts & Culture", "Entertainment"];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Events</h1>
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-4 h-4 bg-muted rounded"></div>
                <div className="w-32 h-4 bg-muted rounded"></div>
              </div>
            </div>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="flex flex-col md:flex-row">
                    <div className="h-48 md:h-32 md:w-64 bg-muted"></div>
                    <CardContent className="p-6 flex-1">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-4 w-1/2"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded w-1/3"></div>
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="pt-16 h-screen">
        <PullToRefresh onRefresh={() => fetchEvents(true)} className="h-full">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-foreground">Live Events</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  hapticClick();
                  fetchEvents(true);
                }}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <p className="text-muted-foreground">Don't miss out on the hottest events in Lagos</p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((filter) => (
                <Button
                  key={filter}
                  variant={filter === activeFilter ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => {
                    hapticClick();
                    setActiveFilter(filter);
                  }}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {activeFilter === 'All Events' ? 'Upcoming Events' : `${activeFilter} Events`}
              </h2>
              <span className="text-sm text-muted-foreground">
                {events.length} events found
              </span>
            </div>
            
            {events.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No events found for this category.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveFilter('All Events')}
                >
                  View All Events
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col md:flex-row">
                      <div className="relative h-48 md:h-auto md:w-64">
                        {event.featured_image ? (
                          <img 
                            src={event.featured_image}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                            <span className="text-muted-foreground">No Image</span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex gap-2">
                          <Badge className="bg-primary text-primary-foreground">
                            {event.category}
                          </Badge>
                          {event.is_featured && (
                            <Badge variant="secondary" className="bg-accent text-accent-foreground">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-6 flex-1">
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <h3 className="font-bold text-xl text-foreground mb-2">{event.title}</h3>
                            {event.description && (
                              <p className="text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                            )}
                            {event.venue && (
                              <p className="text-sm font-medium text-foreground mb-4">at {event.venue}</p>
                            )}
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span>{formatDate(event.start_date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 text-secondary" />
                                <span>{formatTime(event.start_date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 text-accent" />
                                <span>{event.location}</span>
                              </div>
                              {event.attendee_count && event.attendee_count > 0 && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Users className="w-4 h-4 text-primary" />
                                  <span>{event.attendee_count} attending</span>
                                </div>
                              )}
                              {event.price_range && (
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                  <span>💰</span>
                                  <span>{event.price_range}</span>
                                </div>
                              )}
                            </div>

                            {event.tags && event.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-4">
                                {event.tags.slice(0, 4).map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            {event.ticket_url ? (
                              <Button
                                className="flex-1 gap-2"
                                onClick={() => {
                                  hapticClick();
                                  window.open(event.ticket_url, '_blank');
                                }}
                              >
                                Get Tickets
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button className="flex-1" disabled>
                                Coming Soon
                              </Button>
                            )}
                            <Button variant="outline" onClick={hapticClick}>
                              Share
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </PullToRefresh>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Events;