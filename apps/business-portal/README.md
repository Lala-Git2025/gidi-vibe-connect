# Gidi Business Portal

Business dashboard for venue owners to manage their venues, events, offers, and view analytics.

## Setup

1. **Install dependencies:**
   ```bash
   cd apps/business-portal
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Update `.env` with your Supabase credentials:**
   ```
   VITE_SUPABASE_URL=https://xvtjcpwkrsoyrhhptdmc.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_key_here
   VITE_APP_NAME=Gidi Business Portal
   VITE_CONSUMER_APP_URL=http://localhost:8080
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

   The portal will be available at http://localhost:3001

## Database Setup

Make sure you've run the database migrations in Supabase:
- `20260209000000_business_portal_rls.sql` - RLS policies
- `20260209000001_business_helper_functions.sql` - Helper functions
- `20260209000002_business_indexes.sql` - Performance indexes

## Features

### Phase 1A - Foundation ✅
- [x] Project structure
- [x] Authentication context
- [x] Database migrations
- [ ] Login/Signup pages
- [ ] Dashboard layout

### Phase 1B - Venue Management (Next)
- [ ] Venue CRUD operations
- [ ] Photo upload
- [ ] Subscription limit enforcement
- [ ] Dashboard stats

### Phase 1C - Analytics
- [ ] Analytics tracking
- [ ] Charts and metrics
- [ ] Subscription management

### Phase 2 - Extended Features
- [ ] Event management
- [ ] Offers management
- [ ] Menu management

## Project Structure

```
apps/business-portal/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React contexts (Auth)
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilities (Supabase client)
│   ├── pages/          # Page components
│   ├── types/          # TypeScript types
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Static assets
├── index.html          # HTML template
├── package.json        # Dependencies
├── vite.config.ts      # Vite configuration
├── tailwind.config.ts  # Tailwind configuration
└── tsconfig.json       # TypeScript configuration
```

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **React Query** - Data fetching
- **Supabase** - Backend
- **Recharts** - Analytics charts

## Deployment

To deploy on a separate subdomain:

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to Vercel (or your hosting provider)

3. Configure DNS:
   ```
   Type: CNAME
   Name: business
   Value: business-portal.vercel.app
   TTL: 3600
   ```

4. Access at: `business.gidiconnect.com`

## Development

- Port: 3001 (different from consumer app)
- Hot reload enabled
- TypeScript strict mode
- ESLint configured

## Next Steps

1. Create Login and Signup pages
2. Build Dashboard layout with Sidebar
3. Implement Venue management pages
4. Add Analytics dashboard
