import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react';
import { useEvent, useCreateEvent, useUpdateEvent, useUploadEventImage } from '../hooks/useEvents';
import { useVenues } from '../hooks/useVenues';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface EventFormData {
  title: string;
  description: string;
  venue_name: string;
  location: string;
  start_date: string;
  end_date: string;
  category: string;
  price_info: string;
  registration_url: string;
  contact_email: string;
  contact_phone: string;
  tags: string;
  is_published: boolean;
}

const EVENT_CATEGORIES = [
  'Concert',
  'Festival',
  'Nightlife',
  'Food & Drink',
  'Art & Culture',
  'Sports',
  'Networking',
  'Workshop',
  'Comedy',
  'Other',
];

export default function EventForm() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isEditing = !!eventId;

  const { data: existingEvent, isLoading: loadingEvent } = useEvent(eventId);
  const { data: venues } = useVenues();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const uploadImage = useUploadEventImage();

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    venue_name: '',
    location: '',
    start_date: '',
    end_date: '',
    category: '',
    price_info: '',
    registration_url: '',
    contact_email: '',
    contact_phone: '',
    tags: '',
    is_published: false,
  });

  const [errors, setErrors] = useState<Partial<EventFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing event data if editing
  useEffect(() => {
    if (existingEvent) {
      setFormData({
        title: existingEvent.title || '',
        description: existingEvent.description || '',
        venue_name: existingEvent.venue_name || '',
        location: existingEvent.location || '',
        start_date: existingEvent.start_date?.split('T')[0] || '',
        end_date: existingEvent.end_date?.split('T')[0] || '',
        category: existingEvent.category || '',
        price_info: existingEvent.price_info || '',
        registration_url: existingEvent.registration_url || '',
        contact_email: existingEvent.contact_email || '',
        contact_phone: existingEvent.contact_phone || '',
        tags: existingEvent.tags?.join(', ') || '',
        is_published: existingEvent.is_published ?? false,
      });

      if (existingEvent.featured_image_url) {
        setPreviewImage(existingEvent.featured_image_url);
      }
    }
  }, [existingEvent]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name as keyof EventFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleVenueSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const venueId = e.target.value;
    const selectedVenue = venues?.find((v) => v.id === venueId);

    if (selectedVenue) {
      setFormData((prev) => ({
        ...prev,
        venue_name: selectedVenue.name,
        location: selectedVenue.location,
      }));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<EventFormData> = {};

    if (!formData.title.trim()) newErrors.title = 'Event title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.venue_name.trim()) newErrors.venue_name = 'Venue is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (!formData.category) newErrors.category = 'Category is required';

    // Date validation
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    // Email validation
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }

    // URL validation
    if (formData.registration_url && !formData.registration_url.match(/^https?:\/\/.+/)) {
      newErrors.registration_url = 'URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        venue_name: formData.venue_name.trim(),
        location: formData.location.trim(),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        category: formData.category,
        price_info: formData.price_info.trim() || undefined,
        registration_url: formData.registration_url.trim() || undefined,
        contact_email: formData.contact_email.trim() || undefined,
        contact_phone: formData.contact_phone.trim() || undefined,
        tags: formData.tags
          ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : undefined,
        is_published: formData.is_published,
      };

      let savedEvent;

      if (isEditing && eventId) {
        savedEvent = await updateEvent.mutateAsync({ id: eventId, ...eventData });
      } else {
        savedEvent = await createEvent.mutateAsync(eventData);
      }

      // Upload image if selected
      if (imageFile && savedEvent) {
        await uploadImage.mutateAsync({ eventId: savedEvent.id, file: imageFile });
      }

      alert(`Event ${isEditing ? 'updated' : 'created'} successfully!`);
      navigate('/events');
    } catch (error) {
      alert(
        `Failed to ${isEditing ? 'update' : 'create'} event: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingEvent && isEditing) {
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
        <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update your event details' : 'Add a new event to showcase'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Event Image */}
        <Card>
          <CardHeader>
            <CardTitle>Event Image</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {previewImage ? (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={previewImage}
                  alt="Event preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-2 rounded-full hover:bg-destructive/90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:bg-muted transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload event image</p>
                <p className="text-xs text-muted-foreground mt-1">Max size: 5MB</p>
              </button>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Event Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Event Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Summer Music Festival 2024"
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
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
                placeholder="Describe the event, what to expect, and what makes it special..."
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.description ? 'border-destructive' : 'border-input'
                }`}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description}</p>
              )}
            </div>

            {/* Category */}
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
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-sm text-destructive mt-1">{errors.category}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Location & Venue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Venue Selection */}
            {venues && venues.length > 0 && (
              <div>
                <label htmlFor="venue_select" className="block text-sm font-medium mb-2">
                  Select from Your Venues (Optional)
                </label>
                <select
                  id="venue_select"
                  onChange={handleVenueSelect}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose a venue or enter manually</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name} - {venue.location}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Venue Name */}
            <div>
              <label htmlFor="venue_name" className="block text-sm font-medium mb-2">
                Venue Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="venue_name"
                name="venue_name"
                value={formData.venue_name}
                onChange={handleChange}
                placeholder="e.g., The Sunset Lounge"
                className={errors.venue_name ? 'border-destructive' : ''}
              />
              {errors.venue_name && (
                <p className="text-sm text-destructive mt-1">{errors.venue_name}</p>
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
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Date & Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium mb-2">
                  Start Date <span className="text-destructive">*</span>
                </label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={errors.start_date ? 'border-destructive' : ''}
                />
                {errors.start_date && (
                  <p className="text-sm text-destructive mt-1">{errors.start_date}</p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label htmlFor="end_date" className="block text-sm font-medium mb-2">
                  End Date <span className="text-destructive">*</span>
                </label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                  min={formData.start_date}
                  className={errors.end_date ? 'border-destructive' : ''}
                />
                {errors.end_date && <p className="text-sm text-destructive mt-1">{errors.end_date}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price Info */}
            <div>
              <label htmlFor="price_info" className="block text-sm font-medium mb-2">
                Price Information
              </label>
              <Input
                id="price_info"
                name="price_info"
                value={formData.price_info}
                onChange={handleChange}
                placeholder="e.g., Free, ₦5,000, ₦5,000 - ₦10,000"
              />
            </div>

            {/* Registration URL */}
            <div>
              <label htmlFor="registration_url" className="block text-sm font-medium mb-2">
                Registration/Ticket URL
              </label>
              <Input
                id="registration_url"
                name="registration_url"
                value={formData.registration_url}
                onChange={handleChange}
                placeholder="https://tickets.example.com/event"
                className={errors.registration_url ? 'border-destructive' : ''}
              />
              {errors.registration_url && (
                <p className="text-sm text-destructive mt-1">{errors.registration_url}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Email */}
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium mb-2">
                  Contact Email
                </label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  placeholder="contact@event.com"
                  className={errors.contact_email ? 'border-destructive' : ''}
                />
                {errors.contact_email && (
                  <p className="text-sm text-destructive mt-1">{errors.contact_email}</p>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium mb-2">
                  Contact Phone
                </label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>

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
                placeholder="e.g., Music, Outdoor, Family-Friendly (comma-separated)"
              />
              <p className="text-xs text-muted-foreground mt-1">Separate tags with commas</p>
            </div>

            {/* Published Status */}
            <div className="flex items-center space-x-2">
              <input
                id="is_published"
                name="is_published"
                type="checkbox"
                checked={formData.is_published}
                onChange={handleChange}
                className="rounded border-input"
              />
              <label htmlFor="is_published" className="text-sm font-medium cursor-pointer">
                Publish event (make it visible to the public)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/events')}>
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
                {isEditing ? 'Update Event' : 'Create Event'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
