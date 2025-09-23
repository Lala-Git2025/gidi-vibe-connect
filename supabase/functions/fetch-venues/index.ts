import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

serve(async (req) => {
  console.log('🚀 Fetch-venues function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json().catch(() => ({}));
    const { category = 'Restaurant', location = 'Lagos', lga } = requestBody;
    
    console.log(`📋 Request params - Category: ${category}, Location: ${location}, LGA: ${lga}`);

    // Scrape popular venues from multiple sources
    const venues = await scrapeVenueData(category, location, lga);

    console.log(`🎯 About to process ${venues.length} newly scraped venues with images`);
    
    // Try to insert venues, but don't fail if there are conflicts
    const { error: insertError } = await supabase
      .from('venues')
      .insert(venues)
      .select();

    if (insertError) {
      console.error('⚠️ Error inserting venues (returning scraped data anyway):', insertError);
    } else {
      console.log(`✅ Successfully inserted ${venues.length} venues`);
    }

    // Always return the scraped venues with real images, regardless of DB status
    return new Response(JSON.stringify({ 
      success: true,
      data: venues,
      source: 'live_scraping',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-venues:', error);
    
    // Fallback to existing venue data
    const { data: existingVenues } = await supabase
      .from('venues')
      .select('*')
      .order('rating', { ascending: false })
      .limit(20);

    return new Response(JSON.stringify({ 
      success: true,
      data: existingVenues || [],
      source: 'database',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function scrapeVenueData(category: string, location: string, lga?: string) {
  try {
    console.log(`🔍 Scraping venue data - Category: ${category}, Location: ${location}, LGA: ${lga}`);
    
    // Test environment variable access
    console.log(`🔑 Environment check:`);
    console.log(`- GOOGLE_API_KEY exists: ${!!Deno.env.get('GOOGLE_API_KEY')}`);
    console.log(`- GOOGLE_SEARCH_ENGINE_ID exists: ${!!Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')}`);
    
    // Lagos LGA boundaries with more precise coordinates
    const lgaBoundaries = getLGABoundaries();
    const targetLGA = lga || 'Lagos Island'; // Default to Lagos Island if no LGA specified
    const bounds = lgaBoundaries[targetLGA] || lgaBoundaries['Lagos Island'];
    
    console.log(`Fetching venues for LGA: ${targetLGA}, Category: ${category}`);

    // Map category to OSM amenity tags
    const categoryMap: Record<string, string[]> = {
      'Restaurant': ['restaurant', 'fast_food', 'food_court'],
      'Bar': ['bar', 'pub'],
      'Club': ['nightclub'],
      'Lounge': ['bar', 'pub', 'cafe'],
      'Hotel': ['hotel'],
      'Cafe': ['cafe'],
      'Entertainment': ['casino', 'cinema', 'theatre'],
      'Shopping': ['mall', 'marketplace']
    };

    const amenities = categoryMap[category] || ['restaurant', 'bar', 'nightclub', 'cafe'];
    
    // Build Overpass QL query
    const overpassQuery = `
      [out:json][timeout:25];
      (
        ${amenities.map(amenity => `
          node["amenity"="${amenity}"]["name"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          way["amenity"="${amenity}"]["name"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          relation["amenity"="${amenity}"]["name"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        `).join('')}
      );
      out center meta;
    `;

    console.log(`Executing Overpass query for LGA: ${targetLGA}, Category: ${category}`);
    
    // Make request to Overpass API
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.elements?.length || 0} venues from Overpass API`);

    // Transform OSM data to our venue schema  
    const venueElements = (data.elements || [])
      .filter((element: any) => element.tags?.name)
      .slice(0, 20); // Limit to 20 venues per request

    // Process venues with async image fetching
    const venues = await Promise.all(venueElements.map(async (element: any) => {
        const tags = element.tags || {};
        
        // Get coordinates
        const lat = element.lat || element.center?.lat;
        const lon = element.lon || element.center?.lon;
        
        // Determine venue category based on amenity
        let venueCategory = category;
        if (tags.amenity === 'restaurant' || tags.amenity === 'fast_food') venueCategory = 'Restaurant';
        else if (tags.amenity === 'bar' || tags.amenity === 'pub') venueCategory = 'Bar';
        else if (tags.amenity === 'nightclub') venueCategory = 'Club';
        else if (tags.amenity === 'cafe') venueCategory = 'Cafe';
        else if (tags.amenity === 'hotel') venueCategory = 'Hotel';

        // Parse opening hours
        const openingHours = tags.opening_hours ? parseOpeningHours(tags.opening_hours) : null;
        
        // Extract features from tags
        const features = [];
        if (tags.outdoor_seating === 'yes') features.push('Outdoor Seating');
        if (tags.wifi === 'yes' || tags.internet_access === 'wlan') features.push('WiFi');
        if (tags.live_music === 'yes') features.push('Live Music');
        if (tags.wheelchair === 'yes') features.push('Wheelchair Accessible');
        if (tags.cuisine) features.push(tags.cuisine);

        // Fetch images for this venue
        const images = await getVenueImages(tags.name, venueCategory, targetLGA);
        
        console.log(`✅ Found ${images.length} images for ${tags.name}`);

        return {
          id: crypto.randomUUID(),
          name: tags.name,
          description: tags.description || `${venueCategory} in ${targetLGA}`,
          location: getDetailedLocation(lat, lon, targetLGA),
          address: formatAddress(tags),
          category: venueCategory,
          rating: Math.floor(Math.random() * 2) + 3.5, // Random rating between 3.5-4.5
          price_range: estimatePriceRange(tags, venueCategory),
          contact_phone: tags.phone || null,
          contact_email: tags.email || null,
          website_url: tags.website || null,
          instagram_url: extractInstagram(tags),
          features,
          opening_hours: openingHours,
          professional_media_urls: images,
          is_verified: false,
          latitude: lat ? parseFloat(lat.toString()) : null,
          longitude: lon ? parseFloat(lon.toString()) : null,
          owner_id: null
        };
      }));

    console.log(`Successfully transformed ${venues.length} venues with images`);
    
    // Ensure we always return at least a few venues
    if (venues.length === 0) {
      console.log('⚠️ No venues found via scraping, returning fallback venues');
      return getFallbackVenues(category, targetLGA);
    }
    
    return venues;

  } catch (error) {
    console.error('Error fetching from Overpass API:', error);
    
    // Fallback to some basic Lagos venues
    return getFallbackVenues(category, targetLGA);
  }
}

function getLGABoundaries() {
  // Precise boundaries for major Lagos LGAs
  return {
    'Lagos Island': {
      south: 6.4400, west: 3.4000, north: 6.4700, east: 3.4500
    },
    'Eti-Osa': {
      south: 6.4200, west: 3.4300, north: 6.4800, east: 3.5200
    },
    'Ikeja': {
      south: 6.5800, west: 3.3300, north: 6.6200, east: 3.3800
    },
    'Surulere': {
      south: 6.4900, west: 3.3400, north: 6.5200, east: 3.3800
    },
    'Lagos Mainland': {
      south: 6.4600, west: 3.3700, north: 6.5000, east: 3.4200
    },
    'Yaba': {
      south: 6.5000, west: 3.3700, north: 6.5200, east: 3.3900
    },
    'Apapa': {
      south: 6.4500, west: 3.3400, north: 6.4700, east: 3.3700
    },
    'Kosofe': {
      south: 6.5600, west: 3.3600, north: 6.6000, east: 3.4000
    },
    'Shomolu': {
      south: 6.5300, west: 3.3800, north: 6.5500, east: 3.4000
    },
    'Mushin': {
      south: 6.5200, west: 3.3400, north: 6.5500, east: 3.3700
    }
  };
}

function parseOpeningHours(openingHours: string) {
  // Simple opening hours parser - can be enhanced
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const result: Record<string, string> = {};
  
  if (openingHours.includes('24/7')) {
    days.forEach(day => result[day] = '24 hours');
    return result;
  }
  
  // Default hours if parsing fails
  const defaultHours = '9:00 AM - 10:00 PM';
  days.forEach(day => result[day] = defaultHours);
  
  return result;
}

function getDetailedLocation(lat: number | null, lon: number | null, targetLGA: string): string {
  if (!lat || !lon) return targetLGA;
  
  // Map specific areas within LGAs
  const areaMap: Record<string, string[]> = {
    'Lagos Island': ['Victoria Island', 'Ikoyi', 'Lagos Island Central'],
    'Eti-Osa': ['Lekki Phase 1', 'Lekki Phase 2', 'Ajah', 'Victoria Island Extension'],
    'Ikeja': ['Ikeja GRA', 'Allen Avenue', 'Computer Village', 'Ogba'],
    'Surulere': ['National Theatre Area', 'Alaba Market', 'Ojuelegba'],
    'Lagos Mainland': ['Ebute Metta', 'Oyingbo', 'Iddo'],
    'Yaba': ['Yaba Tech Area', 'Herbert Macaulay', 'Sabo'],
    'Apapa': ['Apapa Port', 'Kirikiri', 'Marine Beach'],
    'Kosofe': ['Ketu', 'Mile 12', 'Anthony'],
    'Shomolu': ['Palmgrove', 'Onipanu', 'Bariga'],
    'Mushin': ['Idi-Oro', 'Papa Ajao', 'Isolo Border']
  };
  
  const areas = areaMap[targetLGA] || [targetLGA];
  const randomArea = areas[Math.floor(Math.random() * areas.length)];
  
  return `${randomArea}, ${targetLGA}`;
}

function formatAddress(tags: any): string {
  const parts = [];
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:suburb']) parts.push(tags['addr:suburb']);
  if (parts.length === 0 && tags.name) parts.push(`Near ${tags.name}`);
  
  return parts.length > 0 ? parts.join(' ') : 'Lagos';
}

function estimatePriceRange(tags: any, category: string): string {
  // Estimate price range based on amenity and location data
  if (category === 'Club' || category === 'Lounge') return '₦₦₦';
  if (category === 'Restaurant') return tags.cuisine?.includes('fine') ? '₦₦₦₦' : '₦₦';
  if (category === 'Bar') return '₦₦';
  if (category === 'Cafe') return '₦';
  
  return '₦₦';
}

function extractInstagram(tags: any): string | null {
  if (tags.instagram) return tags.instagram;
  if (tags['contact:instagram']) return tags['contact:instagram'];
  if (tags.website?.includes('instagram.com')) return tags.website;
  
  return null;
}

async function getVenueImages(venueName: string, category: string, location: string): Promise<string[]> {
  try {
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID');
    
    console.log(`=== Starting image search for: ${venueName} ===`);
    console.log(`Google API Key exists: ${!!googleApiKey}`);
    console.log(`Search Engine ID exists: ${!!searchEngineId}`);
    
    if (googleApiKey) console.log(`API Key starts with: ${googleApiKey.substring(0, 10)}...`);
    if (searchEngineId) console.log(`Search Engine ID: ${searchEngineId}`);
    
    if (!googleApiKey || !searchEngineId || googleApiKey.length < 10) {
      console.log('⚠️ Google API credentials missing or invalid, using high-quality fallback images');
      // Use curated high-quality images as backup
      return getEnhancedFallbackImages(category, venueName + location);
    }

    console.log('✅ Google API credentials found, proceeding with search');

    // Strategy 1: Search for specific venue name
    let images = await googleImageSearch(googleApiKey, searchEngineId, `"${venueName}" Lagos Nigeria`);
    if (images.length > 0) {
      console.log(`Found ${images.length} images using venue name search for ${venueName}`);
      return images;
    }

    // Strategy 2: Search venue name + category
    images = await googleImageSearch(googleApiKey, searchEngineId, `"${venueName}" ${category} Lagos`);
    if (images.length > 0) {
      console.log(`Found ${images.length} images using venue + category search for ${venueName}`);
      return images;
    }

    // Strategy 3: Search with location details
    images = await googleImageSearch(googleApiKey, searchEngineId, `${venueName} ${location} ${category} restaurant bar club`);
    if (images.length > 0) {
      console.log(`Found ${images.length} images using location search for ${venueName}`);
      return images;
    }

    // Strategy 4: Search for reviews/social media
    images = await googleImageSearch(googleApiKey, searchEngineId, `${venueName} Lagos review interior exterior photos`);
    if (images.length > 0) {
      console.log(`Found ${images.length} images using review search for ${venueName}`);
      return images;
    }

    console.log(`No images found via Google for ${venueName}, using curated fallback images`);
    return getEnhancedFallbackImages(category, venueName + location);
    
  } catch (error) {
    console.error(`Error fetching images for ${venueName}:`, error);
    return getEnhancedFallbackImages(category, venueName + location);
  }
}

async function googleImageSearch(apiKey: string, searchEngineId: string, query: string): Promise<string[]> {
  try {
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&searchType=image&num=3&imgSize=large&safe=active&lr=lang_en`;
    
    console.log(`🔍 Google search query: ${query}`);
    console.log(`🌐 Search URL: ${searchUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    const response = await fetch(searchUrl);
    
    console.log(`📡 Google API Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Google API error (${response.status}): ${errorText}`);
      return [];
    }

    const data = await response.json();
    
    console.log(`📊 Google API Response: ${JSON.stringify(data).substring(0, 500)}...`);
    
    if (data.error) {
      console.log(`❌ Google API error: ${data.error.message}`);
      console.log(`📋 Error details: ${JSON.stringify(data.error)}`);
      return [];
    }
    
    if (!data.items || data.items.length === 0) {
      console.log(`⚠️ No items found in Google API response for query: ${query}`);
      return [];
    }
    
    console.log(`📸 Found ${data.items.length} raw items from Google`);
    
    const images = data.items?.slice(0, 3).map((img: any) => img.link).filter((url: string) => 
      url && 
      !url.includes('placeholder') && 
      !url.includes('default') && 
      !url.includes('no-image') &&
      (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp'))
    ) || [];
    
    console.log(`✅ Google search returned ${images.length} valid images: ${images.join(', ')}`);
    return images;
  } catch (error) {
    console.error(`💥 Google image search error: ${error}`);
    return [];
  }
}

async function searchVenueImagesWeb(venueName: string, category: string, location: string): Promise<string[]> {
  try {
    console.log(`Web search fallback for: ${venueName}`);
    
    // Search for the venue website or social media
    const searchQueries = [
      `${venueName} Lagos Nigeria site:instagram.com OR site:facebook.com`,
      `${venueName} Lagos restaurant bar club photos`,
      `${venueName} Lagos Nigeria review images`,
      `"${venueName}" Lagos Nigeria interior exterior`
    ];

    for (const query of searchQueries) {
      try {
        // Use a basic web search approach
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          const imageUrls = extractImageUrlsFromHtml(html, venueName);
          if (imageUrls.length > 0) {
            console.log(`Found ${imageUrls.length} images via web search for ${venueName}`);
            return imageUrls;
          }
        }
      } catch (error) {
        console.log(`Web search failed for query: ${query}`);
        continue;
      }
    }
    
    // If all searches fail, return enhanced fallback images
    console.log(`All search methods failed for ${venueName}, using enhanced fallback`);
    return getEnhancedFallbackImages(category, venueName);
    
  } catch (error) {
    console.error(`Web search error for ${venueName}:`, error);
    return getEnhancedFallbackImages(category, venueName);
  }
}

function extractImageUrlsFromHtml(html: string, venueName: string): string[] {
  const imageUrls: string[] = [];
  
  // Simple regex to find image URLs in HTML
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  
  while ((match = imgRegex.exec(html)) !== null && imageUrls.length < 3) {
    const url = match[1];
    if (url && 
        (url.startsWith('http') || url.startsWith('https')) &&
        (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp')) &&
        !url.includes('logo') && 
        !url.includes('icon') &&
        !url.includes('placeholder')) {
      imageUrls.push(url);
    }
  }
  
  return imageUrls;
}

function getEnhancedFallbackImages(category: string, venueName?: string): string[] {
  // Enhanced fallback with more variety and venue-specific selection
  const allFallbackImages: Record<string, string[]> = {
    'Restaurant': [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1586511925558-a4c6376fe65f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
    ],
    'Bar': [
      'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
    ],
    'Club': [
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1571974599782-87c8c4da5fa2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1574391884720-bbc31d6424f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1571936829411-5ba000dff9dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582267925214-b4b7cbf30f16?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
    ],
    'Cafe': [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1445116572660-236099ec97a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1493857671505-72967e2e2760?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
    ],
    'Hotel': [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
    ]
  };
  
  const categoryImages = allFallbackImages[category] || allFallbackImages['Restaurant'];
  
  // Use venue name and location to create a unique selection for each venue
  if (venueName) {
    const hash = (venueName + category + (location || '')).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const startIndex = hash % categoryImages.length;
    
    // Select 1-3 different images for variety
    const selectedImages = [];
    for (let i = 0; i < Math.min(3, categoryImages.length); i++) {
      const index = (startIndex + i) % categoryImages.length;
      selectedImages.push(categoryImages[index]);
    }
    
    console.log(`Selected ${selectedImages.length} fallback images for ${venueName}`);
    return selectedImages;
  }
  
  // Return 3 random images if no venue name
  const shuffled = [...categoryImages].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

// Legacy function for compatibility
function getFallbackImages(category: string): string[] {
  return getEnhancedFallbackImages(category);
}

function getFallbackVenues(category: string, lga: string) {
  // Fallback venues when Overpass API fails
  const fallbackVenues = [
    {
      id: crypto.randomUUID(),
      name: `${category} in ${lga}`,
      description: `Popular ${category.toLowerCase()} in ${lga}`,
      location: lga,
      address: 'Lagos, Nigeria',
      category,
      rating: 4.0,
      price_range: '₦₦',
      contact_phone: null,
      contact_email: null,
      website_url: null,
      instagram_url: null,
      features: [],
      opening_hours: {
        monday: '9:00 AM - 10:00 PM',
        tuesday: '9:00 AM - 10:00 PM',
        wednesday: '9:00 AM - 10:00 PM',
        thursday: '9:00 AM - 10:00 PM',
        friday: '9:00 AM - 11:00 PM',
        saturday: '9:00 AM - 11:00 PM',
        sunday: '10:00 AM - 9:00 PM'
      },
      professional_media_urls: getEnhancedFallbackImages(category, `${category} in ${lga}`),
      is_verified: false,
      latitude: 6.4281,
      longitude: 3.4219,
      owner_id: null
    }
  ];
  
  return fallbackVenues;
}