import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useVenue, useCreateVenue, useUpdateVenue } from '../hooks/useVenues';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface VenueFormData {
  name: string;
  description: string;
  location: string;
  category: string;
  contact_phone: string;
  contact_email: string;
  website_url: string;
  instagram_handle: string;
  price_range: string;
  tags: string;
  amenities: string;
}

const VENUE_CATEGORIES = [
  'Restaurant',
  'Bar',
  'Nightclub',
  'Cafe',
  'Lounge',
  'Hotel',
  'Event Space',
  'Beach Club',
  'Rooftop',
  'Other',
];

const PRICE_RANGES = ['₦', '₦₦', '₦₦₦', '₦₦₦₦'];

export default function VenueForm() {
  const navigate = useNavigate();
  const { venueId } = useParams();
  const isEditing = !!venueId;

  const { data: existingVenue, isLoading: loadingVenue } = useVenue(venueId);
  const createVenue = useCreateVenue();
  const updateVenue = useUpdateVenue();

  const [formData, setFormData] = useState<VenueFormData>({
    name: '',
    description: '',
    location: '',
    category: '',
    contact_phone: '',
    contact_email: '',
    website_url: '',
    instagram_handle: '',
    price_range: '',
    tags: '',
    amenities: '',
  });

  const [errors, setErrors] = useState<Partial<VenueFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing venue data if editing
  useEffect(() => {
    if (existingVenue) {
      setFormData({
        name: existingVenue.name || '',
        description: existingVenue.description || '',
        location: existingVenue.location || '',
        category: existingVenue.category || '',
        contact_phone: existingVenue.contact_phone || '',
        contact_email: existingVenue.contact_email || '',
        website_url: existingVenue.website_url || '',
        instagram_handle: existingVenue.instagram_handle || '',
        price_range: existingVenue.price_range || '',
        tags: existingVenue.tags?.join(', ') || '',
        amenities: existingVenue.amenities?.join(', ') || '',
      });
    }
  }, [existingVenue]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof VenueFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<VenueFormData> = {};

    if (!formData.name.trim()) newErrors.name = 'Venue name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.category) newErrors.category = 'Category is required';

    // Email validation
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }

    // Phone validation (basic)
    if (formData.contact_phone && !/^[\d\s\-\+\(\)]+$/.test(formData.contact_phone)) {
      newErrors.contact_phone = 'Invalid phone number format';
    }

    // URL validation
    if (formData.website_url && !formData.website_url.match(/^https?:\/\/.+/)) {
      newErrors.website_url = 'URL must start with http:// or https://';
    }

    // Instagram handle validation (no @ symbol)
    if (formData.instagram_handle && formData.instagram_handle.includes('@')) {
      newErrors.instagram_handle = 'Enter handle without @ symbol';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const venueData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        category: formData.category,
        contact_phone: formData.contact_phone.trim() || undefined,
        contact_email: formData.contact_email.trim() || undefined,
        website_url: formData.website_url.trim() || undefined,
        instagram_handle: formData.instagram_handle.trim() || undefined,
        price_range: formData.price_range || undefined,
        tags: formData.tags
          ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : undefined,
        amenities: formData.amenities
          ? formData.amenities.split(',').map((amenity) => amenity.trim()).filter(Boolean)
          : undefined,
      };

      if (isEditing && venueId) {
        await updateVenue.mutateAsync({ id: venueId, ...venueData });
        alert('Venue updated successfully!');
        navigate(`/venues/${venueId}`);
      } else {
        const newVenue = await createVenue.mutateAsync(venueData);
        alert('Venue created successfully!');
        navigate(`/venues/${newVenue.id}`);
      }
    } catch (error) {
      alert(
        `Failed to ${isEditing ? 'update' : 'create'} venue: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingVenue && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/venues')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Venues
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Venue' : 'Create New Venue'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update your venue details' : 'Add a new venue to your business portfolio'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Venue Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Venue Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., The Sunset Lounge"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your venue, ambiance, and what makes it unique..."
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.description ? 'border-destructive' : 'border-input'
                }`}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-2">
                Location <span className="text-destructive">*</span>
              </label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Victoria Island, Lagos"
                className={errors.location ? 'border-destructive' : ''}
              />
              {errors.location && <p className="text-sm text-destructive mt-1">{errors.location}</p>}
            </div>

            {/* Category and Price Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-2">
                  Category <span className="text-destructive">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.category ? 'border-destructive' : 'border-input'
                  }`}
                >
                  <option value="">Select a category</option>
                  {VENUE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-sm text-destructive mt-1">{errors.category}</p>
                )}
              </div>

              <div>
                <label htmlFor="price_range" className="block text-sm font-medium mb-2">
                  Price Range
                </label>
                <select
                  id="price_range"
                  name="price_range"
                  value={formData.price_range}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select price range</option>
                  {PRICE_RANGES.map((range) => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Phone */}
              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium mb-2">
                  Phone Number
                </label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  placeholder="+234 800 000 0000"
                  className={errors.contact_phone ? 'border-destructive' : ''}
                />
                {errors.contact_phone && (
                  <p className="text-sm text-destructive mt-1">{errors.contact_phone}</p>
                )}
              </div>

              {/* Contact Email */}
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  placeholder="contact@venue.com"
                  className={errors.contact_email ? 'border-destructive' : ''}
                />
                {errors.contact_email && (
                  <p className="text-sm text-destructive mt-1">{errors.contact_email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Website */}
              <div>
                <label htmlFor="website_url" className="block text-sm font-medium mb-2">
                  Website
                </label>
                <Input
                  id="website_url"
                  name="website_url"
                  value={formData.website_url}
                  onChange={handleChange}
                  placeholder="https://www.venue.com"
                  className={errors.website_url ? 'border-destructive' : ''}
                />
                {errors.website_url && (
                  <p className="text-sm text-destructive mt-1">{errors.website_url}</p>
                )}
              </div>

              {/* Instagram */}
              <div>
                <label htmlFor="instagram_handle" className="block text-sm font-medium mb-2">
                  Instagram Handle
                </label>
                <Input
                  id="instagram_handle"
                  name="instagram_handle"
                  value={formData.instagram_handle}
                  onChange={handleChange}
                  placeholder="venue_name (without @)"
                  className={errors.instagram_handle ? 'border-destructive' : ''}
                />
                {errors.instagram_handle && (
                  <p className="text-sm text-destructive mt-1">{errors.instagram_handle}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium mb-2">
                Tags
              </label>
              <Input
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g., Live Music, Happy Hour, Rooftop (comma-separated)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate tags with commas
              </p>
            </div>

            {/* Amenities */}
            <div>
              <label htmlFor="amenities" className="block text-sm font-medium mb-2">
                Amenities
              </label>
              <Input
                id="amenities"
                name="amenities"
                value={formData.amenities}
                onChange={handleChange}
                placeholder="e.g., WiFi, Parking, Outdoor Seating (comma-separated)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate amenities with commas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/venues')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Venue' : 'Create Venue'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
