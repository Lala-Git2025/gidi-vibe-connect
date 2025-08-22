import { ExperienceCard } from "@/components/ExperienceCard";
import lagosParty from "@/assets/lagos-party.jpg";
import lagosClub from "@/assets/lagos-club.jpg";

export const FeaturesSection = () => {
  const experiences = [
    {
      title: "Rooftop Party Vibes",
      location: "Victoria Island Skybar",
      time: "Tonight, 9:00 PM",
      attendees: 247,
      image: lagosParty,
      category: "Nightlife"
    },
    {
      title: "Afrobeats Club Night",
      location: "Lekki Phase 1",
      time: "Saturday, 10:00 PM",
      attendees: 189,
      image: lagosClub,
      category: "Music & Dance"
    }
  ];

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Discover{" "}
            <span className="bg-gradient-warm bg-clip-text text-transparent">
              Lagos Nights
            </span>{" "}
            Like Never Before
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From exclusive rooftop parties to underground club scenes, VIP lounges to beach raves - 
            GIDI CONNECT unlocks Lagos' electric nightlife and connects you with the city's energy.
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
              <span className="text-2xl font-bold text-primary-foreground">🌃</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Nightlife Discovery</h3>
            <p className="text-muted-foreground">
              Find the hottest spots after dark. From Victoria Island to Lekki, discover where Lagos comes alive at night.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4 shadow-warm animate-pulse">
              <span className="text-2xl font-bold text-secondary-foreground">🎉</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Party Network</h3>
            <p className="text-muted-foreground">
              Connect with Lagos' party scene. Meet fellow night owls, share experiences, and build your social circle.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-cool rounded-full flex items-center justify-center mx-auto mb-4 shadow-cool animate-pulse">
              <span className="text-2xl font-bold text-accent-foreground">🔥</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Live Energy</h3>
            <p className="text-muted-foreground">
              Feel the pulse of Lagos nightlife in real-time. Get instant updates on parties, club events, and the hottest scenes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};