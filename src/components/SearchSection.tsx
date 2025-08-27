import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const SearchSection = () => {
  return (
    <section className="bg-background py-6 px-4">
      <div className="container mx-auto max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search your destination here..."
            className="pl-10 pr-4 py-3 text-base bg-muted/50 border-border rounded-full focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
    </section>
  );
};