import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import lagosCulture from "@/assets/lagos-culture.jpg";
import lagosParty from "@/assets/lagos-party.jpg";

const destinations = [
  {
    id: 1,
    title: "LAGOS ISLAND",
    subtitle: "Business & Cultural Hub",
    image: lagosCulture,
    rating: 4.8,
  },
  {
    id: 2,
    title: "LEKKI",
    subtitle: "Beaches & Entertainment",
    image: lagosParty,
    rating: 4.7,
  },
];

export const PopularDestinations = () => {
  return (
    <section className="bg-background py-6 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-2xl font-bold text-foreground mb-4">Popular Destination</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {destinations.map((destination) => (
            <Card key={destination.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={destination.image} 
                  alt={destination.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-background/90 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{destination.title}</h3>
                        <p className="text-sm text-muted-foreground">{destination.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-foreground">{destination.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};