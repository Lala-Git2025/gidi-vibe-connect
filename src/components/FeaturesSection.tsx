import { ExperienceCard } from "@/components/ExperienceCard";
import lagosBeach from "@/assets/lagos-beach.jpg";
import lagosClub from "@/assets/lagos-club.jpg";

export const FeaturesSection = () => {
  const experiences = [
    {
      title: "Lekki Beach Hangout",
      location: "Lekki Conservation Centre",
      time: "Today, 2:00 PM",
      attendees: 156,
      image: lagosBeach,
      category: "Daylife"
    },
    {
      title: "Rooftop Party Vibes",
      location: "Victoria Island Skybar",
      time: "Tonight, 9:00 PM",
      attendees: 247,
      image: lagosClub,
      category: "Nightlife"
    }
  ];

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Discover{" "}
            <span className="bg-gradient-warm bg-clip-text text-transparent">
              Lagos Life
            </span>{" "}
            24/7
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From beach brunches to rooftop dinners, art galleries to club scenes, business hubs to VIP lounges - 
            GIDI CONNECT unlocks Lagos' dynamic energy from sunrise to midnight.
          </p>
        </div>

        {/* Experience Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 mb-16">
          {experiences.map((experience, index) => (
            <ExperienceCard key={index} {...experience} />
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow animate-pulse">
              <span className="text-2xl font-bold text-primary-foreground">☀️</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Daytime Hotspots</h3>
            <p className="text-muted-foreground">
              Discover Lagos by day: beach clubs, rooftop brunches, art galleries, and business networking spots.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4 shadow-warm animate-pulse">
              <span className="text-2xl font-bold text-secondary-foreground">🌃</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Nightlife Scene</h3>
            <p className="text-muted-foreground">
              Experience Lagos after dark: exclusive clubs, rooftop bars, live music venues, and VIP experiences.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-cool rounded-full flex items-center justify-center mx-auto mb-4 shadow-cool animate-pulse">
              <span className="text-2xl font-bold text-accent-foreground">🔥</span>
            </div>
            <h3 className="text-xl font-bold mb-2">24/7 Community</h3>
            <p className="text-muted-foreground">
              Connect with Lagos' vibrant community around the clock. Share experiences, discover events, and build meaningful connections.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};