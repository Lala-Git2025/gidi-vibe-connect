import { Home, UtensilsCrossed, Newspaper, Music, Calendar, Users, Building, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  { icon: Home, label: "Bars & Lounges", color: "text-primary" },
  { icon: UtensilsCrossed, label: "Restaurants", color: "text-secondary" },
  { icon: Newspaper, label: "GIDI News", color: "text-accent" },
  { icon: Music, label: "Nightlife", color: "text-primary" },
  { icon: Calendar, label: "DayLife", color: "text-secondary" },
  { icon: Calendar, label: "Events", color: "text-accent" },
  { icon: Building, label: "Social", color: "text-primary" },
  { icon: MoreHorizontal, label: "See More", color: "text-muted-foreground" },
];

export const CategoryGrid = () => {
  return (
    <section className="bg-background py-6 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="grid grid-cols-4 gap-4">
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                className="h-20 flex flex-col items-center justify-center gap-2 bg-card hover:bg-card/80 rounded-2xl border border-border shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <IconComponent className={`w-6 h-6 ${category.color}`} />
                <span className="text-xs font-medium text-foreground text-center leading-tight">
                  {category.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
};