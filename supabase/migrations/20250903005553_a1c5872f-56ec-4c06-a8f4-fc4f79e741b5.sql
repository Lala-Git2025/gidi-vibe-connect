-- Insert sample Lagos/Nigerian news data
INSERT INTO public.news_feed (
  title,
  summary,
  content,
  category,
  featured_image_url,
  is_published,
  publish_date,
  tags,
  author_id,
  venue_id
) VALUES 
(
  'Lagos State Government Announces New Transportation Initiative',
  'Governor Sanwo-Olu unveils plans for expanded BRT routes and water transportation to ease traffic congestion across Lagos Island and mainland.',
  'The Lagos State Government has announced a comprehensive transportation initiative aimed at reducing traffic congestion and improving mobility across the state. The new plan includes expanding the Bus Rapid Transit (BRT) system and introducing more water transportation routes.',
  'Infrastructure',
  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
  true,
  now() - interval '2 hours',
  ARRAY['Lagos', 'Transportation', 'Government', 'BRT'],
  null,
  null
),
(
  'New Entertainment District Opens in Victoria Island',
  'A world-class entertainment complex featuring restaurants, bars, and live music venues officially opens to the public this weekend.',
  'Victoria Island welcomes its newest entertainment destination with the grand opening of Harbor Point Entertainment District. The complex features over 20 restaurants, bars, and live entertainment venues.',
  'Entertainment',
  'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800',
  true,
  now() - interval '5 hours',
  ARRAY['Lagos', 'Entertainment', 'Victoria Island', 'Nightlife'],
  null,
  null
),
(
  'Lagos Fashion Week 2024 Showcases Rising Nigerian Designers',
  'Local and international fashion enthusiasts gather in Lagos for the biggest fashion event of the year, highlighting sustainable fashion and African heritage.',
  'Lagos Fashion Week 2024 kicked off with stunning runway shows featuring both established and emerging Nigerian designers. This year''s theme focuses on sustainability and celebrating African heritage through contemporary fashion.',
  'Fashion',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800',
  true,
  now() - interval '8 hours',
  ARRAY['Lagos', 'Fashion', 'Nigerian', 'Designers'],
  null,
  null
),
(
  'Tech Hub Lagos Attracts International Investment',
  'Major international tech companies announce new offices and partnership deals worth over $500 million in Lagos tech ecosystem.',
  'Lagos continues to cement its position as Africa''s tech capital with several major international companies announcing significant investments in the city''s growing tech ecosystem.',
  'Technology',
  'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800',
  true,
  now() - interval '12 hours',
  ARRAY['Lagos', 'Technology', 'Investment', 'Startup'],
  null,
  null
),
(
  'Lagos Food Festival Celebrates Local Cuisine',
  'The annual Lagos Food Festival returns with over 100 local vendors showcasing traditional and fusion Nigerian dishes.',
  'Food lovers across Lagos are gearing up for the annual Lagos Food Festival, featuring everything from traditional jollof rice competitions to innovative fusion cuisine created by local chefs.',
  'Food',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
  true,
  now() - interval '1 day',
  ARRAY['Lagos', 'Food', 'Festival', 'Nigerian Cuisine'],
  null,
  null
),
(
  'Lagos Marathon 2024 Registration Opens',
  'The largest marathon in West Africa opens registration with expected participation of over 50,000 runners from around the world.',
  'Registration is now open for the Lagos Marathon 2024, which has grown to become the largest marathon event in West Africa, attracting international athletes and promoting fitness culture in Nigeria.',
  'Sports',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
  true,
  now() - interval '1 day',
  ARRAY['Lagos', 'Marathon', 'Sports', 'Fitness'],
  null,
  null
);