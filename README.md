# Igani Event Site Generator

A self-serve generator that creates and delivers white-label event sites with AI-powered copy and themes.

## Features

- **AI-Generated Copy**: Custom event copy, emails, and SMS messages using OpenAI
- **Custom Branding**: Upload logos, choose colors, get fully branded event sites
- **GitHub Integration**: Automatic private repository creation in buyer's account
- **ZIP Fallback**: Download option if GitHub integration isn't preferred
- **Stripe Payments**: Secure checkout with multiple pricing tiers
- **Admin Dashboard**: Order management and system monitoring
- **Post-Purchase Portal**: Deployment instructions and support

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Prisma ORM with PostgreSQL (Neon recommended)
- **Payments**: Stripe with webhooks
- **AI**: OpenAI GPT-4 for copy generation
- **Storage**: Vercel Blob or AWS S3 for asset storage
- **GitHub**: GitHub App for repository creation
- **Deployment**: Optimized for Vercel

## Quick Start

### 1. Environment Setup

Copy the environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/igani"

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PLUS=price_...
STRIPE_PRICE_PRO=price_...

# OpenAI
OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Setup

Initialize the database:

```bash
npm run db:migrate
npm run db:generate
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Database Options

#### Neon (Recommended)
- Visit [neon.tech](https://neon.tech)
- Create a new database
- Copy the connection string to `DATABASE_URL`

#### Supabase
- Visit [supabase.com](https://supabase.com)  
- Create a new project
- Copy the connection string to `DATABASE_URL`

## Configuration

### Template File Paths

The system injects generated content into specific files in your template repository. Update `lib/template-paths.ts` to match your template's structure:

```typescript
export const TEMPLATE_PATHS = {
  CONTENT: {
    SITE: 'content/site.json',     // Where site copy is injected
    EMAILS: 'content/emails.json', // Where email templates go
    SMS: 'content/sms.json',       // Where SMS templates go
  },
  BRANDING: {
    THEME: 'theme.json',           // Where theme config is saved
  },
  ASSETS: {
    LOGOS: 'public/assets/logos',   // Logo upload directory
    IMAGES: 'public/assets/images', // Hero image directory
    BRANDING: 'public/branding',    // General branding assets
  }
}
```

Common alternative structures are pre-configured (src-based, data-based, config-based).

### Stripe Setup

1. Create a Stripe account
2. Get your API keys from the Stripe dashboard
3. Create products and prices for your plans
4. Set up webhook endpoint at `your-domain.com/api/stripe/webhook`

### OpenAI Setup

1. Create an OpenAI account
2. Generate an API key
3. Add to `OPENAI_API_KEY` environment variable

### GitHub App & Template Repository

For automatic repository creation from your template:

1. **Create a GitHub App** in your GitHub settings
2. **Configure permissions**: `contents:write`, `metadata:read`, `administration:write`
3. **Generate a private key**
4. **Set up the template repository**:
   - The system is configured to use `https://github.com/Gabrielleubitz/Igani-w-g` as the template
   - Make sure this repository is set as a template repository in GitHub settings
   - Update file paths in `lib/template-paths.ts` if your template structure differs
5. **Add app credentials to environment variables**:
   ```env
   GITHUB_APP_ID=your_app_id
   GITHUB_APP_PRIVATE_KEY="your_private_key"
   GITHUB_APP_CLIENT_ID=your_client_id
   GITHUB_APP_CLIENT_SECRET=your_client_secret
   TEMPLATE_REPO_OWNER=Gabrielleubitz
   TEMPLATE_REPO_NAME=Igani-w-g
   ```

### Storage Setup

Choose between Vercel Blob or AWS S3:

#### Vercel Blob
```env
BLOB_STORE=vercel
VERCEL_BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

#### AWS S3
```env
BLOB_STORE=s3
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_REGION=us-east-1
```

## API Documentation

### Health Check
`GET /api/health` - Check system status

### Generate Copy
`POST /api/generate-copy` - Generate AI copy for order

### Stripe Webhook
`POST /api/stripe/webhook` - Handle Stripe payment events

### Download
`GET /api/download/[orderId]` - Download ZIP package

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── checkout/          # Payment flow
│   ├── orders/            # Post-purchase portal
│   └── start/             # Questionnaire
├── components/            # React components
│   └── ui/               # Reusable UI components
├── lib/                  # Utility libraries
│   ├── actions.ts        # Server actions
│   ├── github.ts         # GitHub integration
│   ├── prisma.ts         # Database client
│   ├── storage.ts        # File storage
│   └── types.ts          # TypeScript types
├── prisma/               # Database schema and migrations
└── middleware.ts         # Security middleware
```

## Security Features

- **Secure Headers**: XSS protection, content type sniffing prevention
- **Input Validation**: Zod schemas for all user inputs
- **Rate Limiting**: Basic API rate limiting (enhance for production)
- **CORS Protection**: Restricted to allowed origins
- **Webhook Verification**: Stripe webhook signature verification
- **Environment Isolation**: Separate configs for dev/staging/production

## Monitoring

### Health Checks
- Database connectivity
- Stripe API status
- OpenAI API status
- GitHub App connectivity
- Storage service status

### Admin Dashboard
- Order tracking and management
- Revenue analytics
- System health monitoring
- Customer support tools

## License

This project is proprietary software. All rights reserved.

## Support

For technical support or questions:
- Email: support@igani.co
- Documentation: [docs.igani.co](https://docs.igani.co)

---

Built with ❤️ using Next.js, TypeScript, and AI.
