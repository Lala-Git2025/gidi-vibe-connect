import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LGASelector } from "@/components/LGASelector";
import { MapPin, Star, Clock, Phone, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

interface Venue {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string;
  rating: number;
  price_range: string;
  contact_phone?: string;
  features: string[];
  professional_media_urls?: string[];
  opening_hours?: any;
}

export const LiveVenueSection = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLGASelector, setShowLGASelector] = useState(false);
  const [selectedLGA, setSelectedLGA] = useState('');
  const { toast } = useToast();

  const fetchTrendingVenues = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
        const { data, error } = await supabase.functions.invoke('fetch-venues', {
          body: { 
            category: 'all',
            location: 'Lagos'
            // No LGA specified - get trending venues from all of Lagos
          }
        });

      if (error) throw error;

      setVenues(data.data || []);
      
      if (refresh) {
        toast({
          title: "Venues Updated",
          description: `Loaded ${data.data?.length || 0} trending venues`,
        });
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast({
        title: "Error",
        description: "Failed to load latest venues. Showing existing data.",
        variant: "destructive",
      });
      
      // Fallback to database
      const { data: existingVenues } = await supabase
        .from('venues')
        .select('*')
        .order('rating', { ascending: false })
        .limit(8);
      
      setVenues(existingVenues || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchVenuesByLGA = async (lga: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-venues', {
        body: { 
          category: 'Restaurant',
          location: 'Lagos',
          lga: lga
        }
      });

      if (error) throw error;
      setVenues(data.data || []);
      
      toast({
        title: "Venues Loaded",
        description: `Found ${data.data?.length || 0} venues in ${lga}`,
      });
    } catch (error) {
      console.error('Error fetching LGA venues:', error);
      toast({
        title: "Error",
        description: "Failed to load venues for selected area.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowLGASelector(false);
    }
  };

  const handleRefresh = () => fetchTrendingVenues(true);

  const handleLGASelection = (lga: string) => {
    setSelectedLGA(lga);
    fetchVenuesByLGA(lga);
  };

  useEffect(() => {
    // Load trending venues on component mount
    fetchTrendingVenues();
  }, []);

  if (loading) {
    return (
      <section className="bg-background py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Trending Venues</h2>
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="h-48 bg-muted"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {selectedLGA ? `${selectedLGA} Venues` : 'Trending Venues'}
            </h2>
            <p className="text-muted-foreground">
              {selectedLGA ? `Hotspots in ${selectedLGA}` : 'Hottest spots across Lagos'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLGASelector(!showLGASelector)}
              className="gap-2"
            >
              <MapPin className="w-4 h-4" />
              {selectedLGA ? 'Change Area' : 'Select Area'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {showLGASelector && (
          <div className="mb-8 p-4 bg-background/50 rounded-lg border">
            <LGASelector 
              selectedLGA={selectedLGA} 
              onLGAChange={handleLGASelection}
            />
          </div>
        )}

        {selectedLGA && (
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedLGA('');
                setShowLGASelector(false);
                fetchTrendingVenues();
              }}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              ← Back to Trending Venues
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {venues.map((venue) => (
            <Link key={venue.id} to={`/venue/${venue.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer">
                <div className="relative h-48 overflow-hidden">
                  {venue.professional_media_urls && venue.professional_media_urls[0] ? (
                    <img
                      src={venue.professional_media_urls[0]}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <span className="text-muted-foreground">No Image</span>
                    </div>
                  )}
                  
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-primary text-primary-foreground">
                      {venue.category}
                    </Badge>
                  </div>
                  
                  {venue.rating > 0 && (
                    <div className="absolute top-3 right-3 bg-background/90 rounded-full px-2 py-1 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">{venue.rating}</span>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-1 line-clamp-1">{venue.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {venue.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="line-clamp-1">{venue.location}</span>
                    </div>

                    {venue.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-secondary" />
                        <span>{venue.contact_phone}</span>
                      </div>
                    )}

                    {venue.price_range && (
                      <div className="flex items-center justify-between">
                        <span className="text-accent font-medium">{venue.price_range}</span>
                        {venue.opening_hours && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Open</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {venue.features && venue.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {venue.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};