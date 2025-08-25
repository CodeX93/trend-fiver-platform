# Set environment variables
$env:DATABASE_URL="postgresql://postgres:password@localhost:5432/trend_db"
$env:JWT_SECRET="your-secret-key-change-this-in-production"
$env:PORT="5000"
$env:FRONTEND_URL="http://localhost:3000"
$env:BASE_URL="http://localhost:3000"
$env:FROM_EMAIL="noreply@trend-app.com"
$env:BREVO_API_KEY="your-brevo-api-key"
$env:NODE_ENV="development"

# Start the server
Write-Host "Starting Trend backend server..." -ForegroundColor Green
Write-Host "Database: PostgreSQL (Docker)" -ForegroundColor Yellow
Write-Host "Port: 5000" -ForegroundColor Yellow
Write-Host "Admin Email: admin@trend-app.com" -ForegroundColor Yellow
Write-Host "Admin Password: admin123" -ForegroundColor Yellow
Write-Host ""

npx tsx server/index.ts 