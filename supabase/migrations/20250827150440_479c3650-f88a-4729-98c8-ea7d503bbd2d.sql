-- Insert sample venues for demonstration
INSERT INTO public.venues (
  id,
  name,
  description,
  location,
  address,
  category,
  rating,
  price_range,
  features,
  contact_phone,
  contact_email,
  website_url,
  instagram_url,
  professional_media_urls,
  is_verified,
  opening_hours,
  latitude,
  longitude
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'BORDELLE CITY',
  'An upscale nightclub in the heart of Lagos with world-class DJs, premium bottle service, and a sophisticated atmosphere. Experience the pinnacle of Lagos nightlife with our rooftop views and exclusive VIP areas.',
  'Victoria Island, Lagos',
  '123 Anywhere Street, Victoria Island, Lagos',
  'Club',
  4.8,
  '₦₦₦₦',
  ARRAY['VIP Areas', 'Rooftop Terrace', 'Premium Sound System', 'Bottle Service', 'Security', 'Valet Parking', 'Air Conditioning', 'Private Events'],
  '+234-901-234-5678',
  'info@bordellecity.com',
  'https://bordellecity.com',
  'https://instagram.com/bordellecity',
  ARRAY[
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=800',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800'
  ],
  true,
  '{
    "monday": "Closed",
    "tuesday": "Closed", 
    "wednesday": "9:00 PM - 4:00 AM",
    "thursday": "9:00 PM - 4:00 AM",
    "friday": "9:00 PM - 6:00 AM",
    "saturday": "9:00 PM - 6:00 AM",
    "sunday": "8:00 PM - 3:00 AM"
  }'::jsonb,
  6.4281,
  3.4106
),
(
  '22222222-2222-2222-2222-222222222222',
  'FLAVOUR HOUSE',
  'A premium restaurant and lounge offering authentic Nigerian cuisine with a modern twist. Perfect for intimate dinners, business meetings, or casual hangouts with friends. Live music on weekends.',
  'Lekki Phase 1, Lagos',
  '456 Admiralty Road, Lekki Phase 1, Lagos',
  'Restaurant',
  4.6,
  '₦₦₦',
  ARRAY['Live Music', 'Outdoor Seating', 'Private Dining', 'Bar', 'WiFi', 'Parking', 'Delivery', 'Takeaway'],
  '+234-902-345-6789',
  'reservations@flavourhouse.ng',
  'https://flavourhouse.ng',
  'https://instagram.com/flavourhouseng',
  ARRAY[
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=800',
    'https://images.unsplash.com/photo-1515669097368-22e68403d1ba?w=800',
    'https://images.unsplash.com/photo-1559329007-40df8e813b19?w=800'
  ],
  true,
  '{
    "monday": "12:00 PM - 11:00 PM",
    "tuesday": "12:00 PM - 11:00 PM",
    "wednesday": "12:00 PM - 11:00 PM", 
    "thursday": "12:00 PM - 11:00 PM",
    "friday": "12:00 PM - 12:00 AM",
    "saturday": "11:00 AM - 12:00 AM",
    "sunday": "11:00 AM - 10:00 PM"
  }'::jsonb,
  6.4281,
  3.4219
);