# Deployment Guide

## Overview
This guide covers deploying the Trend Fiver prediction platform with all the new features including the prediction evaluation system, sentiment analysis, and admin tools.

## Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Redis server (for BullMQ workers)
- Railway account (or similar hosting platform)

## Environment Variables

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Authentication
JWT_SECRET=your-super-secure-jwt-secret-key

# Redis (for BullMQ workers)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Email Service (Brevo/SendGrid)
BREVO_API_KEY=your-brevo-api-key
FROM_EMAIL=noreply@yourdomain.com

# Application
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
BASE_URL=https://yourdomain.com

# Timezone
DEFAULT_TIMEZONE=Europe/Berlin
```

### Optional Environment Variables
```bash
# External API Keys (if using premium services)
EXCHANGERATE_API_KEY=your-exchangerate-api-key
COINGECKO_API_KEY=your-coingecko-api-key
YAHOO_FINANCE_API_KEY=your-yahoo-api-key
```

## Database Setup

### 1. Run Database Migrations
```bash
npm run db:push
```

### 2. Initialize Database
```bash
npm run db:init
```

### 3. Seed Admin User
```bash
npm run seed-admin
```

## Starting the Application

### Development Mode
```bash
# Start backend with all workers
npm run dev

# Start frontend only
npm run dev:frontend
```

### Production Mode
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## Worker Processes

The application now includes background workers that need to be running:

### 1. Prediction Evaluation Worker
- **Purpose**: Evaluates expired predictions and calculates scores
- **Frequency**: Runs every 5 minutes
- **Dependencies**: Redis, PostgreSQL

### 2. Leaderboard Archiving Worker
- **Purpose**: Archives monthly leaderboards and assigns badges
- **Frequency**: Runs monthly on the 1st at 00:00 CEST
- **Dependencies**: Redis, PostgreSQL

### Starting Workers
The workers are automatically started with the main application. For production, you may want to run them separately:

```bash
# Start prediction evaluation worker
tsx server/workers/predictionEvaluator.ts

# Start leaderboard archiving worker
tsx server/workers/leaderboardArchiver.ts
```

## Railway Deployment

### 1. Connect to Railway
```bash
railway login
railway link
```

### 2. Set Environment Variables
```bash
railway variables set DATABASE_URL=your-postgres-url
railway variables set JWT_SECRET=your-jwt-secret
railway variables set REDIS_HOST=your-redis-host
railway variables set REDIS_PORT=6379
railway variables set REDIS_PASSWORD=your-redis-password
railway variables set BREVO_API_KEY=your-brevo-key
railway variables set FROM_EMAIL=noreply@yourdomain.com
railway variables set NODE_ENV=production
railway variables set DEFAULT_TIMEZONE=Europe/Berlin
```

### 3. Deploy
```bash
railway up
```

### 4. Run Database Setup
```bash
railway run npm run setup
```

## Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run
```

### Test Coverage
The test suite includes:
- Slot logic library tests
- DST edge case tests
- Timezone handling tests

## API Endpoints

### New Endpoints Added

#### Sentiment Analysis
```
GET /api/sentiment/:assetSymbol/:duration
```
- Returns aggregated sentiment data by slot
- Requires authentication and email verification
- Privacy: Only visible to logged-in, verified users

#### Prediction History
```
GET /api/users/:userId/predictions
```
- Returns user's prediction history
- Privacy: Full access for self/followers, 403 for others
- Supports filtering and pagination

#### Admin Endpoints
```
GET /api/admin/predictions
POST /api/admin/predictions/:id/evaluate
POST /api/admin/prices/recalc
POST /api/admin/leaderboard/recalc
```
- All require admin authentication
- Manual evaluation and system management tools

## Monitoring and Maintenance

### Health Checks
```bash
# Check application health
curl https://yourdomain.com/api/health

# Check worker status (admin only)
curl -H "Authorization: Bearer admin-token" https://yourdomain.com/api/admin/health
```

### Logs
Monitor the following logs:
- Prediction evaluation worker logs
- Leaderboard archiving logs
- Price fetching errors
- Authentication failures

### Database Maintenance
- Monitor prediction table growth
- Archive old predictions periodically
- Check for failed evaluations

## Security Considerations

### JWT Security
- Use a strong, unique JWT_SECRET
- Rotate secrets periodically
- Monitor for token abuse

### Rate Limiting
- Implement rate limiting on auth endpoints
- Monitor for brute force attempts
- Set appropriate limits for API endpoints

### Data Privacy
- Ensure follower privacy rules are enforced
- Audit admin access logs
- Monitor for data access violations

## Troubleshooting

### Common Issues

#### Workers Not Starting
- Check Redis connection
- Verify environment variables
- Check database connectivity

#### Predictions Not Evaluating
- Check worker logs
- Verify price data availability
- Check slot timing logic

#### Sentiment Data Not Loading
- Verify user authentication
- Check email verification status
- Monitor API rate limits

### Debug Commands
```bash
# Check Redis connection
redis-cli ping

# Check database connection
railway run npm run db:check

# Test slot logic
npm run test:run server/lib/slots.test.ts
```

## Performance Optimization

### Database Indexes
The following indexes are automatically created:
- `idx_pred_user` on predictions(userId)
- `idx_pred_status_expires` on predictions(status, timestampExpiration)
- `idx_pred_asset_slotstart` on predictions(assetId, slotStart)
- `idx_pred_evaluated_at` on predictions(evaluatedAt)
- `idx_asset_prices_asset_time` on asset_prices(assetId, timestamp)

### Caching
- Implement Redis caching for frequently accessed data
- Cache sentiment data for 5 minutes
- Cache user profiles and leaderboards

### Worker Optimization
- Adjust worker concurrency based on load
- Monitor worker queue lengths
- Scale workers horizontally if needed

## Backup and Recovery

### Database Backups
```bash
# Create backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

### Worker Recovery
- Workers automatically retry failed jobs
- Failed predictions are marked for manual review after 6 attempts
- Use admin endpoints to manually evaluate stuck predictions

## Updates and Migrations

### Schema Updates
```bash
# Push schema changes
npm run db:push

# Run migrations
railway run npm run db:migrate
```

### Worker Updates
- Deploy new worker code
- Restart worker processes
- Monitor for any issues

## Support

For issues and questions:
1. Check the logs for error messages
2. Verify environment variables
3. Test with the provided test suite
4. Check the troubleshooting section above 