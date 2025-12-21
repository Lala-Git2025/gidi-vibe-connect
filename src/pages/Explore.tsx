import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Search, Filter, MapPin, Star, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { PullToRefresh } from "@/components/PullToRefresh";
import { hapticClick, hapticSuccess } from "@/utils/haptics";
import { LazyImage } from "@/components/LazyImage";

interface Venue {
  id: string;
  name: string;
  category: string;
  rating: number;
  location: string;
  professional_media_urls?: string[];
  description?: string;
  price_range?: string;
  features?: string[];
}

const Explore = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const fetchVenues = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch live venues from our API
      const { data, error } = await supabase.functions.invoke('fetch-venues', {
        body: { category: activeCategory === 'All' ? 'all' : activeCategory }
      });

      if (error) throw error;

      // Combine live data with database venues
      const { data: dbVenues } = await supabase
        .from('venues')
        .select('*')
        .order('rating', { ascending: false })
        .limit(12);

      const allVenues = [...(data.data || []), ...(dbVenues || [])];
      
      // Remove duplicates based on name
      const uniqueVenues = allVenues.filter((venue, index, self) => 
        index === self.findIndex(v => v.name === venue.name)
      );

      setVenues(uniqueVenues);

      if (refresh) {
        hapticSuccess();
        toast({
          title: "Venues Updated",
          description: `Loaded ${uniqueVenues.length} venues`,
        });
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
      
      // Fallback to database only
      const { data: dbVenues } = await supabase
        .from('venues')
        .select('*')
        .order('rating', { ascending: false })
        .limit(12);
      
      setVenues(dbVenues || []);
      
      toast({
        title: "Error",
        description: "Failed to load latest venues. Showing cached content.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [activeCategory]);

  const categories = ["All", "Club", "Restaurant", "Lounge", "Bar"];

  // Filter venues by category and search query
  const filteredVenues = venues.filter(venue => {
    // Filter by category
    const categoryMatch = activeCategory === "All" || venue.category === activeCategory;

    // Filter by search query
    const searchMatch = searchQuery === "" ||
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.features?.some(feature => feature.toLowerCase().includes(searchQuery.toLowerCase()));

    return categoryMatch && searchMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Explore Lagos</h1>
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-4 h-4 bg-muted rounded"></div>
                <div className="w-32 h-4 bg-muted rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-48 bg-muted"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded"></div>
                  </CardContent>
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
        <PullToRefresh onRefresh={() => fetchVenues(true)} className="h-full">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-foreground">Explore Lagos</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  hapticClick();
                  fetchVenues(true);
                }}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <p className="text-muted-foreground">Discover the best venues in the city</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search venues, events, or locations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Categories</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={category === activeCategory ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => {
                    hapticClick();
                    setActiveCategory(category);
                  }}
                >
                  {category}s
                </Button>
              ))}
            </div>
          </div>

          {/* Venues */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {activeCategory === 'All' ? 'Featured Venues' : `${activeCategory}s`}
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredVenues.length} venues found
              </span>
            </div>
            
            {filteredVenues.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No venues found for this category.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveCategory('All')}
                >
                  View All Venues
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVenues.map((venue) => (
                  <Link key={venue.id} to={`/venue/${venue.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer">
                      <div className="relative h-48">
                        <LazyImage
                          src={venue.professional_media_urls?.[0] || ''}
                          alt={venue.name}
                          className="h-48"
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <Badge className="bg-primary text-primary-foreground">
                            {venue.category}
                          </Badge>
                          {venue.rating >= 4.5 && (
                            <Badge variant="secondary" className="bg-accent text-accent-foreground">
                              Top Rated
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-1">{venue.name}</h3>
                        {venue.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{venue.description}</p>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="line-clamp-1">{venue.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{venue.rating}</span>
                          </div>
                        </div>
                        {venue.price_range && (
                          <div className="mt-2 text-sm font-medium text-accent">
                            {venue.price_range}
                          </div>
                        )}
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
            )}
          </div>
          </div>
        </PullToRefresh>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Explore;