import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SocialPostCard } from "@/components/social/SocialPostCard";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare } from "lucide-react";

interface VenueSocialFeedProps {
  venueId: string;
}

interface SocialPost {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  location: string | null;
  tags: string[] | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
  user_id: string;
  venue_id: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const VenueSocialFeed = ({ venueId }: VenueSocialFeedProps) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);

  const { data: initialPosts, isLoading } = useQuery({
    queryKey: ["venue-posts", venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SocialPost[];
    },
  });

  // Set initial posts
  useEffect(() => {
    if (initialPosts) {
      setPosts(initialPosts);
    }
  }, [initialPosts]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("venue-posts-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "social_posts",
          filter: `venue_id=eq.${venueId}`,
        },
        async (payload) => {
          // Fetch the new post with profile data
          const { data: newPost } = await supabase
            .from("social_posts")
            .select(`
              *,
              profiles:user_id (
                full_name,
                avatar_url
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (newPost) {
            setPosts((current) => [newPost as SocialPost, ...current]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "social_posts",
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          setPosts((current) =>
            current.map((post) =>
              post.id === payload.new.id
                ? { ...post, ...payload.new }
                : post
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "social_posts",
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          setPosts((current) =>
            current.filter((post) => post.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Social Feed
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/6"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Social Feed
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{posts.length} {posts.length === 1 ? "post" : "posts"}</span>
        </div>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No posts yet</h3>
            <p className="text-muted-foreground">
              Be the first to share your experience at this venue!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <SocialPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};