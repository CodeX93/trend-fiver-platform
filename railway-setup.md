# Railway Deployment Setup Guide

## 🚀 Your Railway Project
- **Project URL**: https://railway.com/project/98bc1437-3f9f-4632-8ead-775664a258a0
- **Project Name**: natural-pest
- **Status**: ✅ PostgreSQL Database Added

## 📋 Next Steps

### 1. Get Database URL
1. Go to your Railway dashboard: https://railway.com/project/98bc1437-3f9f-4632-8ead-775664a258a0
2. Click on the **PostgreSQL service** (should be listed as a separate service)
3. Go to **"Connect"** tab
4. Copy the **"Postgres Connection URL"** (format: `postgresql://username:password@host:port/database`)

### 2. Set Environment Variables
Once you have the database URL, set these environment variables:

```bash
# Database
DATABASE_URL=your-postgres-connection-url

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production

# Server Configuration
NODE_ENV=production
PORT=5000

# Frontend Configuration (will be set automatically)
FRONTEND_URL=https://your-app-url.railway.app
BASE_URL=https://your-app-url.railway.app

# Email Configuration (optional for now)
FROM_EMAIL=noreply@trend-app.com
BREVO_API_KEY=your-brevo-api-key
```

### 3. Set Variables via CLI
```bash
railway variables --set "DATABASE_URL=your-postgres-url"
railway variables --set "FRONTEND_URL=https://your-app-url.railway.app"
railway variables --set "BASE_URL=https://your-app-url.railway.app"
```

### 4. Deploy
```bash
railway up
```

## 🎯 Expected Result
After setting the DATABASE_URL, your app should:
1. ✅ Connect to PostgreSQL database
2. ✅ Run database migrations automatically
3. ✅ Create default admin user
4. ✅ Start successfully on Railway

## 🔧 Troubleshooting
- If you can't find the PostgreSQL service, try refreshing the dashboard
- Make sure the DATABASE_URL format is correct
- Check Railway logs for any connection errors 