import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Upload,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useVenue, useUploadVenuePhoto, useDeleteVenuePhoto } from '../hooks/useVenues';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function VenueDetails() {
  const navigate = useNavigate();
  const { venueId } = useParams();
  const { subscription } = useBusinessAuth();
  const { data: venue, isLoading, error } = useVenue(venueId);
  const uploadPhoto = useUploadVenuePhoto();
  const deletePhoto = useDeleteVenuePhoto();

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhotoUrl, setDeletingPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Venue Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'This venue does not exist or you do not have access to it.'}
          </p>
          <Button onClick={() => navigate('/venues')}>Back to Venues</Button>
        </div>
      </div>
    );
  }

  const currentPhotoCount = venue.professional_media_urls?.length || 0;
  const maxPhotos = subscription?.max_photos_per_venue || 10;
  const canUploadMore = currentPhotoCount < maxPhotos;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !venueId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      await uploadPhoto.mutateAsync({ venueId, file });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert(
        `Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async (photoUrl: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setDeletingPhotoUrl(photoUrl);
    try {
      await deletePhoto.mutateAsync({ venueId: venueId!, photoUrl });
    } catch (error) {
      alert(
        `Failed to delete photo: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setDeletingPhotoUrl(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/venues')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{venue.name}</h1>
            <p className="text-muted-foreground mt-1">{venue.location}</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/venues/${venueId}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Details
        </Button>
      </div>

      {/* Venue Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Venue Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
              <p className="text-sm">{venue.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Category</h3>
                <p className="text-sm">{venue.category}</p>
              </div>
              {venue.price_range && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Price Range</h3>
                  <p className="text-sm">{venue.price_range}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Location</h3>
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                {venue.location}
              </div>
            </div>

            {venue.tags && venue.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {venue.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-muted px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {venue.amenities && venue.amenities.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Card */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {venue.contact_phone && (
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                <a href={`tel:${venue.contact_phone}`} className="hover:underline">
                  {venue.contact_phone}
                </a>
              </div>
            )}

            {venue.contact_email && (
              <div className="flex items-center text-sm">
                <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                <a href={`mailto:${venue.contact_email}`} className="hover:underline">
                  {venue.contact_email}
                </a>
              </div>
            )}

            {venue.website_url && (
              <div className="flex items-center text-sm">
                <Globe className="h-4 w-4 mr-3 text-muted-foreground" />
                <a
                  href={venue.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center"
                >
                  {venue.website_url}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}

            {venue.instagram_handle && (
              <div className="flex items-center text-sm">
                <Instagram className="h-4 w-4 mr-3 text-muted-foreground" />
                <a
                  href={`https://instagram.com/${venue.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center"
                >
                  @{venue.instagram_handle}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}

            {!venue.contact_phone &&
              !venue.contact_email &&
              !venue.website_url &&
              !venue.instagram_handle && (
                <p className="text-sm text-muted-foreground">No contact information available</p>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Photos Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Photos</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentPhotoCount} of {maxPhotos} photos uploaded
              </p>
            </div>
            {canUploadMore && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  size="sm"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!canUploadMore && subscription?.tier === 'Free' && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
              <p className="text-sm">
                You've reached your photo limit. Upgrade to Premium to upload up to 50 photos per
                venue.
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2 p-0 h-auto"
                  onClick={() => navigate('/subscription')}
                >
                  View Plans
                </Button>
              </p>
            </div>
          )}

          {venue.professional_media_urls && venue.professional_media_urls.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {venue.professional_media_urls.map((url, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={url}
                    alt={`${venue.name} - Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handlePhotoDelete(url)}
                    disabled={deletingPhotoUrl === url}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                  >
                    {deletingPhotoUrl === url ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No photos yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload photos to showcase your venue
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Photo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
