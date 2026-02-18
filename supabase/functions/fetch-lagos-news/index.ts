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

/**
 * Deduplicate news articles based on title similarity
 * If two articles have very similar titles, keep only one (preferably with an image)
 */
function deduplicateNews(articles: any[]): any[] {
  const uniqueArticles: any[] = [];
  const seenTitles = new Set<string>();

  for (const article of articles) {
    const normalizedTitle = normalizeTitle(article.title);

    // Check if we've seen a similar title
    let isDuplicate = false;
    for (const seenTitle of seenTitles) {
      if (areTitlesSimilar(normalizedTitle, seenTitle)) {
        isDuplicate = true;

        // If this article has an image and the existing one doesn't, replace it
        const existingIndex = uniqueArticles.findIndex(
          a => normalizeTitle(a.title) === seenTitle
        );

        if (existingIndex !== -1) {
          const existing = uniqueArticles[existingIndex];
          if (article.featured_image_url && !existing.featured_image_url) {
            // Replace with article that has image
            uniqueArticles[existingIndex] = article;
            seenTitles.delete(seenTitle);
            seenTitles.add(normalizedTitle);
          }
        }
        break;
      }
    }

    if (!isDuplicate) {
      uniqueArticles.push(article);
      seenTitles.add(normalizedTitle);
    }
  }

  return uniqueArticles;
}

/**
 * Normalize title for comparison (lowercase, remove punctuation, extra spaces)
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim();
}

/**
 * Check if two titles are similar (70% word overlap)
 */
function areTitlesSimilar(title1: string, title2: string): boolean {
  const words1 = new Set(title1.split(' ').filter(w => w.length > 3));
  const words2 = new Set(title2.split(' ').filter(w => w.length > 3));

  if (words1.size === 0 || words2.size === 0) return false;

  // Count common words
  let commonWords = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      commonWords++;
    }
  }

  // Calculate similarity as percentage of common words
  const similarity = commonWords / Math.min(words1.size, words2.size);

  // Consider titles similar if they share 70% or more words
  return similarity >= 0.7;
}

serve(async (req) => {
  console.log('🚀 Fetch-lagos-news function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const newsApiKey = Deno.env.get('NEWS_API_KEY');
    
    if (!newsApiKey) {
      console.error('⚠️ NEWS_API_KEY not found, returning cached data');
      
      // Return cached data if available
      const { data: cachedNews } = await supabase
        .from('news_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      return new Response(JSON.stringify({ 
        success: true,
        data: cachedNews || getFallbackNews(),
        source: 'cached_fallback',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { category = 'general', limit = 10 } = await req.json().catch(() => ({}));

    console.log(`📰 Fetching Lagos/Nigeria news with category: ${category}`);

    // Fetch Lagos/Nigeria news with better search terms
    const newsResponse = await fetch(
      `https://newsapi.org/v2/everything?q=(Lagos OR Nigeria OR "Gidi" OR Nigerian) AND (entertainment OR music OR nightlife OR events OR culture)&language=en&sortBy=publishedAt&pageSize=${limit}&domains=punchng.com,thecable.ng,premiumtimesng.com,guardian.ng,vanguardngr.com,dailypost.ng`,
      {
        headers: {
          'X-API-Key': newsApiKey,
        },
      }
    );

    if (!newsResponse.ok) {
      throw new Error(`NewsAPI error: ${newsResponse.status} - ${newsResponse.statusText}`);
    }

    const newsData = await newsResponse.json();
    console.log(`📰 Received ${newsData.articles?.length || 0} articles from NewsAPI`);

    // Process and clean the news data
    const processedNews = newsData.articles?.map((article: any) => ({
      id: crypto.randomUUID(),
      title: article.title,
      summary: article.description,
      content: article.content || article.description,
      featured_image_url: article.urlToImage,
      category: category,
      publish_date: article.publishedAt,
      author_id: null,
      venue_id: null,
      source: article.source?.name || 'Unknown Source',
      external_url: article.url,
      is_published: true,
      views_count: 0,
      tags: ['Lagos', 'Nigeria', 'GIDI', 'Entertainment'],
    })).filter((article: any) =>
      article.title &&
      article.title !== '[Removed]' &&
      article.summary &&
      article.summary !== '[Removed]'
    ) || [];

    console.log(`✅ Processed ${processedNews.length} valid articles`);

    // Remove duplicates based on title similarity
    const deduplicatedNews = deduplicateNews(processedNews);
    console.log(`🔍 After deduplication: ${deduplicatedNews.length} unique articles`);

    // Cache the news in our database (non-blocking)
    if (deduplicatedNews.length > 0) {
      try {
        const { error: insertError } = await supabase
          .from('news_feed')
          .insert(deduplicatedNews);

        if (insertError) {
          console.error('⚠️ Error caching news:', insertError.message);
        } else {
          console.log('📀 News cached in database successfully');
        }
      } catch (dbError) {
        console.error('⚠️ Database caching failed:', dbError instanceof Error ? dbError.message : 'Unknown error');
      }
    }

    // Return processed news or fallback
    const finalData = deduplicatedNews.length > 0 ? deduplicatedNews : getFallbackNews();

    return new Response(JSON.stringify({ 
      success: true,
      data: finalData,
      source: processedNews.length > 0 ? 'live_api' : 'fallback_content',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in fetch-lagos-news:', error);
    
    // Fallback to cached data
    try {
      const { data: cachedNews } = await supabase
        .from('news_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const finalData = cachedNews && cachedNews.length > 0 ? cachedNews : getFallbackNews();

      return new Response(JSON.stringify({ 
        success: true,
        data: finalData,
        source: cachedNews && cachedNews.length > 0 ? 'cached' : 'emergency_fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fallbackError) {
      // Last resort - return hardcoded news
      return new Response(JSON.stringify({ 
        success: true,
        data: getFallbackNews(),
        source: 'emergency_fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});

function getFallbackNews() {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      title: "Lagos Nightlife Scene Continues to Thrive",
      summary: "The vibrant nightlife in Lagos remains a major attraction for both locals and tourists, with new venues opening across the city.",
      content: "Lagos continues to be the entertainment capital of West Africa, with its bustling nightlife scene attracting visitors from around the world. New restaurants, bars, and clubs are constantly opening, offering diverse experiences for everyone.",
      featured_image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
      category: "Entertainment",
      publish_date: now,
      author_id: null,
      venue_id: null,
      source: "GIDI Entertainment",
      external_url: null,
      is_published: true,
      views_count: 0,
      tags: ["Lagos", "Nightlife", "Entertainment"],
      created_at: now,
      updated_at: now
    },
    {
      id: crypto.randomUUID(),
      title: "New Restaurants Opening in Victoria Island",
      summary: "Several high-end restaurants are set to open in Victoria Island, adding to Lagos's growing culinary scene.",
      content: "The culinary landscape of Lagos continues to evolve with the opening of several new restaurants in Victoria Island. These establishments promise to bring international flavors while celebrating local Nigerian cuisine.",
      featured_image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
      category: "Food & Dining",
      publish_date: now,
      author_id: null,
      venue_id: null,
      source: "Lagos Food Guide",
      external_url: null,
      is_published: true,
      views_count: 0,
      tags: ["Lagos", "Restaurants", "Food"],
      created_at: now,
      updated_at: now
    },
    {
      id: crypto.randomUUID(),
      title: "Weekend Events and Live Music in Lagos",
      summary: "This weekend promises exciting events and live music performances across various venues in Lagos.",
      content: "Lagos residents and visitors can look forward to an exciting weekend filled with live music performances, cultural events, and entertainment activities across the city's top venues.",
      featured_image_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
      category: "Events",
      publish_date: now,
      author_id: null,
      venue_id: null,
      source: "Lagos Events",
      external_url: null,
      is_published: true,
      views_count: 0,
      tags: ["Lagos", "Events", "Music"],
      created_at: now,
      updated_at: now
    }
  ];
}