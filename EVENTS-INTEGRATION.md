# Events Integration System

> ## ⚠️ SUPERSEDED — 2026-10-06. The tooling below no longer exists.
>
> Every `npm run events:*` command in this document has been removed, along
> with the scripts behind them, because two of them did not do what they
> claimed:
>
> - **`scripts/scrape-nigerian-events.js` was not a scraper.** It imported
>   Puppeteer and a stealth plugin, and then wrote a hardcoded array of
>   invented events — fabricated ticket URLs (`nairabox.com/felabration`,
>   `tix.africa/lagos-food-festival`) that resolve to nothing, image URLs on
>   `source.unsplash.com` (an endpoint Unsplash retired, so they rendered
>   broken), and invented venues, dates, prices and organizers. Several titles
>   were real annual Lagos events, which made it worse: a user could plan
>   around an invented date. Eight such rows reached production.
> - **`scripts/sync-eventbrite-events.js` could never have worked.** It called
>   `GET /v3/events/search/`, which Eventbrite removed from public access in
>   December 2019 and began denying outright in February 2020. There is no
>   public endpoint for searching events across Eventbrite.
>
> `sync-all-events.js`, `test-events-system.js` and `setup-auto-events.sh` were
> removed with them, as was the `com.gidiconnect.events-sync` launchd job that
> ran the orchestrator nightly at 03:00.
>
> - **`supabase/functions/fetch-lagos-events` is a tautology, not an
>   ingester** (found 2026-10-05, client call removed). Its `fetchLagosEvents()`
>   SELECTs from `public.events`, and the handler then UPSERTs that result back
>   into `public.events` with `ignoreDuplicates: true` — while answering
>   `source: 'live_scraping'`. It cannot add an event. EventsScreen's
>   pull-to-refresh called it behind a "Syncing live events…" label, so the
>   screen promised ingestion that does not exist. The client no longer calls
>   it; **the deployed function is still live and should be deleted.**
>
> **Also note what the schema got right:** `events` already carries `source`,
> `external_id`, `external_url`, `last_synced_at`, `ticket_url` and
> `organizer_name/url`, and `EventsScreen` already renders a source badge and
> links out. The table is ready for real aggregation; only the ingesters were
> fiction.
>
> **Superseded by a working ingester:**
> [scripts/lagos-events-agent.js](scripts/lagos-events-agent.js) (2026-10-05)
> reads **schema.org `Event` JSON-LD** from Eventbrite's public Lagos browse
> pages and Meetup's Lagos find page — markup those sites publish for machines
> to read, which is why no API key is involved and why the 2019 API withdrawal
> never closed the route. 31 real events live on the first run. See CLAUDE.md
> (October 2026) for the data-quality traps it has to handle.
>
> tix.africa, 10times.com and bandsintown.com all return **403** to a
> self-identifying client — tix.africa even on `/robots.txt`. Those are
> skipped permanently: a 403 is an answer, not an obstacle, and defeating bot
> protection on a ticketing platform would poison the partnership that is the
> actual way into its catalogue. The agent fetches and enforces `robots.txt`
> at runtime, so this is a property of the code rather than of a comment.
>
> Kept for the record of what was attempted. Do not follow its instructions.

Complete guide to the events integration system for Gidi Vibe Connect.

## Overview

This system automatically syncs events from multiple sources into a unified events database:

- **Eventbrite** - International events platform with public API
- **Nigerian Platforms** - Nairabox, Tix.Africa (via scraping)
- **Manual Entry** - Custom events added via dashboard

## Architecture

```
┌─────────────────┐
│  Eventbrite API │────┐
└─────────────────┘    │
                       │
┌─────────────────┐    │     ┌──────────────────┐
│ Nigerian Events │────┼────>│  Sync Scripts    │
│  (Scrapers)     │    │     │  - Deduplication │
└─────────────────┘    │     │  - Validation    │
                       │     │  - Enrichment    │
┌─────────────────┐    │     └──────────────────┘
│  Manual Entry   │────┘              │
└─────────────────┘                   │
                                      ▼
                            ┌──────────────────┐
                            │  Supabase DB     │
                            │  events table    │
                            └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  Consumer Apps   │
                            │  - Web           │
                            │  - Mobile        │
                            └──────────────────┘
```

## Database Schema

The `events` table stores all events with these key fields:

- **Basic Info**: title, description, category, tags
- **Timing**: start_date, end_date, timezone
- **Location**: venue_name, address, lat/long
- **Ticketing**: price, currency, ticket_url
- **Media**: images, gallery
- **Source Tracking**: source, external_id, external_url
- **Status**: upcoming, ongoing, completed, cancelled

## Setup

### 1. Run the Database Migration

Go to your Supabase Dashboard SQL Editor:
```
https://supabase.com/dashboard/project/xvtjcpwkrsoyrhhptdmc/sql
```

Copy and run:
```
supabase/migrations/20260116000000_create_events_table.sql
```

### 2. Configure API Keys (Optional)

For Eventbrite integration, add to your `.env`:

```bash
# Eventbrite API Token (get from https://www.eventbrite.com/platform/api)
EVENTBRITE_PRIVATE_TOKEN=your_token_here
```

**Note**: The system works without Eventbrite - it will use Nigerian events only.

### 3. Install Dependencies

All dependencies are already installed. The scripts use:
- `@supabase/supabase-js` - Database client
- `dotenv` - Environment variables
- Node.js built-in `fetch` - HTTP requests

## Usage

### Sync All Events (Recommended)

Run the master sync that handles all sources:

```bash
npm run events:sync
```

This will:
1. Check if migration is complete
2. Sync from Eventbrite (if configured)
3. Scrape Nigerian events
4. Display comprehensive summary

### Sync Individual Sources

**Eventbrite only:**
```bash
npm run events:eventbrite
```

**Nigerian platforms only:**
```bash
npm run events:scrape
```

### Automated Syncing

**Option 1: macOS Launchd** (Similar to existing news agent)

Create `scripts/setup-auto-events.sh`:
```bash
#!/bin/bash
# Run events sync daily at 2 AM
0 2 * * * cd /path/to/gidi-vibe-connect-1 && npm run events:sync
```

**Option 2: GitHub Actions** (Recommended for production)

Add to `.github/workflows/sync-events.yml`:
```yaml
name: Sync Events Daily

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run events:sync
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          EVENTBRITE_PRIVATE_TOKEN: ${{ secrets.EVENTBRITE_PRIVATE_TOKEN }}
```

## Event Sources

### 1. Eventbrite

**API Documentation**: https://www.eventbrite.com/platform/api

**Features**:
- ✅ Official API with authentication
- ✅ Rich event metadata
- ✅ Automatic updates
- ✅ Venue information included
- ✅ Organizer details

**Limitations**:
- Requires free API token
- Rate limits apply (1000 requests/hour)
- May not include all Lagos events

**Setup**:
1. Go to https://www.eventbrite.com/platform/api
2. Sign in with Eventbrite account
3. Create a "Private Token"
4. Add to `.env`: `EVENTBRITE_PRIVATE_TOKEN=your_token`

### 2. Nigerian Platforms (Scraped)

**Platforms covered**:
- Nairabox.com - Popular Nigerian ticketing
- Tix.Africa - Pan-African events
- Individual venue websites
- Social media event pages

**Current Implementation**:
The scraper uses **curated sample data** of major Lagos events:
- Felabration
- Lagos Food & Drink Festival
- Detty December concerts
- Art X Lagos
- Lagos Fashion Week
- Lagos Marathon
- Tech meetups

**Future Enhancement**:
Replace with actual web scraping using:
- Puppeteer/Playwright for dynamic content
- Cheerio for static HTML parsing
- Cron jobs for regular updates

### 3. Manual Entry

Events can be manually added via:
- Supabase dashboard
- Custom admin UI (future)
- API endpoint (future)

## Querying Events

### Get Upcoming Events

```javascript
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('is_active', true)
  .gte('start_date', new Date().toISOString())
  .order('start_date', { ascending: true })
  .limit(20);
```

### Search Events

```javascript
const { data: events } = await supabase
  .from('events')
  .select('*')
  .textSearch('title', 'concert')
  .eq('is_active', true);
```

### Filter by Category

```javascript
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('category', 'Music')
  .eq('is_active', true);
```

### Get Events by Date Range

```javascript
const { data: events } = await supabase
  .from('events')
  .select('*')
  .gte('start_date', '2026-05-01')
  .lte('start_date', '2026-05-31')
  .eq('is_active', true);
```

## Features

### Deduplication

Events are deduplicated using `(source, external_id)` unique constraint. If an event already exists, it will be updated instead of creating a duplicate.

### Auto-categorization

Events are categorized based on:
- Eventbrite category mapping
- Keyword detection in title/description
- Venue type
- Organizer profile

### Geo-location

Events include:
- Venue name and address
- Latitude/longitude coordinates (when available)
- Can be used for map views and distance calculations

### Rich Media

Events support:
- Featured images
- Banner images
- Gallery images (multiple)
- External links (website, social media)

## Roadmap

### Phase 1 (Current)
- ✅ Database schema
- ✅ Eventbrite integration
- ✅ Nigerian events (sample data)
- ✅ Basic sync scripts

### Phase 2
- [ ] Actual web scraping for Nigerian platforms
- [ ] Event detail pages in UI
- [ ] User event saves/favorites
- [ ] Event sharing functionality

### Phase 3
- [ ] Event recommendations based on user interests
- [ ] Push notifications for saved events
- [ ] Calendar integration (Google Calendar, Apple Calendar)
- [ ] Ticket purchase integration

### Phase 4
- [ ] User-submitted events with moderation
- [ ] Event RSVPs and attendance tracking
- [ ] Post-event reviews and photos
- [ ] Integration with social features (post to community)

## Troubleshooting

### "Events table does not exist"

Run the migration first:
```bash
# Migration file: supabase/migrations/20260116000000_create_events_table.sql
```

### "Eventbrite API error: Invalid token"

Check your `.env` file:
1. Ensure `EVENTBRITE_PRIVATE_TOKEN` is set
2. Token should start with your Eventbrite API key
3. Get new token from https://www.eventbrite.com/platform/api

### "No events synced"

Check:
1. Database connection (SUPABASE_URL and SERVICE_ROLE_KEY in `.env`)
2. Internet connection
3. API rate limits (Eventbrite: 1000/hour)
4. Run with verbose logging: `node scripts/sync-all-events.js`

### Events not showing in app

1. Verify events exist: Check Supabase dashboard
2. Check `is_active = true` and `start_date` is in future
3. Verify app queries are correct
4. Clear app cache and reload

## API Reference

### Event Object Structure

```typescript
interface Event {
  id: string;
  title: string;
  description?: string;
  short_description?: string;

  category?: string;
  tags?: string[];
  event_type?: string;

  start_date: string; // ISO datetime
  end_date?: string;
  timezone: string;

  venue_name?: string;
  venue_address?: string;
  location: string;
  latitude?: number;
  longitude?: number;

  is_free: boolean;
  ticket_price_min?: number;
  ticket_price_max?: number;
  currency: string;
  ticket_url?: string;

  image_url?: string;
  banner_url?: string;
  gallery_urls?: string[];

  organizer_name?: string;
  organizer_url?: string;

  source: 'eventbrite' | 'nairabox' | 'tix_africa' | 'manual' | 'scraped';
  external_id?: string;
  external_url?: string;

  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  is_featured: boolean;
  is_verified: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review the Supabase dashboard
3. Check script logs for error messages
4. Open an issue on GitHub

## Credits

Built for **Gidi Vibe Connect** - Lagos' premier lifestyle and events discovery platform.

Data sources:
- Eventbrite API
- Nigerian event platforms
- Community contributions
