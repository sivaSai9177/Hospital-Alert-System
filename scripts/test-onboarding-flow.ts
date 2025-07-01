#!/usr/bin/env bun

/**
 * Test script to verify onboarding flow is triggered correctly
 */

import 'dotenv/config';
import { db } from '@/src/db';
import { user as userTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

async function testOnboardingFlow() {
  console.log('🔍 Testing Onboarding Flow...\n');

  try {
    // Check for test users
    const testEmail = 'onboarding.test@example.com';
    
    // Look for existing test user
    const [existingUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, testEmail))
      .limit(1);
    
    if (existingUser) {
      console.log('📧 Found test user:', {
        email: existingUser.email,
        emailVerified: existingUser.emailVerified,
        needsProfileCompletion: existingUser.needsProfileCompletion,
        role: existingUser.role,
        createdAt: existingUser.createdAt,
      });

      console.log('\n🔄 Onboarding conditions:');
      console.log('- Email verified:', existingUser.emailVerified ? '✅' : '❌');
      console.log('- Needs profile completion:', existingUser.needsProfileCompletion ? '✅' : '❌');
      console.log('- Role is basic/guest:', ['user', 'guest'].includes(existingUser.role || '') ? '✅' : '❌');
      
      const shouldTriggerOnboarding = 
        !existingUser.emailVerified || 
        existingUser.needsProfileCompletion === true || 
        existingUser.role === 'user' || 
        !existingUser.role || 
        existingUser.role === 'guest';
      
      console.log('\n🚀 Should trigger onboarding:', shouldTriggerOnboarding ? 'YES ✅' : 'NO ❌');
      
      // Delete the test user for clean testing
      console.log('\n🗑️  Deleting test user for clean testing...');
      await db.delete(userTable).where(eq(userTable.email, testEmail));
      console.log('✅ Test user deleted');
    } else {
      console.log('❌ No test user found');
    }

    // Check recently created users
    console.log('\n📊 Recent users (last 5):');
    const recentUsers = await db
      .select()
      .from(userTable)
      .orderBy(userTable.createdAt)
      .limit(5);
    
    for (const user of recentUsers) {
      const shouldOnboard = 
        !user.emailVerified || 
        user.needsProfileCompletion === true || 
        user.role === 'user' || 
        !user.role || 
        user.role === 'guest';
        
      console.log(`\n- ${user.email}:`);
      console.log(`  Role: ${user.role || 'none'}`);
      console.log(`  Email verified: ${user.emailVerified ? '✅' : '❌'}`);
      console.log(`  Needs profile: ${user.needsProfileCompletion ? '✅' : '❌'}`);
      console.log(`  Should onboard: ${shouldOnboard ? 'YES' : 'NO'}`);
    }

    console.log('\n✅ Onboarding flow test complete!');
    console.log('\n💡 To test the flow:');
    console.log('1. Register a new user at /auth/register');
    console.log('2. You should be redirected to /onboarding/welcome');
    console.log('3. The user should NOT be automatically logged in');
    
  } catch (error) {
    console.error('❌ Error testing onboarding flow:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testOnboardingFlow();