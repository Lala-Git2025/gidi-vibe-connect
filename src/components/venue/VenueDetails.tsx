import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Globe, Instagram, Star, Clock, DollarSign } from "lucide-react";

interface VenueDetailsProps {
  venue: {
    name: string;
    description?: string;
    location: string;
    address?: string;
    category: string;
    rating?: number;
    price_range?: string;
    features?: string[];
    contact_phone?: string;
    contact_email?: string;
    website_url?: string;
    instagram_url?: string;
    opening_hours?: any;
    is_verified?: boolean;
  };
}

export const VenueDetails = ({ venue }: VenueDetailsProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{venue.name}</h1>
              {venue.is_verified && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{venue.location}</span>
              </div>
              {venue.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{venue.rating}</span>
                </div>
              )}
              {venue.price_range && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>{venue.price_range}</span>
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className="capitalize">
            {venue.category}
          </Badge>
        </div>

        {venue.description && (
          <p className="text-muted-foreground leading-relaxed">{venue.description}</p>
        )}
      </div>

      {/* Features */}
      {venue.features && venue.features.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Features</h3>
            <div className="flex flex-wrap gap-2">
              {venue.features.map((feature, index) => (
                <Badge key={index} variant="secondary">
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>
          <div className="space-y-3">
            {venue.address && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="text-foreground">{venue.address}</span>
              </div>
            )}
            {venue.contact_phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <a 
                  href={`tel:${venue.contact_phone}`}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {venue.contact_phone}
                </a>
              </div>
            )}
            {venue.contact_email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <a 
                  href={`mailto:${venue.contact_email}`}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {venue.contact_email}
                </a>
              </div>
            )}
            {venue.website_url && (
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-primary" />
                <a 
                  href={venue.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Visit Website
                </a>
              </div>
            )}
            {venue.instagram_url && (
              <div className="flex items-center gap-3">
                <Instagram className="w-5 h-5 text-primary" />
                <a 
                  href={venue.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Follow on Instagram
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Opening Hours */}
      {venue.opening_hours && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Opening Hours
            </h3>
            <div className="space-y-2">
              {Object.entries(venue.opening_hours as Record<string, string>).map(([day, hours]) => (
                <div key={day} className="flex justify-between">
                  <span className="capitalize text-foreground font-medium">{day}</span>
                  <span className="text-muted-foreground">{hours}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};