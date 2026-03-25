-- =====================================================
-- Seed Sample Lagos Events
-- Realistic upcoming events in Lagos for demo / launch.
-- All inserted with source='manual' and is_published=true
-- so they appear in the consumer app immediately.
-- =====================================================

INSERT INTO public.events (
  title, short_description, description,
  category, event_type,
  start_date, end_date, timezone,
  venue_name, venue_address, location,
  is_free, ticket_price_min, ticket_price_max, currency,
  ticket_url, organizer_name,
  image_url,
  source, is_active, is_published, is_featured, status
)
VALUES

-- 1. Featured nightlife event
(
  'Lagos Afrobeats Night Vol. 12',
  'The biggest Afrobeats party in Lagos returns — live DJs, open bar, and surprise artists.',
  'Lagos Afrobeats Night is the monthly event that brings together the best DJs and live acts from across Nigeria. Expect a packed dance floor, premium sound, and an experience you won''t forget. Open bar for the first hour for early birds.',
  'Nightlife', 'club night',
  (NOW() + INTERVAL '5 days')::timestamptz,
  (NOW() + INTERVAL '5 days' + INTERVAL '6 hours')::timestamptz,
  'Africa/Lagos',
  'Eko Hotel & Suites', 'Plot 1415 Adetokunbo Ademola St, Victoria Island', 'Victoria Island, Lagos',
  false, 5000, 15000, 'NGN',
  'https://www.nairabox.com/',
  'Lagos Vibes Collective',
  'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&q=80',
  'manual', true, true, true, 'upcoming'
),

-- 2. Food festival
(
  'Lagos Food Festival 2026',
  'Celebrate Lagos cuisine — over 50 food vendors, live cooking demos, and music.',
  'The Lagos Food Festival returns for its 8th edition, celebrating the rich flavours of Nigerian and international cuisine. Over 50 vendors, celebrity chef demonstrations, cocktail masterclasses, and live music. Family-friendly with a dedicated kids'' zone.',
  'Food & Dining', 'festival',
  (NOW() + INTERVAL '10 days')::timestamptz,
  (NOW() + INTERVAL '12 days')::timestamptz,
  'Africa/Lagos',
  'Landmark Beach', 'Water Corporation Drive, Oniru', 'Lekki, Lagos',
  false, 3000, 3000, 'NGN',
  'https://www.nairabox.com/',
  'Lagos Food Fest',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
  'manual', true, true, true, 'upcoming'
),

-- 3. Tech conference
(
  'TechLagos Summit 2026',
  'Nigeria''s premier tech conference — AI, fintech, and the future of African innovation.',
  'TechLagos Summit brings together 2,000+ developers, founders, investors, and policymakers for two days of talks, workshops, and networking. Keynotes from Nigeria''s top tech founders. Topics: AI for Africa, Web3, Fintech, and Startup Growth.',
  'Technology', 'conference',
  (NOW() + INTERVAL '14 days')::timestamptz,
  (NOW() + INTERVAL '15 days')::timestamptz,
  'Africa/Lagos',
  'Eko Convention Centre', 'Plot 1415 Adetokunbo Ademola St, Victoria Island', 'Victoria Island, Lagos',
  false, 10000, 50000, 'NGN',
  'https://www.eventbrite.com/',
  'TechLagos',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
  'manual', true, true, false, 'upcoming'
),

-- 4. Comedy show
(
  'Laugh Out Lagos — Comedy Night',
  'An unforgettable night of stand-up comedy featuring Nigeria''s hottest comedians.',
  'Laugh Out Lagos is back! Featuring headline acts from the Lagos comedy scene, this is the perfect Friday night out. Expect hilarious takes on Nigerian life, politics, and relationships. VIP tables available.',
  'Entertainment', 'comedy',
  (NOW() + INTERVAL '7 days')::timestamptz,
  (NOW() + INTERVAL '7 days' + INTERVAL '4 hours')::timestamptz,
  'Africa/Lagos',
  'Terra Kulture', '1376 Tiamiyu Savage St, Victoria Island', 'Victoria Island, Lagos',
  false, 7500, 20000, 'NGN',
  'https://www.nairabox.com/',
  'LOL Events',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80',
  'manual', true, true, false, 'upcoming'
),

-- 5. Art exhibition (free)
(
  'Naija Art Collective: Open Exhibition',
  'Free contemporary art exhibition showcasing 30 emerging Nigerian artists.',
  'The Naija Art Collective opens its doors for a free two-week exhibition featuring paintings, sculptures, and digital art from 30 emerging artists across Nigeria. Daily guided tours available. All works are for sale.',
  'Arts & Culture', 'exhibition',
  (NOW() + INTERVAL '3 days')::timestamptz,
  (NOW() + INTERVAL '17 days')::timestamptz,
  'Africa/Lagos',
  'Nike Art Gallery', '2 Elegushi Beach Rd, Lekki', 'Lekki, Lagos',
  true, NULL, NULL, 'NGN',
  NULL,
  'Naija Art Collective',
  'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&q=80',
  'manual', true, true, false, 'upcoming'
),

-- 6. Music concert
(
  'Burna Boy & Friends: Live in Lagos',
  'An epic outdoor concert headlined by Grammy winner Burna Boy.',
  'The concert of the year is here. Burna Boy headlines a massive outdoor show at Tafawa Balewa Square with special guests from the Afrobeats scene. This is a standing/seated hybrid show with 10,000 capacity. Book early — last year sold out in 48 hours.',
  'Entertainment', 'concert',
  (NOW() + INTERVAL '21 days')::timestamptz,
  (NOW() + INTERVAL '21 days' + INTERVAL '5 hours')::timestamptz,
  'Africa/Lagos',
  'Tafawa Balewa Square', 'Lagos Island', 'Lagos Island, Lagos',
  false, 15000, 100000, 'NGN',
  'https://www.tix.africa/',
  'Live Nation Nigeria',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  'manual', true, true, true, 'upcoming'
),

-- 7. Fitness event (free)
(
  'Lagos Morning Run — Lekki Beach',
  'Join hundreds of Lagosians for a free 5km beach run every Saturday.',
  'Every Saturday at 6:30 AM, join the Lagos Running Club for a scenic 5km run along Lekki Beach. All fitness levels welcome. Free entry — just show up in your running shoes! Water station and post-run smoothies available.',
  'Entertainment', 'sports',
  (NOW() + INTERVAL '2 days')::timestamptz,
  (NOW() + INTERVAL '2 days' + INTERVAL '2 hours')::timestamptz,
  'Africa/Lagos',
  'Lekki Beach Access Point 1', 'Admiralty Way, Lekki Phase 1', 'Lekki, Lagos',
  true, NULL, NULL, 'NGN',
  NULL,
  'Lagos Running Club',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
  'manual', true, true, false, 'upcoming'
),

-- 8. Networking / business
(
  'Lagos Startup Founders Mixer',
  'Monthly networking night for Lagos startup founders, investors, and operators.',
  'The Founders Mixer is where Lagos''s startup ecosystem meets. Whether you''re looking for co-founders, investors, or just peers — this is the event for you. Past attendees have gone on to raise seed rounds and build partnerships that changed their businesses.',
  'Technology', 'networking',
  (NOW() + INTERVAL '8 days')::timestamptz,
  (NOW() + INTERVAL '8 days' + INTERVAL '3 hours')::timestamptz,
  'Africa/Lagos',
  'Co-Creation Hub (CcHUB)', '294 Herbert Macaulay Way, Yaba', 'Yaba, Lagos',
  false, 2000, 2000, 'NGN',
  'https://www.eventbrite.com/',
  'CcHUB Lagos',
  'https://images.unsplash.com/photo-1515169067868-5387ec356754?w=800&q=80',
  'manual', true, true, false, 'upcoming'
),

-- 9. Pool party
(
  'Sundown Pool Party @ Azul Beach',
  'Lagos''s hottest pool party is back — sunset vibes, DJ sets, and cocktails.',
  'Azul Beach Resort hosts the Sundown Pool Party every last Sunday of the month. Expect deep house and Afrobeats all afternoon, a fully stocked swim-up bar, and the best sunset view in Lagos. Limited capacity — get your tickets before they sell out.',
  'Nightlife', 'party',
  (NOW() + INTERVAL '11 days')::timestamptz,
  (NOW() + INTERVAL '11 days' + INTERVAL '8 hours')::timestamptz,
  'Africa/Lagos',
  'Azul Beach Resort', 'Plot 14, Admiralty Way, Lekki', 'Lekki, Lagos',
  false, 8000, 25000, 'NGN',
  'https://www.nairabox.com/',
  'Azul Events',
  'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
  'manual', true, true, false, 'upcoming'
),

-- 10. Fashion show
(
  'Lagos Fashion Week 2026 — Runway Night',
  'Celebrate Nigeria''s world-class fashion designers on the Lagos Fashion Week runway.',
  'Lagos Fashion Week returns with its signature Runway Night, showcasing collections from Nigeria''s top designers alongside emerging talents. Live performances between shows. Red carpet from 5 PM, runway starts 7 PM.',
  'Arts & Culture', 'fashion',
  (NOW() + INTERVAL '18 days')::timestamptz,
  (NOW() + INTERVAL '18 days' + INTERVAL '6 hours')::timestamptz,
  'Africa/Lagos',
  'Eko Hotel Exhibition Centre', 'Plot 1415 Adetokunbo Ademola St, Victoria Island', 'Victoria Island, Lagos',
  false, 20000, 100000, 'NGN',
  'https://www.tix.africa/',
  'Lagos Fashion Week',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'manual', true, true, false, 'upcoming'
)

ON CONFLICT (source, external_id) DO NOTHING;

-- =====================================================
-- Seed complete: 10 sample Lagos events inserted.
-- =====================================================
