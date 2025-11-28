# Vercel Deployment Guide

This guide explains how to deploy your application to Vercel with persistent data storage using Vercel KV.

## Overview

The application now supports both local development (using file system) and production deployment (using Vercel KV Redis database) automatically.

## Local Development

- ✅ **Works as before** - Uses local JSON files for data storage
- ✅ **No setup required** - File system storage is automatic
- ✅ **Data persists** between server restarts

## Production Deployment (Vercel)

### Step 1: Set up Vercel KV Database

1. **Go to your Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project

2. **Create a KV Database**
   - Go to the **Storage** tab
   - Click **Create Database**
   - Select **KV (Redis)**
   - Choose a database name (e.g., "igani-data")
   - Select a region (choose closest to your users)
   - Click **Create**

3. **Connect Database to Project**
   - In the KV database page, click **Connect Project**
   - Select your project from the dropdown
   - Click **Connect**

This automatically adds the required environment variables to your project:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### Step 2: Deploy to Vercel

1. **Push your code to GitHub** (already done!)

2. **Deploy via Vercel Dashboard**
   - Your project should auto-deploy when you push to main branch
   - Or manually trigger a deployment from the Vercel dashboard

3. **Verify deployment**
   - Check that both `/funnels` and `/admin` pages work
   - Test setting offer end dates in the admin panel
   - Test form submissions on the landing page

## How It Works

### Automatic Database Selection

The application automatically chooses the right storage method:

```typescript
// Production (Vercel with KV)
if (process.env.KV_REST_API_URL) {
  await kv.set('offer-settings', settings)  // Uses Vercel KV
}

// Local Development  
else {
  await fs.writeFile('data/offer-settings.json', data)  // Uses files
}
```

### Data Migration

- **Local to Vercel**: Data doesn't auto-migrate. You'll start fresh on Vercel.
- **Manual migration**: If you need to migrate data, you can:
  1. Export data from local files
  2. Import via Vercel KV dashboard or API

## Features That Work on Vercel

✅ **Real Countdown Timer**
- Admin can set offer end dates
- Data persists in Vercel KV
- Works across all serverless function invocations

✅ **Lead Tracking** 
- Form submissions saved to Vercel KV
- Admin panel shows all leads
- Data persists permanently

✅ **Admin Panel**
- All tabs work: Leads, Offers, etc.
- Data loads from Vercel KV in production

## Troubleshooting

### Issue: "Failed to save offer settings" on Vercel

**Solution**: Make sure Vercel KV is properly connected
1. Go to Vercel Dashboard → Your Project → Storage
2. Verify KV database is connected
3. Check Environment Variables tab for KV_* variables

### Issue: Data not persisting

**Solution**: Verify KV connection
1. Check Vercel function logs for KV errors
2. Ensure KV database is in the same region as your functions
3. Verify environment variables are set correctly

### Issue: Local development broken

**Solution**: The code falls back to file system automatically
- If you see "KV not available, using file system fallback" - this is normal
- Local development should work exactly as before

## Cost Information

- **Vercel KV Pricing**: Has a generous free tier
- **Usage**: For small to medium traffic, likely stays within free limits
- **Upgrade**: Can upgrade if you exceed free tier limits

## Alternative Storage Options

If you prefer different storage, you can modify the API files to use:
- **Vercel Postgres** (SQL database)
- **PlanetScale** (MySQL)
- **Supabase** (PostgreSQL)
- **MongoDB Atlas**

The current implementation makes it easy to swap storage backends.

---

**Next Steps**: Deploy and test! Your landing page upgrades should now work perfectly on Vercel.