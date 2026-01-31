# Eventbrite API Integration Setup

## Overview

The events system is fully configured to pull real events from Eventbrite API. You just need to add your API token.

## How to Get Eventbrite API Token

1. **Create an Eventbrite Account** (if you don't have one)
   - Go to https://www.eventbrite.com
   - Sign up for a free account

2. **Register Your Application**
   - Go to https://www.eventbrite.com/platform/api
   - Click "Get Started" or "Create App"
   - Fill in your app details:
     - App Name: Gidi Vibe Connect
     - App Description: Lagos events discovery platform
     - Website URL: Your website URL

3. **Get Your Private Token**
   - After creating the app, you'll see your **Private Token**
   - Copy this token (it looks like: `ABCD1234567890EXAMPLE`)

4. **Add Token to .env File**
   - Open `/Users/femimoritiwon/gidi-vibe-connect-1/.env`
   - Add this line:
     ```
     EVENTBRITE_PRIVATE_TOKEN=your_token_here
     ```
   - Replace `your_token_here` with your actual token

## Testing the Integration

Once you've added the token, test it:

```bash
npm run events:eventbrite
```

You should see:
- ✅ Eventbrite API connection successful
- Events being synced from Lagos, Nigeria
- Events saved to database

## Syncing All Event Sources

To sync events from all sources (Eventbrite + Nigerian scrapers):

```bash
npm run events:sync
```

This will:
1. Fetch events from Eventbrite API (Lagos, Nigeria)
2. Scrape Nigerian event sites
3. Merge and deduplicate all events
4. Save to Supabase database

## Automated Daily Sync

To set up automatic daily syncing:

```bash
npm run events:auto:install
```

This creates a cron job that runs daily at 6 AM to keep events fresh.

To uninstall:
```bash
npm run events:auto:uninstall
```

## Available npm Scripts

- `npm run events:sync` - Sync all event sources
- `npm run events:eventbrite` - Sync only Eventbrite
- `npm run events:scrape` - Scrape Nigerian sites only
- `npm run events:test` - Test the events system
- `npm run events:auto:install` - Setup auto-sync
- `npm run events:auto:uninstall` - Remove auto-sync

## Event Sources

Currently integrated:
- ✅ Eventbrite API (requires token)
- ✅ Nigerian venues (web scraping)
- ✅ Sample curated events

Planned:
- Nairabox.com (ticketing platform)
- Tix.Africa (African events)
- Social media events

## Troubleshooting

### "No Eventbrite token" error
- Make sure `EVENTBRITE_PRIVATE_TOKEN` is in your `.env` file
- Check there are no quotes around the token
- Verify the token is valid at https://www.eventbrite.com/platform/api

### No events showing up
- Run `npm run events:sync` to populate database
- Check Supabase dashboard → events table
- Verify events have `is_active: true` and `status: 'upcoming'`

### API rate limits
- Eventbrite free tier: 1000 requests/hour
- If you hit limits, the system will fall back to cached events
- Consider upgrading Eventbrite plan for higher limits

## Support

For Eventbrite API documentation:
- https://www.eventbrite.com/platform/api

For issues with this integration:
- Check logs in `logs/` directory
- Review EVENTS-INTEGRATION.md for system architecture
