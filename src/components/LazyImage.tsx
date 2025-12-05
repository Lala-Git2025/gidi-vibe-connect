import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallback?: string;
  threshold?: number;
  placeholderClassName?: string;
}

export const LazyImage = ({
  src,
  alt,
  fallback,
  threshold = 0.1,
  placeholderClassName = '',
  className = '',
  ...props
}: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) return;

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading the image
            const img = new Image();
            img.src = src;

            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
            };

            img.onerror = () => {
              setHasError(true);
              setIsLoading(false);
              if (fallback) {
                setImageSrc(fallback);
              }
            };

            // Stop observing once we've started loading
            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, fallback, threshold]);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Loading placeholder */}
      {isLoading && (
        <div
          className={`absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse ${placeholderClassName}`}
        />
      )}

      {/* Error fallback */}
      {hasError && !fallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/20 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">No Image</span>
        </div>
      )}

      {/* Actual image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          {...props}
        />
      )}
    </div>
  );
};
