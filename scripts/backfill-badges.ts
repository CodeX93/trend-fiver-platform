#!/usr/bin/env tsx

import { db } from '../server/db';
import { backfillBadgesForExistingUsers } from '../server/badge-service';

async function main() {
  try {
    console.log('🚀 Starting badge backfill for existing users...');
    console.log('This will analyze historical data and award badges based on current rules.');
    console.log('');
    
    const result = await backfillBadgesForExistingUsers();
    
    console.log('');
    console.log('✅ Badge backfill completed successfully!');
    console.log('📊 Results:');
    console.log(`   Total users processed: ${result.totalUsers}`);
    console.log(`   Users with new badges: ${result.usersWithNewBadges}`);
    console.log(`   Total badges awarded: ${result.totalBadgesAwarded}`);
    console.log('');
    
    if (result.totalBadgesAwarded > 0) {
      console.log('🎉 New badges were awarded! Users can now see them on their profiles.');
    } else {
      console.log('ℹ️  No new badges were awarded. Users may already have all eligible badges.');
    }
    
    console.log('');
    console.log('💡 You can run this script again anytime to check for new badge eligibility.');
    
  } catch (error) {
    console.error('❌ Error during badge backfill:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// Run the script
main().catch(console.error);
