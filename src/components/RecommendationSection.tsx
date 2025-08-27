import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import lagosClub from "@/assets/lagos-club.jpg";
import lagosFood from "@/assets/lagos-food.jpg";

const recommendations = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    title: "BORDELLE CITY",
    address: "123 Anywhere Street, Any City",
    image: lagosClub,
  },
  {
    id: "22222222-2222-2222-2222-222222222222", 
    title: "FLAVOUR HOUSE",
    address: "456 Victoria Island, Lagos",
    image: lagosFood,
  },
];

export const RecommendationSection = () => {
  return (
    <section className="bg-background py-6 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-2xl font-bold text-foreground mb-4">Recommendation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((item) => (
            <Link key={item.id} to={`/venue/${item.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 border-border cursor-pointer">
                <div className="relative h-40 overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{item.address}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};