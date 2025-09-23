-- Clear all existing venues with Unsplash photos
DELETE FROM venues WHERE professional_media_urls::text LIKE '%unsplash%';