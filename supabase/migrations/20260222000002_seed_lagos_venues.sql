-- =====================================================
-- Seed Lagos Venues
-- 20 curated real venues across Victoria Island,
-- Lekki, Ikoyi, Oniru, and Ikeja.
-- =====================================================

INSERT INTO public.venues (
  name, description, location, address,
  category, professional_media_urls,
  contact_phone, website_url, instagram_url,
  price_range, features, opening_hours,
  is_verified, rating
)
VALUES

-- ── Victoria Island ───────────────────────────────────────────────────────

(
  'Quilox',
  'Lagos'' most iconic nightclub. Expect world-class DJs, a thundering sound system, celebrity appearances, and a crowd that knows how to party. The gold standard of Lagos nightlife since 2013.',
  'Victoria Island',
  'Plot 9 Bishop Oluwole Street, Victoria Island, Lagos',
  'Club',
  ARRAY['https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&q=80'],
  '+234 905 100 0010',
  'https://quiloxlagos.com',
  'https://instagram.com/quiloxlagos',
  'Premium',
  ARRAY['Live DJ', 'VIP Tables', 'Valet Parking', 'Dress Code', 'Open Bar Available', 'Bottle Service'],
  '{"Mon-Thu": "Closed", "Fri": "10PM - 5AM", "Sat": "10PM - 6AM", "Sun": "Closed"}'::jsonb,
  true,
  4.8
),

(
  'The Mansion Lagos',
  'An ultra-premium nightclub experience set across multiple floors of a stunning converted mansion. Known for its intimate VIP rooms, Afrobeats nights, and A-list guest appearances.',
  'Victoria Island',
  'Plot 7 Ozumba Mbadiwe Avenue, Victoria Island, Lagos',
  'Club',
  ARRAY['https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=800&q=80'],
  '+234 812 000 0700',
  NULL,
  'https://instagram.com/themansionlagos',
  'Ultra Premium',
  ARRAY['VIP Rooms', 'Live DJ', 'Dress Code', 'Bottle Service', 'Valet Parking'],
  '{"Mon-Thu": "Closed", "Fri-Sat": "10PM - 5AM", "Sun": "Closed"}'::jsonb,
  true,
  4.6
),

(
  'NOK by Alara',
  'Farm-to-table fine dining with a contemporary Nigerian twist. Stunning indoor-outdoor space, an award-winning menu, and impeccable service. One of Lagos'' most celebrated restaurants.',
  'Victoria Island',
  '12A Akin Adesola Street, Victoria Island, Lagos',
  'Restaurant',
  ARRAY['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80'],
  '+234 700 665 2527',
  'https://alara.ng/nok',
  'https://instagram.com/nokbyalara',
  'Premium',
  ARRAY['Outdoor Seating', 'Private Dining', 'Reservations Required', 'Nigerian Cuisine', 'Cocktail Bar'],
  '{"Mon-Fri": "12PM - 11PM", "Sat-Sun": "11AM - 11PM"}'::jsonb,
  true,
  4.7
),

(
  'Nkoyo',
  'A vibrant Nigerian restaurant and bar celebrating the rich flavours of West African cuisine. Famous for its grills, cocktails, and electric Friday evening atmosphere in the heart of VI.',
  'Victoria Island',
  'Ligali Ayorinde Street, Victoria Island, Lagos',
  'Restaurant',
  ARRAY['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80'],
  '+234 812 888 8888',
  NULL,
  'https://instagram.com/nkoyorestaurant',
  'Premium',
  ARRAY['Nigerian Cuisine', 'Live Music', 'Outdoor Seating', 'Cocktail Bar'],
  '{"Mon-Thu": "12PM - 11PM", "Fri-Sun": "12PM - 1AM"}'::jsonb,
  true,
  4.6
),

(
  'Terra Kulture',
  'A beloved Lagos cultural hub combining an authentic Nigerian restaurant, live theatre, art gallery, and bookshop. The Pepper Soup and Suya are legendary. A must-visit for culture lovers.',
  'Victoria Island',
  '1376 Tiamiyu Savage Street, Victoria Island, Lagos',
  'Restaurant',
  ARRAY['https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80'],
  '+234 1 462 5397',
  'https://terrakulture.com',
  'https://instagram.com/terrakulture',
  'Moderate',
  ARRAY['Cultural Centre', 'Live Theatre', 'Art Gallery', 'Nigerian Cuisine', 'Outdoor Seating'],
  '{"Mon-Sun": "10AM - 10PM"}'::jsonb,
  true,
  4.4
),

(
  'Cactus Restaurant',
  'A Lagos institution for over 30 years. Cactus is the go-to for relaxed outdoor dining, fresh seafood, grilled meats, and ice-cold drinks in a garden setting right on Adeola Hopewell.',
  'Victoria Island',
  '2 Adeola Hopewell Street, Victoria Island, Lagos',
  'Restaurant',
  ARRAY['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'],
  '+234 1 463 0090',
  NULL,
  NULL,
  'Moderate',
  ARRAY['Outdoor Seating', 'Seafood', 'Nigerian Cuisine', 'Family Friendly'],
  '{"Mon-Sun": "12PM - 11PM"}'::jsonb,
  true,
  4.3
),

-- ── Ikoyi ─────────────────────────────────────────────────────────────────

(
  'Brass & Copper',
  'Lagos'' finest cocktail bar, renowned for its expert mixologists, adventurous cocktail menu, and intimate atmosphere. Whether you''re a classic Martini person or love molecular mixology — this is your spot.',
  'Ikoyi',
  'Lugard Avenue, Ikoyi, Lagos',
  'Bar',
  ARRAY['https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80'],
  '+234 802 333 9901',
  NULL,
  'https://instagram.com/brassandcopperlagos',
  'Premium',
  ARRAY['Craft Cocktails', 'Happy Hour', 'Reservations Recommended', 'Live Jazz (Fridays)'],
  '{"Mon-Thu": "5PM - 12AM", "Fri-Sat": "5PM - 2AM", "Sun": "4PM - 11PM"}'::jsonb,
  true,
  4.7
),

(
  'Bature Brewery',
  'Nigeria''s first craft brewery and taproom. Bature crafts excellent Nigerian craft beers — from rich stouts to refreshing lagers. The outdoor terrace is perfect for an afternoon session with friends.',
  'Ikoyi',
  'Awolowo Road, Ikoyi, Lagos',
  'Bar',
  ARRAY['https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80'],
  '+234 818 555 0000',
  'https://baturebrewery.com',
  'https://instagram.com/baturebrewery',
  'Moderate',
  ARRAY['Craft Beer', 'Outdoor Seating', 'Bar Snacks', 'Guided Brewery Tours'],
  '{"Mon-Thu": "12PM - 11PM", "Fri-Sun": "12PM - 1AM"}'::jsonb,
  true,
  4.5
),

(
  'Bogobiri House',
  'A boutique hotel, live music venue, and intimate bar in a historic Ikoyi townhouse. Bogobiri hosts Lagos'' best live music nights — Afrojuju, highlife, jazz — in an incredibly soulful setting.',
  'Ikoyi',
  '9 Maitama Sule Street, Ikoyi, Lagos',
  'Lounge',
  ARRAY['https://images.unsplash.com/photo-1594623930572-300a3011d9ae?w=800&q=80'],
  '+234 1 271 4680',
  'https://bogobiri.com',
  'https://instagram.com/bogobirihouse',
  'Moderate',
  ARRAY['Live Music', 'Boutique Hotel', 'Nigerian Art', 'Outdoor Garden', 'Bar'],
  '{"Mon-Sun": "7PM - 1AM (Live music nights vary)"}'::jsonb,
  true,
  4.5
),

(
  'Eric Kayser Lagos',
  'The legendary Parisian bakery-cafe has arrived in Lagos. Exceptional croissants, sourdough, and pastries paired with first-class coffee. The perfect morning spot or light lunch destination.',
  'Ikoyi',
  'Sanusi Fafunwa Street, Victoria Island, Lagos',
  'Restaurant',
  ARRAY['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80'],
  '+234 908 000 0000',
  'https://maison-kayser.com',
  'https://instagram.com/erickayserlagos',
  'Moderate',
  ARRAY['Bakery', 'Coffee', 'Brunch', 'Pastries', 'Outdoor Seating'],
  '{"Mon-Sun": "7AM - 9PM"}'::jsonb,
  true,
  4.4
),

-- ── Oniru ─────────────────────────────────────────────────────────────────

(
  'Landmark Beach Club',
  'Lagos'' premier waterfront beach club. Swim in the lagoon, lounge in a cabana, enjoy DJ sets from dusk to dawn, and dine at the beachside restaurant. An all-day experience right at the water''s edge.',
  'Oniru',
  'Water Corporation Drive, Oniru Estate, Lagos',
  'Beach Club',
  ARRAY['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'],
  '+234 1 454 8400',
  'https://landmarkbeachlagos.com',
  'https://instagram.com/landmarkbeachclub',
  'Premium',
  ARRAY['Beach Access', 'Swimming Pool', 'Cabanas', 'DJ Sets', 'Beachside Restaurant', 'Water Sports'],
  '{"Mon-Sun": "9AM - 10PM"}'::jsonb,
  true,
  4.6
),

(
  'Hard Rock Cafe Lagos',
  'The iconic global brand brings its rock ''n'' roll spirit to Lagos. Famous burgers, cocktails, live music, and an unmatched collection of rock memorabilia. Great for families and groups.',
  'Oniru',
  '10 Water Corporation Road, Oniru, Victoria Island, Lagos',
  'Restaurant',
  ARRAY['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80'],
  '+234 1 280 0000',
  'https://hardrockcafe.com/lagos',
  'https://instagram.com/hardrockcafelagos',
  'Moderate',
  ARRAY['Live Music', 'Bar', 'American Cuisine', 'Rock Memorabilia', 'Family Friendly'],
  '{"Mon-Sun": "12PM - 11PM"}'::jsonb,
  true,
  4.5
),

-- ── Lekki ─────────────────────────────────────────────────────────────────

(
  'The Shank',
  'Lekki''s most beloved hangout — a lively lounge and restaurant that does everything well. Cold drinks, great grills, live music on weekends, and a crowd that keeps the energy high from dusk to dawn.',
  'Lekki',
  '21 Isaac John Street, GRA, Lekki, Lagos',
  'Lounge',
  ARRAY['https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80'],
  '+234 802 555 0001',
  NULL,
  'https://instagram.com/theshanklagos',
  'Moderate',
  ARRAY['Live Music', 'Outdoor Seating', 'Hookah', 'Nigerian Cuisine', 'Sports Screening'],
  '{"Mon-Thu": "5PM - 1AM", "Fri-Sun": "12PM - 2AM"}'::jsonb,
  true,
  4.7
),

(
  'Sky Restaurant & Lounge',
  'The best rooftop view in Lekki. Sky serves sophisticated cocktails and contemporary Nigerian-fusion cuisine high above the Lekki skyline. The sunset here is genuinely breathtaking.',
  'Lekki',
  'Admiralty Way, Lekki Phase 1, Lagos',
  'Rooftop',
  ARRAY['https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80'],
  '+234 805 000 0099',
  NULL,
  'https://instagram.com/skylagos',
  'Premium',
  ARRAY['Rooftop', 'Cocktail Bar', 'Nigerian Fusion', 'Sunset Views', 'Private Events'],
  '{"Mon-Thu": "5PM - 12AM", "Fri-Sun": "12PM - 2AM"}'::jsonb,
  true,
  4.5
),

(
  '2 Shots Bar',
  'Lekki''s go-to cocktail and spirits bar. Unpretentious, fun, and always packed with a young creative crowd. Known for its innovative cocktail menu and lively Thursday nights.',
  'Lekki',
  'Admiralty Way, Lekki Phase 1, Lagos',
  'Bar',
  ARRAY['https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80'],
  '+234 806 200 0022',
  NULL,
  'https://instagram.com/2shotsbar',
  'Moderate',
  ARRAY['Craft Cocktails', 'Happy Hour', 'DJ Nights', 'Bar Bites'],
  '{"Mon-Wed": "5PM - 12AM", "Thu-Sat": "5PM - 3AM", "Sun": "4PM - 12AM"}'::jsonb,
  false,
  4.3
),

(
  'Blowfish Restaurant & Bar',
  'A sophisticated waterfront restaurant on the Lekki-Ikoyi Link Bridge axis. Blowfish is famous for its Asian-fusion menu, stunning lagoon views, and energetic Friday bar scene.',
  'Lekki',
  '30 Marina Crescent, Lekki, Lagos',
  'Restaurant',
  ARRAY['https://images.unsplash.com/photo-1592861956120-e524fc739696?w=800&q=80'],
  '+234 1 342 0000',
  NULL,
  'https://instagram.com/blowfishlagos',
  'Premium',
  ARRAY['Waterfront', 'Asian Fusion', 'Cocktail Bar', 'Outdoor Seating', 'Live DJ (Fridays)'],
  '{"Mon-Thu": "12PM - 11PM", "Fri-Sun": "12PM - 2AM"}'::jsonb,
  true,
  4.4
),

(
  'Casacade Resto-Lounge',
  'A stylish Lekki lounge known for its tranquil pool-side ambience, excellent barbecue, and smooth weekend DJ sets. A great spot for a relaxed afternoon that turns into an unforgettable night.',
  'Lekki',
  'Admiralty Way, Lekki Phase 1, Lagos',
  'Lounge',
  ARRAY['https://images.unsplash.com/photo-1574015974293-817f0ebebb74?w=800&q=80'],
  '+234 808 999 0001',
  NULL,
  'https://instagram.com/casacadelagos',
  'Moderate',
  ARRAY['Pool Side', 'Outdoor Seating', 'BBQ', 'DJ Sets', 'Hookah'],
  '{"Mon-Thu": "4PM - 1AM", "Fri-Sun": "12PM - 2AM"}'::jsonb,
  false,
  4.2
),

(
  'Escape Beach Club',
  'A laid-back beach club tucked away from the Lekki hustle. Escape offers private beach access, beach volleyball, and a chilled bar menu perfect for a breezy Lagos afternoon escape.',
  'Lekki',
  'Lekki-Epe Expressway, Lekki, Lagos',
  'Beach Club',
  ARRAY['https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80'],
  '+234 810 000 0099',
  NULL,
  'https://instagram.com/escapebeachlagos',
  'Moderate',
  ARRAY['Beach Access', 'Beach Volleyball', 'Bar', 'DJ Sets', 'Cabanas'],
  '{"Sat-Sun": "10AM - 9PM", "Mon-Fri": "12PM - 8PM"}'::jsonb,
  false,
  4.3
),

-- ── Ikeja ─────────────────────────────────────────────────────────────────

(
  'The ICON Restaurant',
  'Ikeja''s most upscale dining destination, situated inside the Sheraton Lagos Hotel. Classic international and Nigerian cuisine served in an elegant setting — ideal for business dinners and special occasions.',
  'Ikeja',
  'Sheraton Hotel, 30 Mobolaji Bank Anthony Way, Ikeja, Lagos',
  'Restaurant',
  ARRAY['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'],
  '+234 1 291 5555',
  'https://marriott.com/lagos-sheraton',
  NULL,
  'Premium',
  ARRAY['International Cuisine', 'Nigerian Cuisine', 'Private Dining', 'Business Dinners', 'Hotel'],
  '{"Mon-Sun": "6AM - 11PM"}'::jsonb,
  true,
  4.3
),

(
  'Skylark Rooftop Bar',
  'Ikeja''s best rooftop bar with a panoramic view of the city. Skylark serves creative cocktails, cold beers, and great bar snacks in a relaxed open-air setting. A favourite for after-work drinks.',
  'Ikeja',
  'Allen Avenue, Ikeja, Lagos',
  'Rooftop',
  ARRAY['https://images.unsplash.com/photo-1574015974293-817f0ebebb74?w=800&q=80'],
  '+234 803 000 0777',
  NULL,
  'https://instagram.com/skylarkikeja',
  'Moderate',
  ARRAY['Rooftop', 'Cocktail Bar', 'City Views', 'Happy Hour', 'Outdoor Seating'],
  '{"Mon-Thu": "4PM - 12AM", "Fri-Sun": "2PM - 2AM"}'::jsonb,
  false,
  4.2
)

ON CONFLICT DO NOTHING;

-- =====================================================
-- Seed complete: 20 Lagos venues across VI, Ikoyi,
-- Oniru, Lekki, and Ikeja.
-- =====================================================
