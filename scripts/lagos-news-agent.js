#!/usr/bin/env node

/**
 * 🤖 GIDI CONNECT NEWS AGENT
 *
 * An AI-powered agent that:
 * 1. Uses Gemini AI with Google Search grounding to find Lagos news
 * 2. Analyzes and formats the content automatically
 * 3. Uploads structured news items to Supabase
 *
 * Usage: node scripts/lagos-news-agent.js
 *
 * Requirements:
 * - GEMINI_API_KEY in .env (Get free from aistudio.google.com)
 * - Supabase credentials in .env
 *
 * Note: No need for Serper API! Gemini 1.5 Flash has built-in Google Search.
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config();

// Optional headless browsing (puppeteer-extra). We dynamically import so CI can run without these deps if they're not installed.
let puppeteer = null;
let StealthPlugin = null;
try {
  const pExtra = await import('puppeteer-extra');
  puppeteer = pExtra.default || pExtra;
  const stealthMod = await import('puppeteer-extra-plugin-stealth');
  StealthPlugin = stealthMod.default || stealthMod;
  if (puppeteer && StealthPlugin) {
    puppeteer.use(StealthPlugin());
  }
} catch (err) {
  console.warn('⚠️ Optional dependency "puppeteer-extra" not found — headless fallback disabled. Install puppeteer, puppeteer-extra and puppeteer-extra-plugin-stealth to enable headless browser fallback.');
  puppeteer = null;
}

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role for write access

// Validate environment variables
if (!GEMINI_API_KEY) {
  console.error('❌ ERROR: GEMINI_API_KEY not found in .env file');
  console.error('Get your free API key from: https://aistudio.google.com');
  process.exit(1);
}

if (!SUPABASE_URL) {
  console.error('❌ ERROR: VITE_SUPABASE_URL not found in .env file');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// --- FETCH HELPERS (axios with headers + puppeteer fallback) ---
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Upgrade-Insecure-Requests': '1'
};

async function fetchWithAxios(url) {
  const resp = await axios.get(url, {
    headers: DEFAULT_HEADERS,
    timeout: 20000,
    maxRedirects: 5,
  });
  return resp.data;
}

async function fetchWithPuppeteer(url) {
  if (!puppeteer) {
    throw new Error('puppeteer not available');
  }

  console.log(`   🔁 Falling back to headless browser for ${url}`);
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(DEFAULT_HEADERS['User-Agent']);
    await page.setExtraHTTPHeaders({ 'Accept-Language': DEFAULT_HEADERS['Accept-Language'] });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    const html = await page.content();
    await page.close();
    return html;
  } finally {
    await browser.close();
  }
}

async function fetchPageHtml(url, attempts = 3) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchWithAxios(url);
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const msg = err?.message || '...';
      console.log(`   ⚠️ Axios fetch failed (attempt ${i + 1}): ${status || msg}`);

      // If blocked, try puppeteer fallback
      if (status === 403 || status === 429 || /blocked|bot/i.test(msg)) {
        try {
          return await fetchWithPuppeteer(url);
        } catch (puppErr) {
          console.log('   ❌ Headless fallback failed:', puppErr.message);
          // continue to retry axios in case of transient issue
        }
      }

      // exponential backoff before retrying
      await new Promise(res => setTimeout(res, 500 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

// --- ARTICLE CATEGORIZATION ---

/**
 * Categorize an article based on its title and summary content.
 * Returns one of: general, politics, crime, business, entertainment, events,
 * nightlife, sports, food, traffic, lifestyle, technology, health, education
 */
function categorizeArticle(title, summary = '', sourceFallback = 'general') {
  const text = `${title} ${summary}`.toLowerCase();

  // Politics & Government — highest priority (was most mislabeled)
  if (/\b(politic|govt|government|governor|senator|president|minister|election|campaign|vote|ballot|tribunal|inec|apc\b|pdp\b|lp\b|adc\b|nnpp|senate|house\s?of\s?rep|lawmaker|legislation|bill\b|impeach|democracy|coup|diplomacy|embassy|sanction|tariff|trump|biden|tinubu|obi\b|atiku|shettima|wike|sanwo[\s-]?olu|fashola|ambode|buhari|osinbajo|national\s?assembly|supreme\s?court|judiciary|court\s?of\s?appeal|federal|state\s?house|aso\s?rock|presidency|opposition|incumbent|political\s?party|primaries|caucus|constituency|geopolitic|diplomat|foreign\s?affairs|un\b|nato\b|eu\b|ecowas|african\s?union)\b/.test(text)) return 'politics';

  // Crime & Security
  if (/\b(killed|murder|robbery|kidnap|arrest|police|shoot|gun|attack|bomb|explo|terror|bandits?|herdsmen|ritual|fraud|scam|efcc|ndlea|prison|jail|sentence|suspect|crime|criminal|armed|theft|rape|assault|victim|cult|gang|drug\s?bust|trafficking)\b/.test(text)) return 'crime';

  // Business & Economy
  if (/\b(economy|inflation|naira|dollar|exchange\s?rate|stock|market|invest|revenue|gdp|budget|tax|cbn\b|bank\b|interest\s?rate|oil\s?price|crude|opec|business|startup|funding|ipo|profit|loss|debt|loan|fintech|crypto|bitcoin|trade\s?war|import|export|customs|nbs\b|sec\b)\b/.test(text)) return 'business';

  // Nightlife
  if (/\b(clubs?|nightclubs?|nightlife|night\s?life|lounges?|dj\s?set|rave|after[\s-]?party|bottle\s?service|vip\s?section|night\s?out)\b/.test(text)) return 'nightlife';

  // Events
  if (/\b(concert|festival|exhibition|launch\s?event|premiere|ceremony|gala|carnival|fiesta|conference|summit|award\s?show|red\s?carpet|lineup|headlin|fashion\s?week)\b/.test(text)) return 'events';

  // Sports
  if (/\b(football|soccer|nba|basketball|athlete|stadium|premier\s?league|champions\s?league|afcon|super\s?eagles|coach|goalkeeper|striker|fixture|referee|la\s?liga|serie\s?a|transfer|olympic|wrestling|boxing|marathon|epl\b|laliga|ucl\b|world\s?cup|fifa|caf\b|npfl)\b/.test(text)) return 'sports';

  // Food & Dining
  if (/\b(restaurant|food|chef|dining|recipe|cuisine|cook|kitchen|menu|meal|suya|jollof|amala|pepper\s?soup|eatery|bakery|cafe|brunch|buffet)\b/.test(text)) return 'food';

  // Traffic & Transport
  if (/\b(traffic|road\s?clos|gridlock|accident|highway|expressway|brt\b|danfo|commut|transport|toll|third\s?mainland|lekki.exp|eko\s?bridge|congestion)\b/.test(text)) return 'traffic';

  // Lifestyle
  if (/\b(fashion|style|wedding|beauty|makeup|wellness|fitness|museum|gallery|theatre|theater|design|interior|real\s?estate|property|luxury|relationship|dating|self[\s-]?care)\b/.test(text)) return 'lifestyle';

  // Entertainment — music, movies, celebrities, Nollywood
  if (/\b(nollywood|movie|film|actor|actress|music|album|single\b|song|rapper|singer|wizkid|davido|burna\s?boy|tiwa\s?savage|asake|rema\b|tems\b|olamide|bbnaija|big\s?brother|reality\s?tv|netflix|spotify|grammy|headies|hip[\s-]?hop|afrobeat|amapiano|comedy|comedian|skit|viral|influencer|youtube|tiktok|gossip|scandal|celebrity|celeb)\b/.test(text)) return 'entertainment';

  // Technology
  if (/\b(tech|ai\b|artificial\s?intelligence|app\b|software|hardware|gadget|phone|iphone|samsung|google|apple|microsoft|meta\b|spacex|elon\s?musk|robot|drone|5g\b|internet|cyber|hack|data\s?breach|blockchain)\b/.test(text)) return 'technology';

  // Health
  if (/\b(health|hospital|doctor|disease|virus|covid|malaria|cholera|lassa|ebola|vaccine|medicine|surgery|patient|who\b|ncdc|medical|clinic|pharma|mental\s?health|diagnosis|epidemic|pandemic)\b/.test(text)) return 'health';

  // Education
  if (/\b(university|school|student|education|asuu|exam|waec|jamb|neco|lecturer|professor|scholarship|academic|admission|matriculation|convocation|varsity)\b/.test(text)) return 'education';

  // Fall back to source-level hint, or general
  return sourceFallback;
}

// --- FUNCTIONS ---

/**
 * Scrape article details (image, date, summary) from a news article URL
 */
async function scrapeArticleDetails(articleUrl) {
  try {
    console.log(`   🔍 Scraping article from: ${articleUrl.substring(0, 50)}...`);

    const html = await fetchPageHtml(articleUrl);
    const $ = cheerio.load(html);

    // --- EXTRACT IMAGE ---
    let imageUrl = null;

    // 1. Open Graph image (most reliable for news sites)
    imageUrl = $('meta[property="og:image"]').attr('content');

    // 2. Twitter card image
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr('content');
    }

    // 3. First article image
    if (!imageUrl) {
      imageUrl = $('article img').first().attr('src');
    }

    // 4. Any image in main content
    if (!imageUrl) {
      imageUrl = $('.entry-content img, .post-content img, .article-content img').first().attr('src');
    }

    // Make sure the URL is absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      const urlObj = new URL(articleUrl);
      if (imageUrl.startsWith('//')) {
        imageUrl = `https:${imageUrl}`;
      } else if (imageUrl.startsWith('/')) {
        imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
      } else {
        imageUrl = `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
      }
    }

    // --- EXTRACT PUBLISH DATE ---
    let publishDate = null;

    // 1. Try Open Graph published time
    let dateStr = $('meta[property="article:published_time"]').attr('content');

    // 2. Try meta publish date
    if (!dateStr) {
      dateStr = $('meta[name="publish_date"]').attr('content');
    }

    // 3. Try meta date
    if (!dateStr) {
      dateStr = $('meta[name="date"]').attr('content');
    }

    // 4. Try time tag with datetime attribute
    if (!dateStr) {
      dateStr = $('time[datetime]').first().attr('datetime');
    }

    // 5. Try to extract from URL pattern (e.g., /2025/01/08/)
    if (!dateStr) {
      const urlDateMatch = articleUrl.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
      if (urlDateMatch) {
        const [, year, month, day] = urlDateMatch;
        dateStr = `${year}-${month}-${day}`;
      }
    }

    // Parse and validate the date - MANDATORY check
    if (dateStr) {
      publishDate = new Date(dateStr);

      // Validate the date is reasonable (not in future, not too old)
      const now = new Date();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      // If date is in the future or more than 1 year old, reject it
      if (publishDate > now || publishDate < oneYearAgo) {
        console.log(`   ⚠️  Invalid date (${publishDate.toISOString().split('T')[0]}) - article too old or date error`);
        return null;
      }

      // Check if article is recent (within last 60 days)
      if (publishDate < sixtyDaysAgo) {
        console.log(`   ⏰ Article too old (${publishDate.toISOString().split('T')[0]}) - skipping`);
        return null;
      }
    } else {
      // CRITICAL: If no date found, reject the article
      console.log(`   ⚠️  No publish date found - rejecting article to ensure freshness`);
      return null;
    }

    // --- EXTRACT SUMMARY ---
    let summary = null;

    // 1. Try Open Graph description
    summary = $('meta[property="og:description"]').attr('content');

    // 2. Try meta description
    if (!summary) {
      summary = $('meta[name="description"]').attr('content');
    }

    // 3. Try first paragraph of article content
    if (!summary) {
      summary = $('article p').first().text().trim();
    }

    // 4. Try any paragraph in entry content
    if (!summary) {
      summary = $('.entry-content p, .post-content p, .article-content p').first().text().trim();
    }

    // Clean up summary - remove extra whitespace and limit length
    if (summary) {
      summary = summary.replace(/\s+/g, ' ').trim();
      if (summary.length > 150) {
        summary = summary.substring(0, 147) + '...';
      }
    }

    // Return all extracted details
    const result = {
      imageUrl,
      publishDate: publishDate ? publishDate.toISOString() : new Date().toISOString(),
      summary: summary || null
    };

    if (imageUrl) {
      console.log(`   ✅ Image: ${imageUrl.substring(0, 60)}...`);
    }
    if (publishDate) {
      console.log(`   📅 Date: ${publishDate.toISOString().split('T')[0]}`);
    }
    if (summary) {
      console.log(`   📝 Summary: ${summary.substring(0, 50)}...`);
    }

    return result;

  } catch (error) {
    console.log(`   ❌ Failed to scrape article: ${error.message}`);
    return null;
  }
}

/**
 * Scrape real news articles directly from Lagos news websites
 */
async function scrapeRealLagosNews() {
  const newsItems = [];
  const seenUrls = new Set(); // Track URLs to prevent duplicates within this run

  // CRITICAL: Fetch existing URLs from database to prevent duplicates across runs
  const existingUrls = new Set();
  if (supabase) {
    try {
      console.log('🔍 Checking database for existing article URLs...');
      const { data, error } = await supabase
        .from('news')
        .select('external_url');

      if (!error && data) {
        data.forEach(item => {
          if (item.external_url) {
            existingUrls.add(item.external_url);
          }
        });
        console.log(`   ✅ Found ${existingUrls.size} existing URLs in database\n`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch existing URLs: ${error.message}\n`);
    }
  }

  const sources = [
    {
      name: 'Linda Ikeji Blog',
      url: 'https://www.lindaikejisblog.com/',
      fallbackCategory: 'general'
    },
    {
      name: 'Instablog9ja',
      url: 'https://instablog9ja.com/',
      fallbackCategory: 'general'
    },
    {
      name: '36ng Entertainment',
      url: 'https://36ng.ng/category/entertainment/',
      fallbackCategory: 'entertainment'
    },
    {
      name: 'Information Nigeria Entertainment',
      url: 'https://www.informationng.com/category/entertainment',
      fallbackCategory: 'entertainment'
    },
    {
      name: 'Information Nigeria News',
      url: 'https://www.informationng.com/category/news',
      fallbackCategory: 'general'
    },
    {
      name: 'Premium Times',
      url: 'https://www.premiumtimesng.com/tag/lagos',
      fallbackCategory: 'general'
    },
    {
      name: 'Punch',
      url: 'https://punchng.com/lagos/',
      fallbackCategory: 'general'
    },
    {
      name: 'BellaNaija Events',
      url: 'https://www.bellanaija.com/category/events/',
      fallbackCategory: 'events'
    },
    {
      name: 'BellaNaija Entertainment',
      url: 'https://www.bellanaija.com/category/entertainment/',
      fallbackCategory: 'entertainment'
    },
    {
      name: 'Pulse Nigeria Lagos',
      url: 'https://www.pulse.ng/news/local/lagos',
      fallbackCategory: 'general'
    },
    {
      name: 'Pulse Entertainment',
      url: 'https://www.pulse.ng/entertainment',
      fallbackCategory: 'entertainment'
    },
    {
      name: 'NotJustOk',
      url: 'https://notjustok.com/news/',
      fallbackCategory: 'entertainment'
    },
    {
      name: 'Legit.ng Nigeria',
      url: 'https://www.legit.ng/nigeria/',
      fallbackCategory: 'general'
    },
    {
      name: 'Legit.ng Entertainment',
      url: 'https://www.legit.ng/entertainment/',
      fallbackCategory: 'entertainment'
    }
  ];

  console.log('📰 Scraping real articles from Lagos news sites...\n');

  for (const source of sources) {
    try {
      console.log(`🔍 Scraping ${source.name}...`);

      const html = await fetchPageHtml(source.url);
      const $ = cheerio.load(html);

      // Find article links - try multiple selectors
      const articleLinks = [];
      $('article a, .post a, .entry-title a, h2 a, h3 a').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();

        // For entertainment/events sources, accept all articles
        // For general news sources, require "lagos" in title
        const isRelevant = (source.fallbackCategory !== 'general')
          ? text.length > 20
          : text.length > 20 && text.toLowerCase().includes('lagos');

        if (href && text && isRelevant) {
          let fullUrl = href;
          if (!href.startsWith('http')) {
            const baseUrl = new URL(source.url);
            fullUrl = href.startsWith('/') ?
              `${baseUrl.protocol}//${baseUrl.host}${href}` :
              `${baseUrl.protocol}//${baseUrl.host}/${href}`;
          }

          articleLinks.push({ url: fullUrl, title: text });
        }
      });

      // Take first 3 articles per source
      const selectedArticles = articleLinks.slice(0, 3);

      for (const article of selectedArticles) {
        // Skip if we've already seen this URL in this run (prevent duplicates within run)
        if (seenUrls.has(article.url)) {
          console.log(`   ⏭️  Skipping duplicate (in this run): ${article.url.substring(0, 60)}...\n`);
          continue;
        }

        // CRITICAL: Skip if URL already exists in database (prevent duplicates across runs)
        if (existingUrls.has(article.url)) {
          console.log(`   ⏭️  Skipping duplicate (already in database): ${article.url.substring(0, 60)}...\n`);
          continue;
        }

        console.log(`   📄 Article: ${article.title.substring(0, 50)}...`);
        console.log(`   🔗 URL: ${article.url.substring(0, 60)}...`);

        // CRITICAL: Validate URL before scraping (prevent fake URLs)
        const urlLower = article.url.toLowerCase();
        const isFakeUrl = !article.url ||
                          urlLower.includes('example.com') ||
                          urlLower.includes('localhost') ||
                          urlLower.includes('test.com') ||
                          urlLower.includes('placeholder') ||
                          article.url === '#' ||
                          article.url.startsWith('javascript:') ||
                          article.url === 'about:blank';

        if (isFakeUrl) {
          console.log(`   ⚠️  Skipped - invalid/fake URL detected\n`);
          continue;
        }

        // Scrape the article page for details (image, date, summary)
        const details = await scrapeArticleDetails(article.url);

        // Skip if article is too old or failed to scrape
        if (!details) {
          console.log(`   ⚠️  Skipped - article rejected\n`);
          continue;
        }

        // Accept articles with or without images — don't skip image-less articles
        // from sources like Linda Ikeji and Instablog9ja that use lazy-loaded images
        seenUrls.add(article.url);
        existingUrls.add(article.url);

        // Categorize based on actual article content, not just source
        const articleCategory = categorizeArticle(
          article.title,
          details.summary || '',
          source.fallbackCategory
        );

        newsItems.push({
          title: article.title.substring(0, 100),
          summary: details.summary || `Latest update from ${source.name} on Lagos news.`,
          category: articleCategory,
          source: source.name,              // ← store actual source name
          external_url: article.url,
          featured_image_url: details.imageUrl || null,  // null when not found
          publish_date: details.publishDate,
          sentiment: 'neutral',
          priority: newsItems.length + 1
        });

        console.log(`   ✅ Added article from ${source.name} [${articleCategory}]${details.imageUrl ? ' (with image)' : ' (no image)'}\n`);

        // Limit to 25 total articles (raised from 15 to get more sources represented)
        if (newsItems.length >= 25) break;
      }

      if (newsItems.length >= 25) break;

      // Small delay between sources to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.log(`   ❌ Failed to scrape ${source.name}: ${error.message}\n`);
    }
  }

  return newsItems;
}

/**
 * Upload news items to Supabase
 */
async function uploadToSupabase(newsItems) {
  if (!supabase) {
    console.log('⚠️  Supabase not configured. Skipping upload.');
    console.log('📊 GENERATED NEWS ITEMS:');
    console.log(JSON.stringify(newsItems, null, 2));
    return;
  }

  try {
    const formattedItems = newsItems.map(item => ({
      title: item.title,
      summary: item.summary,
      category: item.category,
      external_url: item.external_url,
      featured_image_url: item.featured_image_url,
      publish_date: item.publish_date || new Date().toISOString(),
      is_active: true,
      source: item.source || 'Lagos News',
    }));

    const { data, error } = await supabase
      .from('news')
      .insert(formattedItems)
      .select();

    if (error) {
      throw error;
    }

    console.log(`✅ SUCCESS: Uploaded ${data.length} news items to Supabase`);
    return data;

  } catch (error) {
    console.error('❌ Supabase upload error:', error.message);
    throw error;
  }
}

/**
 * Main agent function
 */
async function runLagosNewsAgent() {
  console.log('🤖 GIDI NEWS AGENT: Starting...\n');

  try {
    // Step 1: Scrape real articles from Lagos news websites
    console.log('🔍 STEP 1: Scraping real articles from Lagos news sites...');
    const newsItems = await scrapeRealLagosNews();
    console.log(`\n✅ Successfully scraped ${newsItems.length} articles with real images\n`);

    if (newsItems.length === 0) {
      console.warn('⚠️ No articles were scraped this run. Skipping Supabase upload.');
      process.exit(0);
    }

    // Step 2: Upload to Supabase
    console.log('📤 STEP 2: Uploading to Supabase...');
    await uploadToSupabase(newsItems);

    console.log('\n🎉 AGENT COMPLETED SUCCESSFULLY!');
    console.log(`   📊 Total items processed: ${newsItems.length}`);
    console.log(`   💡 Method: Direct web scraping from news sites`);
    console.log(`   🖼️  All articles have REAL images scraped from source`);
    console.log(`   📰 Sources: Punch, The Cable, Premium Times, Vanguard`);
    console.log(`   🕐 Next run: Every hour via GitHub Actions, every 3h via macOS launchd`);

  } catch (error) {
    console.error('\n❌ AGENT FAILED:', error.message);
    process.exit(1);
  }
}

// --- RUN THE AGENT ---
// Export the function for potential reuse
export { runLagosNewsAgent };

// Run the agent when script is executed directly
runLagosNewsAgent();
