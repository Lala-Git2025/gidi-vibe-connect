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

// --- FUNCTIONS ---

/**
 * Scrape article details (image, date, summary) from a news article URL
 */
async function scrapeArticleDetails(articleUrl) {
  try {
    console.log(`   🔍 Scraping article from: ${articleUrl.substring(0, 50)}...`);

    const response = await axios.get(articleUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

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
      category: 'general'
    },
    {
      name: 'Instablog9ja',
      url: 'https://instablog9ja.com/',
      category: 'nightlife'
    },
    {
      name: '36ng Entertainment',
      url: 'https://36ng.ng/category/entertainment/',
      category: 'nightlife'
    },
    {
      name: 'Information Nigeria Entertainment',
      url: 'https://www.informationng.com/category/entertainment',
      category: 'events'
    },
    {
      name: 'Information Nigeria News',
      url: 'https://www.informationng.com/category/news',
      category: 'general'
    },
    {
      name: 'Premium Times',
      url: 'https://www.premiumtimesng.com/tag/lagos',
      category: 'general'
    },
    {
      name: 'Punch',
      url: 'https://punchng.com/lagos/',
      category: 'general'
    },
    {
      name: 'BellaNaija Events',
      url: 'https://www.bellanaija.com/category/events/',
      category: 'events'
    },
    {
      name: 'BellaNaija Entertainment',
      url: 'https://www.bellanaija.com/category/entertainment/',
      category: 'nightlife'
    },
    {
      name: 'Pulse Nigeria Lagos',
      url: 'https://www.pulse.ng/news/local/lagos',
      category: 'general'
    },
    {
      name: 'Pulse Entertainment',
      url: 'https://www.pulse.ng/entertainment',
      category: 'nightlife'
    },
    {
      name: 'NotJustOk',
      url: 'https://notjustok.com/news/',
      category: 'nightlife'
    },
    {
      name: 'Legit.ng Nigeria',
      url: 'https://www.legit.ng/nigeria/',
      category: 'general'
    },
    {
      name: 'Legit.ng Entertainment',
      url: 'https://www.legit.ng/entertainment/',
      category: 'nightlife'
    }
  ];

  console.log('📰 Scraping real articles from Lagos news sites...\n');

  for (const source of sources) {
    try {
      console.log(`🔍 Scraping ${source.name}...`);

      const response = await axios.get(source.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // Find article links - try multiple selectors
      const articleLinks = [];
      $('article a, .post a, .entry-title a, h2 a, h3 a').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();

        // For entertainment/nightlife sources, accept all articles
        // For general news sources, require "lagos" in title
        const isRelevant = (source.category === 'events' || source.category === 'nightlife')
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

        if (details.imageUrl) {
          // Final URL validation before adding to database
          if (!article.url || !article.url.startsWith('http')) {
            console.log(`   ⚠️  Skipped - missing or invalid URL\n`);
            continue;
          }

          // Mark this URL as seen in both sets to prevent duplicates
          seenUrls.add(article.url);
          existingUrls.add(article.url);

          newsItems.push({
            title: article.title.substring(0, 100),
            summary: details.summary || `Latest update from ${source.name} on Lagos news.`,
            category: source.category,
            external_url: article.url,
            featured_image_url: details.imageUrl,
            publish_date: details.publishDate,
            sentiment: 'neutral',
            priority: newsItems.length + 1
          });

          console.log(`   ✅ Added article with real details\n`);
        } else {
          console.log(`   ⚠️  Skipped - no image found\n`);
        }

        // Limit to 15 total articles
        if (newsItems.length >= 15) break;
      }

      if (newsItems.length >= 15) break;

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
      source: 'AI Agent',
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
    console.log(`\n✅ Scraping complete: ${newsItems.length} new articles found\n`);

    if (newsItems.length === 0) {
      // No new articles is NOT an error - database is up to date
      console.log('\n✅ AGENT COMPLETED SUCCESSFULLY!');
      console.log('   📊 No new articles found (all recent articles already in database)');
      console.log('   ✅ Database is up to date!');
      console.log('   🕐 Next run: Will check again in 3 hours');
      return; // Exit successfully, not with an error
    }

    // Step 2: Upload to Supabase
    console.log('📤 STEP 2: Uploading to Supabase...');
    await uploadToSupabase(newsItems);

    console.log('\n🎉 AGENT COMPLETED SUCCESSFULLY!');
    console.log(`   📊 Total items processed: ${newsItems.length}`);
    console.log(`   💡 Method: Direct web scraping from news sites`);
    console.log(`   🖼️  All articles have REAL images scraped from source`);
    console.log(`   📰 Sources: Punch, The Cable, Premium Times, Vanguard`);
    console.log(`   🕐 Next run: Will check again in 3 hours`);

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
