import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { VenueDetails } from "@/components/venue/VenueDetails";
import { MediaCarousel } from "@/components/venue/MediaCarousel";
import { VenueSocialFeed } from "@/components/venue/VenueSocialFeed";
import { CreatePost } from "@/components/venue/CreatePost";
import { Separator } from "@/components/ui/separator";

const VenueProfile = () => {
  const { venueId } = useParams<{ venueId: string }>();

  const { data: venue, isLoading, error } = useQuery({
    queryKey: ["venue", venueId],
    queryFn: async () => {
      if (!venueId) throw new Error("Venue ID is required");
      
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error("Venue not found");
      
      return data;
    },
    enabled: !!venueId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-64 bg-muted rounded-lg"></div>
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Venue Not Found</h1>
            <p className="text-muted-foreground">The venue you're looking for doesn't exist or has been removed.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Media Carousel */}
          <MediaCarousel media={venue.professional_media_urls || []} venueName={venue.name} />
          
          {/* Venue Details */}
          <VenueDetails venue={venue} />
          
          <Separator className="my-8" />
          
          {/* Create Post Section */}
          <CreatePost venueId={venue.id} venueName={venue.name} />
          
          <Separator className="my-8" />
          
          {/* Social Feed */}
          <VenueSocialFeed venueId={venue.id} />
        </div>
      </main>
    </div>
  );
};

export default VenueProfile;