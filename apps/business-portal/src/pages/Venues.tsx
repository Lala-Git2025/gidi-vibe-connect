import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, MapPin, Eye, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useVenues, useDeleteVenue } from '../hooks/useVenues';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Venues() {
  const navigate = useNavigate();
  const { subscription } = useBusinessAuth();
  const { data: venues, isLoading, error } = useVenues();
  const deleteVenue = useDeleteVenue();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateVenue = () => {
    // Check if user has reached venue limit
    const currentCount = venues?.length || 0;
    const maxVenues = subscription?.max_venues || 1;

    if (currentCount >= maxVenues) {
      alert(
        `You've reached your venue limit (${maxVenues} venue${maxVenues > 1 ? 's' : ''}). Upgrade your subscription to add more venues.`
      );
      navigate('/subscription');
      return;
    }

    navigate('/venues/new');
  };

  const handleEdit = (venueId: string) => {
    navigate(`/venues/${venueId}/edit`);
  };

  const handleView = (venueId: string) => {
    navigate(`/venues/${venueId}`);
  };

  const handleDelete = async (venueId: string, venueName: string) => {
    if (!confirm(`Are you sure you want to delete "${venueName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(venueId);
    try {
      await deleteVenue.mutateAsync(venueId);
    } catch (error) {
      alert(`Failed to delete venue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Venues</h2>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const currentCount = venues?.length || 0;
  const maxVenues = subscription?.max_venues || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venues</h1>
          <p className="text-muted-foreground mt-1">
            Manage your venue listings ({currentCount} of {maxVenues} used)
          </p>
        </div>
        <Button onClick={handleCreateVenue} disabled={currentCount >= maxVenues}>
          <Plus className="h-4 w-4 mr-2" />
          Add Venue
        </Button>
      </div>

      {/* Upgrade Banner */}
      {currentCount >= maxVenues && subscription?.tier === 'Free' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Venue Limit Reached</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upgrade to Premium to add up to 3 venues, or Enterprise for unlimited venues.
                </p>
              </div>
              <Button onClick={() => navigate('/subscription')}>
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Venue List */}
      {venues && venues.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Venue Image */}
              <div className="aspect-video bg-muted relative">
                {venue.professional_media_urls && venue.professional_media_urls.length > 0 ? (
                  <img
                    src={venue.professional_media_urls[0]}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {venue.is_verified && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    Verified
                  </div>
                )}
              </div>

              {/* Venue Info */}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{venue.name}</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {venue.location}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-muted px-2 py-1 rounded">{venue.category}</span>
                  {venue.price_range && (
                    <span className="text-xs text-muted-foreground">{venue.price_range}</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {venue.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    <span>Views: -</span>
                  </div>
                  <div className="flex items-center">
                    <Building2 className="h-3 w-3 mr-1" />
                    <span>{venue.professional_media_urls?.length || 0} photos</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleView(venue.id)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(venue.id)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(venue.id, venue.name)}
                    disabled={deletingId === venue.id}
                  >
                    {deletingId === venue.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-destructive"></div>
                    ) : (
                      <Trash2 className="h-3 w-3 text-destructive" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Venues Yet</h2>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first venue listing.
              </p>
              <Button onClick={handleCreateVenue}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Venue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
