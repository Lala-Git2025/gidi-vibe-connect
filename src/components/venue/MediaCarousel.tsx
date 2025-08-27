import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaCarouselProps {
  media: string[];
  venueName: string;
}

export const MediaCarousel = ({ media, venueName }: MediaCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // If no media, show placeholder
  if (!media || media.length === 0) {
    return (
      <Card className="relative h-64 md:h-96 mb-6 overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 mx-auto">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{venueName}</h3>
            <p className="text-muted-foreground">Media coming soon</p>
          </div>
        </div>
      </Card>
    );
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Main Carousel */}
      <Card className="relative h-64 md:h-96 overflow-hidden group">
        <div className="relative w-full h-full">
          <img
            src={media[currentIndex]}
            alt={`${venueName} - Image ${currentIndex + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          
          {/* Navigation arrows */}
          {media.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background/20 backdrop-blur-sm hover:bg-background/40 text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/20 backdrop-blur-sm hover:bg-background/40 text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}
          
          {/* Image counter */}
          {media.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-background/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {media.length}
            </div>
          )}
        </div>
      </Card>

      {/* Thumbnail navigation */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {media.map((image, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                currentIndex === index
                  ? "border-primary shadow-lg"
                  : "border-transparent hover:border-border"
              )}
            >
              <img
                src={image}
                alt={`${venueName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};