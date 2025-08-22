import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users } from "lucide-react";

interface ExperienceCardProps {
  title: string;
  location: string;
  time: string;
  attendees: number;
  image: string;
  category: string;
}

export const ExperienceCard = ({ 
  title, 
  location, 
  time, 
  attendees, 
  image, 
  category 
}: ExperienceCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-glow transition-all duration-300 transform hover:scale-105 bg-gradient-subtle border-0">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <Badge className="bg-primary text-primary-foreground font-semibold">
            {category}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-2 text-foreground">{title}</h3>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{location}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary" />
            <span>{time}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <span>{attendees} people going</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};