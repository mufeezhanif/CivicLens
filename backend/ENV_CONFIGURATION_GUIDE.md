# Environment Configuration Guide

Complete guide for configuring CivicLens environment variables.

## Table of Contents
- [Quick Start](#quick-start)
- [Redis Setup](#redis-setup)
- [Firebase/FCM Setup](#firebasefcm-setup)
- [Image Processing](#image-processing)
- [SLA Escalation](#sla-escalation)
- [Data Retention/GDPR](#data-retentiongdpr)
- [All Configuration Options](#all-configuration-options)

## Quick Start

1. Copy the example file:
```bash
cp .env.example .env
```

2. Update required variables:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Secure random string for JWT tokens
   - `CLOUDINARY_*` - Image storage credentials
   - `SMTP_*` - Email server credentials
   - `GROQ_API_KEY` - AI classification (free at console.groq.com)

3. Optional: Configure advanced features:
   - Redis caching
   - Firebase push notifications
   - Image compression settings
   - SLA escalation rules
   - Data retention policies

## Redis Setup

### Option 1: Use In-Memory Fallback (Default)
Leave Redis variables empty to use built-in fallback:
```env
REDIS_URL=
```

### Option 2: Local Redis Server
Install Redis locally and configure:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Install Redis:**
- **Windows**: Use [Memurai](https://www.memurai.com/) or [Redis for Windows](https://github.com/microsoftarchive/redis/releases)
- **Mac**: `brew install redis && brew services start redis`
- **Linux**: `sudo apt install redis-server && sudo systemctl start redis`

### Option 3: Cloud Redis (Production)
Use hosted Redis service:
```env
REDIS_URL=redis://username:password@your-redis-host:6379
```

**Recommended Providers:**
- **Upstash** - https://upstash.com/ (Free tier: 10K commands/day)
- **Redis Cloud** - https://redis.com/redis-enterprise-cloud/pricing/ (Free 30MB)
- **AWS ElastiCache** - https://aws.amazon.com/elasticache/
- **Azure Cache for Redis** - https://azure.microsoft.com/en-us/products/cache

### Cache TTL Configuration
Adjust how long data is cached (in seconds):
```env
CACHE_TTL_UC_BOUNDARIES=86400    # 24 hours
CACHE_TTL_CATEGORIES=86400       # 24 hours
CACHE_TTL_STATS=300              # 5 minutes
CACHE_TTL_COMPLAINTS=60          # 1 minute
CACHE_TTL_DEFAULT=3600           # 1 hour
```

## Firebase/FCM Setup

Push notifications require Firebase Cloud Messaging setup.

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Create new project or use existing
3. Add web app to project

### 2. Generate Service Account Key
1. Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save JSON file as `firebase-service-account.json`
4. Place in `backend/config/`

### 3. Configure Environment Variables
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
FIREBASE_PROJECT_ID=your-project-id
PUSH_NOTIFICATIONS_ENABLED=true
```

### 4. Get VAPID Keys (for Web Push)
1. Project Settings → Cloud Messaging
2. Under "Web Push certificates" click "Generate key pair"
3. Copy keys to:
```env
FCM_VAPID_PUBLIC_KEY=your-public-key
FCM_VAPID_PRIVATE_KEY=your-private-key
```

### Disable Push Notifications
If you don't need push notifications:
```env
PUSH_NOTIFICATIONS_ENABLED=false
FIREBASE_SERVICE_ACCOUNT_PATH=
```

## Image Processing

CivicLens uses Sharp.js for image optimization.

### Default Settings (Recommended)
```env
IMAGE_COMPRESSION_ENABLED=true
IMAGE_OUTPUT_FORMAT=webp
IMAGE_QUALITY=80
IMAGE_MAX_FILE_SIZE=5242880        # 5MB
IMAGE_MAX_DIMENSIONS=1920          # 1920x1920 max
```

### High Quality Settings
For better image quality (larger files):
```env
IMAGE_QUALITY=90
IMAGE_MAX_DIMENSIONS=2560
IMAGE_OUTPUT_FORMAT=jpeg
```

### Low Bandwidth Settings
For slower networks (smaller files):
```env
IMAGE_QUALITY=60
IMAGE_MAX_DIMENSIONS=1280
IMAGE_THUMBNAIL_WIDTH=200
IMAGE_THUMBNAIL_HEIGHT=200
```

### Disable Compression
To disable image compression:
```env
IMAGE_COMPRESSION_ENABLED=false
```

## SLA Escalation

Service Level Agreement rules for complaint escalation.

### Enable/Disable
```env
SLA_ESCALATION_ENABLED=true           # Enable/disable auto-escalation
SLA_ESCALATION_CRON=*/15 * * * *      # Run every 15 minutes
```

### Cron Schedule Options
```env
SLA_ESCALATION_CRON=*/15 * * * *      # Every 15 minutes (default)
SLA_ESCALATION_CRON=*/30 * * * *      # Every 30 minutes
SLA_ESCALATION_CRON=0 * * * *         # Every hour
SLA_ESCALATION_CRON=0 */2 * * *       # Every 2 hours
```

### Customize SLA Hours by Category
Adjust response times for each complaint category:

```env
# Roads (in hours)
SLA_ROADS_LOW=72        # 3 days
SLA_ROADS_MEDIUM=48     # 2 days
SLA_ROADS_HIGH=24       # 1 day
SLA_ROADS_CRITICAL=12   # 12 hours

# Water Supply
SLA_WATER_LOW=48
SLA_WATER_MEDIUM=24
SLA_WATER_HIGH=12
SLA_WATER_CRITICAL=6

# Garbage Collection
SLA_GARBAGE_LOW=48
SLA_GARBAGE_MEDIUM=24
SLA_GARBAGE_HIGH=12
SLA_GARBAGE_CRITICAL=6
```

### Escalation Levels
Configure when complaints escalate:
```env
SLA_ESCALATION_LEVEL_1=0      # UC Level (immediate)
SLA_ESCALATION_LEVEL_2=24     # Town Level (after 24h)
SLA_ESCALATION_LEVEL_3=48     # City Level (after 48h)
SLA_ESCALATION_LEVEL_4=72     # Critical Level (after 72h)
```

## Data Retention/GDPR

Compliance with data privacy regulations.

### Enable/Disable
```env
DATA_RETENTION_ENABLED=true           # Enable/disable data retention
DATA_RETENTION_CRON=0 2 * * *         # Run daily at 2 AM
```

### Retention Periods
```env
DATA_RETENTION_COMPLAINT_ACTIVE=2          # Keep active complaints for 2 years
DATA_RETENTION_COMPLAINT_ARCHIVED=5        # Keep archived for 5 years
DATA_RETENTION_USER_DELETION_GRACE_PERIOD=30  # 30 days before deletion
```

### Anonymization
```env
DATA_ANONYMIZE_OLD_COMPLAINTS=true    # Auto-anonymize old complaints
DATA_ANONYMIZE_AFTER_YEARS=3          # After 3 years
```

### User Data Export
```env
DATA_EXPORT_FORMAT=json               # Export format (json/csv)
DATA_EXPORT_INCLUDE_MEDIA=false       # Include images in export
```

## WebSocket Configuration

Real-time updates configuration.

```env
WEBSOCKET_ENABLED=true
WEBSOCKET_CORS_ORIGIN=http://localhost:5173
WEBSOCKET_PING_TIMEOUT=60000          # 60 seconds
WEBSOCKET_PING_INTERVAL=25000         # 25 seconds
WEBSOCKET_MAX_HTTP_BUFFER_SIZE=1e6    # 1MB
WEBSOCKET_TRANSPORTS=websocket,polling
```

## MongoDB Connection Pool

Optimize database connections.

```env
MONGODB_MAX_POOL_SIZE=10              # Maximum connections
MONGODB_MIN_POOL_SIZE=2               # Minimum connections
MONGODB_SERVER_SELECTION_TIMEOUT=30000  # 30 seconds
MONGODB_SOCKET_TIMEOUT=45000          # 45 seconds
MONGODB_CONNECT_TIMEOUT=30000         # 30 seconds
MONGODB_MAX_IDLE_TIME=30000           # 30 seconds
```

**Adjust for production:**
- High traffic: Increase `MAX_POOL_SIZE` to 50-100
- Low resources: Decrease to 5-10

## Performance Configuration

### Compression
```env
COMPRESSION_ENABLED=true
COMPRESSION_LEVEL=6              # 1-9 (higher = better compression, slower)
COMPRESSION_THRESHOLD=1024       # Only compress responses > 1KB
```

### Body Size Limits
```env
BODY_PARSER_JSON_LIMIT=10mb
BODY_PARSER_URLENCODED_LIMIT=10mb
```

### Rate Limiting
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # 100 requests per window
```

## Feature Flags

Enable/disable platform features:

```env
FEATURE_BLOCKCHAIN_ENABLED=true
FEATURE_HEATMAP_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true
FEATURE_REPORTS_ENABLED=true
FEATURE_NOTIFICATIONS_ENABLED=true
FEATURE_OFFLINE_MODE_ENABLED=true
```

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
LOG_LEVEL=debug
RATE_LIMIT_ENABLED=false
COOKIE_SECURE=false
```

### Production
```env
NODE_ENV=production
LOG_LEVEL=error
RATE_LIMIT_ENABLED=true
COOKIE_SECURE=true
COMPRESSION_ENABLED=true
```

### Testing
```env
NODE_ENV=test
LOG_LEVEL=silent
MONGODB_URI=mongodb://localhost:27017/civiclens_test
```

## Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use strong JWT_SECRET** - Generate with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. **Enable HTTPS in production** - Set `COOKIE_SECURE=true`
4. **Restrict CORS** - Set specific origins instead of `*`
5. **Use environment variables** - Never hardcode credentials

## Troubleshooting

### Redis Connection Failed
```
✅ Solution: Redis URL not configured. Using in-memory cache fallback.
```
This is normal if Redis is not installed. The app will work fine with in-memory caching.

### Firebase Not Configured
```
⚠️ Solution: Firebase credentials not configured. Push notifications disabled.
```
Push notifications are optional. App works without them.

### Image Processing Errors
Check Sharp.js installation:
```bash
npm rebuild sharp
```

### MongoDB Connection Issues
Verify connection string and network access:
```bash
mongosh "your-connection-string"
```

## Getting Help

- **Documentation**: `/backend/README.md`
- **API Guide**: `/backend/API_ENDPOINTS.md`
- **Testing Guide**: `/backend/API_TESTING_GUIDE.md`
- **LLM Guide**: `/backend/LLM_GUIDE.md`

## Quick Reference

| Feature | Required Variables | Optional |
|---------|-------------------|----------|
| **Core API** | `MONGODB_URI`, `JWT_SECRET` | - |
| **Email** | `SMTP_*`, `EMAIL_FROM` | - |
| **Images** | `CLOUDINARY_*` | `IMAGE_*` |
| **AI** | `GROQ_API_KEY` | `AI_*` |
| **Redis** | - | `REDIS_*` |
| **Push Notifications** | - | `FIREBASE_*`, `FCM_*` |
| **SLA Escalation** | - | `SLA_*` |
| **Data Retention** | - | `DATA_*` |
| **WebSocket** | - | `WEBSOCKET_*` |
