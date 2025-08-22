import { ExperienceCard } from "@/components/ExperienceCard";
import lagosFood from "@/assets/lagos-food.jpg";
import lagosCulture from "@/assets/lagos-culture.jpg";

export const FeaturesSection = () => {
  const experiences = [
    {
      title: "Lagos Street Food Festival",
      location: "Victoria Island",
      time: "Today, 6:00 PM",
      attendees: 127,
      image: lagosFood,
      category: "Food & Drinks"
    },
    {
      title: "Afrobeats Live Session",
      location: "Ikeja",
      time: "Tomorrow, 8:00 PM",
      attendees: 89,
      image: lagosCulture,
      category: "Music & Arts"
    }
  ];

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Discover{" "}
            <span className="bg-gradient-warm bg-clip-text text-transparent">
              Lagos
            </span>{" "}
            Like Never Before
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From street food festivals to rooftop parties, cultural events to business meetups - 
            GIDI CONNECT brings you closer to the pulse of Lagos.
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
            <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
              <span className="text-2xl font-bold text-primary-foreground">🏙️</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Hyperlocal Discovery</h3>
            <p className="text-muted-foreground">
              Find experiences within your neighborhood. From Surulere to Lekki, discover what's happening nearby.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4 shadow-warm">
              <span className="text-2xl font-bold text-secondary-foreground">👥</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Community First</h3>
            <p className="text-muted-foreground">
              Connect with like-minded Lagosians. Share experiences, make friends, and build your local network.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-cool rounded-full flex items-center justify-center mx-auto mb-4 shadow-cool">
              <span className="text-2xl font-bold text-accent-foreground">⚡</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Real-time Updates</h3>
            <p className="text-muted-foreground">
              Get instant notifications about events, traffic updates, and community happenings as they unfold.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};