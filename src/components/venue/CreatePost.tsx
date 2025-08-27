import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, MapPin, Hash, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreatePostProps {
  venueId: string;
  venueName: string;
}

export const CreatePost = ({ venueId, venueName }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [currentTag, setCurrentTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPostMutation = useMutation({
    mutationFn: async (postData: {
      content: string;
      location?: string;
      tags?: string[];
      venue_id: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a post");
      }

      const { data, error } = await supabase
        .from("social_posts")
        .insert({
          content: postData.content,
          location: postData.location || null,
          tags: postData.tags || null,
          venue_id: postData.venue_id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Post created",
        description: "Your post has been shared successfully!",
      });
      
      // Reset form
      setContent("");
      setLocation("");
      setTags([]);
      setCurrentTag("");
      setIsExpanded(false);
      
      // Refresh the social feed
      queryClient.invalidateQueries({ queryKey: ["venue-posts", venueId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating post",
        description: error.message || "Failed to create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please write something before posting.",
        variant: "destructive",
      });
      return;
    }

    createPostMutation.mutate({
      content: content.trim(),
      location: location.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      venue_id: venueId,
    });
  };

  const addTag = () => {
    const tag = currentTag.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Share your experience at {venueName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main content */}
          <Textarea
            placeholder="What's happening at this venue? Share your experience..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            className="min-h-[100px] resize-none"
          />

          {/* Expanded options */}
          {isExpanded && (
            <div className="space-y-4 border-t pt-4">
              {/* Location */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location (optional)
                </label>
                <Input
                  placeholder="Specific area or landmark..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Tags (optional)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    disabled={tags.length >= 5}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTag}
                    disabled={!currentTag.trim() || tags.length >= 5}
                  >
                    Add
                  </Button>
                </div>
                
                {/* Display tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {content.length}/500 characters
            </div>
            <div className="flex gap-2">
              {isExpanded && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsExpanded(false);
                    setLocation("");
                    setTags([]);
                    setCurrentTag("");
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={!content.trim() || createPostMutation.isPending || content.length > 500}
                className="min-w-[100px]"
              >
                {createPostMutation.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};