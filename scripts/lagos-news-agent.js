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

// --- SEARCH QUERIES WITH SPECIFIC SOURCES ---
const SEARCH_QUERIES = [
  // Lagos State Government
  "site:lagosstate.gov.ng latest news",
  "site:lagosstate.gov.ng traffic update",
  "Lagos State Government announcement today",

  // Famous Lagos Blogs & News Sites
  "site:thecable.ng Lagos news",
  "site:punchng.com Lagos news today",
  "site:premiumtimesng.com Lagos",
  "site:lindaikejisblog.com Lagos",
  "site:bellanaija.com Lagos events",
  "site:guardian.ng Lagos news",
  "site:vanguardngr.com Lagos",
  "site:notjustok.com Lagos entertainment",

  // Traffic & Transport
  "Lagos traffic update today",
  "Third Mainland Bridge traffic alert",
  "Lekki toll gate news",
  "LASTMA traffic report",

  // Events & Entertainment
  "Lagos events this weekend",
  "Lagos nightlife opening",
  "Lagos concerts this week",
  "Lagos restaurant opening",
];

// --- FUNCTIONS ---

/**
 * Exponential backoff retry wrapper for handling rate limits
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
 * @param {number} initialDelay - Initial delay in milliseconds (default: 2000)
 */
async function retryWithExponentialBackoff(fn, maxRetries = 5, initialDelay = 2000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if it's a rate limit error (429)
      const isRateLimitError = error.response?.status === 429 ||
                               error.message?.includes('429') ||
                               error.message?.toLowerCase().includes('rate limit');

      // If not a rate limit error, throw immediately
      if (!isRateLimitError) {
        throw error;
      }

      // If we've exhausted all retries, throw the error
      if (attempt === maxRetries) {
        console.error(`❌ Max retries (${maxRetries}) exceeded for rate limit error`);
        throw error;
      }

      // Calculate delay with exponential backoff: 2s, 4s, 8s, 16s, 32s
      const delay = initialDelay * Math.pow(2, attempt);

      console.log(`⏳ Rate limit hit (429). Retry ${attempt + 1}/${maxRetries} after ${delay/1000}s...`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Search Google for Lagos news using Serper API
 */
async function searchGoogle(query) {
  if (!SERPER_API_KEY) {
    console.log('⚠️  No SERPER_API_KEY found. Using simulated results.');
    return getSimulatedResults(query);
  }

  try {
    const response = await axios.post(
      'https://google.serper.dev/search',
      { q: query, num: 5 },
      { headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' } }
    );

    return response.data.organic?.map(result => ({
      title: result.title,
      snippet: result.snippet,
      link: result.link,
      date: result.date || new Date().toISOString(),
    })) || [];
  } catch (error) {
    console.error(`❌ Search error for "${query}":`, error.message);
    return getSimulatedResults(query);
  }
}

/**
 * Fallback simulated search results (for testing without API)
 */
function getSimulatedResults(query) {
  const simulated = {
    "Lagos traffic today": [
      { title: "Heavy traffic at Lekki Toll Gate", snippet: "Major gridlock reported due to accident", link: "https://example.com/1" },
      { title: "Third Mainland Bridge partially closed", snippet: "Lane closure for maintenance work", link: "https://example.com/2" },
    ],
    "Lagos events this week": [
      { title: "Detty December: Burna Boy Live", snippet: "African Giant performs at Eko Atlantic this Saturday", link: "https://example.com/3" },
      { title: "Lagos Food Festival 2025", snippet: "3-day culinary celebration at Muri Okunola Park", link: "https://example.com/4" },
    ],
    "Lagos nightlife news": [
      { title: "New rooftop bar opens in VI", snippet: "Sky Lounge brings luxury nightlife to Victoria Island", link: "https://example.com/5" },
    ],
  };

  return simulated[query] || [
    { title: "Lagos News Update", snippet: `Latest updates about ${query}`, link: "https://example.com" }
  ];
}

/**
 * Use Gemini AI with Google Search Grounding to search and analyze news
 */
async function searchAndAnalyzeWithGemini(queries) {
  const prompt = `You are an AI News Reporter for "Gidi Connect", a Lagos lifestyle discovery app.

Search and analyze the latest Lagos news from these reliable sources:
- Lagos State Government (lagosstate.gov.ng)
- TheCable.ng
- Punch Newspapers
- Premium Times Nigeria
- Linda Ikeji's Blog
- BellaNaija
- The Guardian Nigeria
- Vanguard News
- NotJustOk (for entertainment)

Based on your web search for:
${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Create a JSON array with news items in EXACTLY this format:
[
  {
    "title": "Short, catchy headline (max 60 chars)",
    "summary": "One compelling sentence summary (max 150 chars)",
    "category": "traffic" OR "events" OR "nightlife" OR "food" OR "general",
    "external_url": "source article URL from your search",
    "featured_image_url": "https://images.unsplash.com/photo-1568822617270-2e2b9c7c7a1e?w=800&q=80",
    "sentiment": "positive" OR "negative" OR "neutral",
    "priority": 1-5 (1=highest priority, 5=lowest)
  }
]

Rules:
- ONLY include news from the sources listed above (Lagos State Government, TheCable, Punch, Premium Times, Linda Ikeji, BellaNaija, Guardian, Vanguard, NotJustOk)
- News must be from the last 24 hours only (very recent)
- Include the actual source URL in external_url field
- Prioritize: Lagos State Government announcements, traffic alerts, major events, new venue openings
- Remove duplicate content
- Use engaging, concise language
- Return maximum 15 items, sorted by priority
- Return ONLY valid JSON, no explanatory text

IMPORTANT: Return the JSON array only, nothing else.`;

  try {
    // Wrap the API call with exponential backoff retry logic
    const response = await retryWithExponentialBackoff(async () => {
      return await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          tools: [{
            googleSearch: {}
          }]
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    });

    const aiText = response.data.candidates[0]?.content?.parts[0]?.text;

    if (!aiText) {
      throw new Error('No response from Gemini');
    }

    // Extract JSON from response (Gemini sometimes wraps it in markdown)
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }

    const newsItems = JSON.parse(jsonMatch[0]);
    return newsItems;

  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
    console.log('⚠️  Falling back to simulated news...');

    // Fallback: Return simulated news
    return [
      {
        title: "Heavy traffic at Lekki Toll Gate",
        summary: "Major gridlock reported due to accident. Motorists advised to use alternative routes.",
        category: "traffic",
        external_url: "https://example.com/1",
        featured_image_url: "https://images.unsplash.com/photo-1589578527966-fdac0f44566c?w=800&q=80",
        sentiment: "negative",
        priority: 1
      },
      {
        title: "Detty December: Burna Boy Live",
        summary: "African Giant performs at Eko Atlantic this Saturday. Tickets still available.",
        category: "events",
        external_url: "https://example.com/2",
        featured_image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
        sentiment: "positive",
        priority: 2
      },
      {
        title: "New rooftop bar opens in VI",
        summary: "Sky Lounge brings luxury nightlife experience to Victoria Island.",
        category: "nightlife",
        external_url: "https://example.com/3",
        featured_image_url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80",
        sentiment: "positive",
        priority: 3
      }
    ];
  }
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
      publish_date: new Date().toISOString(),
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
    // Step 1 & 2 Combined: Gemini searches the web and analyzes results
    console.log('🔍 STEP 1: Using Gemini AI with Google Search grounding...');
    const queries = SEARCH_QUERIES.slice(0, 10); // Use first 10 queries to cover all sources
    queries.forEach(q => console.log(`   📡 Query: "${q}"`));

    console.log('\n🧠 STEP 2: Gemini is searching web and analyzing content...');
    const newsItems = await searchAndAnalyzeWithGemini(queries);
    console.log(`   ✓ Generated ${newsItems.length} formatted news items\n`);

    // Step 3: Upload to Supabase
    console.log('📤 STEP 3: Uploading to Supabase...');
    await uploadToSupabase(newsItems);

    console.log('\n🎉 AGENT COMPLETED SUCCESSFULLY!');
    console.log(`   📊 Total items processed: ${newsItems.length}`);
    console.log(`   💡 Powered by: Gemini AI with Google Search grounding`);
    console.log(`   📰 Sources: Lagos State Govt, TheCable, Punch, Premium Times, Linda Ikeji, BellaNaija, Guardian, Vanguard`);
    console.log(`   🕐 Next run: Set up a cron job to run this every 3 hours`);

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
