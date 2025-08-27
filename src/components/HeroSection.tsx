import { Button } from "@/components/ui/button";
import { MapPin, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import lagosHero from "@/assets/lagos-hero.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={lagosHero} 
          alt="Lagos vibrant nightlife scene with rooftop parties and city lights"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background/40 to-secondary/20" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground">
            Welcome to{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              GIDI CONNECT
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-foreground mb-8 leading-relaxed font-medium drop-shadow-lg">
            Experience Lagos 24/7! From vibrant daytime hotspots to electric nightlife, 
            discover the city's energy and connect with West Africa's most dynamic community.
          </p>
          
          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="font-medium">Day & Night Spots</span>
            </div>
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border">
              <Users className="w-5 h-5 text-secondary" />
              <span className="font-medium">Active Community</span>
            </div>
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border">
              <Zap className="w-5 h-5 text-accent" />
              <span className="font-medium">24/7 Energy</span>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/get-started">
              <Button variant="hero" size="lg">
                Join the Community
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="secondary" size="lg">
                Explore Lagos
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Floating elements */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex justify-center">
          <div className="w-1 h-3 bg-primary rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  );
};