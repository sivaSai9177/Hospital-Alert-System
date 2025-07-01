#!/usr/bin/env bun

/**
 * Debug script to simulate registration and check auth state
 */

import 'dotenv/config';
import { auth } from '@/lib/auth/auth-server';
import { db } from '@/src/db';
import { user as userTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

async function debugRegistration() {
  console.log('🔍 Debug Registration Flow...\n');

  const testEmail = `test.onboarding.${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    console.log('1️⃣ Creating new user via Better Auth...');
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email: testEmail,
        password: testPassword,
        name: 'Test User',
      },
    });

    if (!signUpResponse || !signUpResponse.user) {
      console.error('❌ Failed to create user');
      return;
    }

    console.log('✅ User created:', {
      id: signUpResponse.user.id,
      email: signUpResponse.user.email,
      token: signUpResponse.token ? 'Present' : 'Missing',
    });

    // Check database state
    console.log('\n2️⃣ Checking database state...');
    const [dbUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, signUpResponse.user.id))
      .limit(1);

    if (dbUser) {
      console.log('📊 Database user state:', {
        email: dbUser.email,
        role: dbUser.role || 'undefined',
        emailVerified: dbUser.emailVerified,
        needsProfileCompletion: dbUser.needsProfileCompletion,
      });

      // Check onboarding conditions
      const shouldTriggerOnboarding = 
        !dbUser.emailVerified || 
        dbUser.needsProfileCompletion === true || 
        dbUser.role === 'user' || 
        !dbUser.role || 
        dbUser.role === 'guest';

      console.log('\n3️⃣ Onboarding check:');
      console.log('Should trigger onboarding:', shouldTriggerOnboarding ? 'YES ✅' : 'NO ❌');

      // Update user to ensure onboarding conditions
      console.log('\n4️⃣ Updating user to ensure onboarding triggers...');
      await db.update(userTable)
        .set({
          role: 'user',
          needsProfileCompletion: true,
          emailVerified: false,
        })
        .where(eq(userTable.id, signUpResponse.user.id));

      console.log('✅ User updated for onboarding');

      // Clean up
      console.log('\n5️⃣ Cleaning up test user...');
      await db.delete(userTable).where(eq(userTable.id, signUpResponse.user.id));
      console.log('✅ Test user deleted');
    }

    console.log('\n✅ Debug complete!');
    console.log('\n📝 Summary:');
    console.log('- New users are created with role "user" by default');
    console.log('- needsProfileCompletion should be set to true for healthcare roles');
    console.log('- emailVerified is false by default');
    console.log('- These conditions should trigger onboarding redirect');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Run debug
debugRegistration();