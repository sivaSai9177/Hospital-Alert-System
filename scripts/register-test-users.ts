#!/usr/bin/env bun
import { logger } from '../lib/core/debug/server-logger';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

const testUsers = [
  { email: 'operator@test.com', password: 'Operator123!', name: 'Test Operator', role: 'operator' },
  { email: 'doctor@test.com', password: 'Doctor123!', name: 'Test Doctor', role: 'doctor' },
  { email: 'admin@test.com', password: 'Admin123!', name: 'Test Admin', role: 'admin' },
];

async function registerUser(email: string, password: string, name: string, role: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';
  
  try {
    logger.info(`Registering ${email}...`);
    
    // First delete any existing account entries for this user
    const userResult = await db.execute(sql`
      SELECT id FROM "user" WHERE email = ${email};
    `);
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      // Delete existing account entries
      await db.execute(sql`
        DELETE FROM account WHERE "user_id" = ${userId};
      `);
      logger.info(`Cleaned up existing account entries for ${email}`);
    }
    
    // Register via Better Auth
    const registerResponse = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });
    
    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      if (errorText.includes('USER_ALREADY_EXISTS')) {
        logger.info(`User already exists: ${email}, attempting login...`);
        
        // Try to login instead
        const loginResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          logger.info(`✅ Login successful for existing user: ${email}`);
          
          // Update role if needed
          if (loginData.user && loginData.user.id) {
            await updateUserRole(loginData.user.id, role);
          }
          return true;
        } else {
          logger.error(`❌ Login also failed for ${email}`);
          return false;
        }
      } else {
        logger.error(`❌ Registration failed for ${email}: ${registerResponse.status} - ${errorText}`);
        return false;
      }
    }
    
    const registerData = await registerResponse.json();
    
    if (!registerData.user) {
      logger.error(`❌ Registration failed for ${email}: No user data received`);
      return false;
    }
    
    logger.info(`✅ Registered successfully: ${email}`);
    
    // Update role and organization
    await updateUserRole(registerData.user.id, role);
    
    return true;
  } catch (error: any) {
    logger.error(`❌ Error registering ${email}:`, {
      error: error.message || error,
      code: error.code,
    });
    return false;
  }
}

async function updateUserRole(userId: string, role: string) {
  try {
    // Get organization and hospital
    const orgResult = await db.execute(sql`SELECT id FROM organization LIMIT 1;`);
    const org = orgResult.rows[0];
    
    const hospitalResult = await db.execute(sql`
      SELECT id FROM hospitals 
      WHERE "organization_id" = ${org.id} 
      LIMIT 1;
    `);
    const hospital = hospitalResult.rows[0];
    
    const needsHospital = ['operator', 'nurse', 'doctor', 'head_doctor', 'head_nurse'].includes(role);
    
    await db.execute(sql`
      UPDATE "user" 
      SET 
        role = ${role},
        "organization_id" = ${org.id},
        "default_hospital_id" = ${needsHospital ? hospital.id : null},
        "needs_profile_completion" = false
      WHERE id = ${userId};
    `);
    
    logger.info(`Updated role to ${role} for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to update role for user ${userId}:`, error);
  }
}

async function main() {
  logger.info('📝 Registering test users via Better Auth...\n');
  
  let successCount = 0;
  
  for (const user of testUsers) {
    const success = await registerUser(user.email, user.password, user.name, user.role);
    if (success) successCount++;
    console.log(''); // Add spacing
  }
  
  logger.info(`\n📊 Results: ${successCount}/${testUsers.length} successful registrations`);
  
  if (successCount === testUsers.length) {
    logger.info('✅ All test users registered successfully!');
    logger.info('\n📋 Test Credentials:');
    logger.info('┌─────────────────────────────────────────┐');
    logger.info('│ Operator: operator@test.com             │');
    logger.info('│ Doctor:   doctor@test.com               │');
    logger.info('│ Admin:    admin@test.com                │');
    logger.info('│ Password: [Role]123! (e.g. Doctor123!)  │');
    logger.info('└─────────────────────────────────────────┘');
  } else {
    logger.error('❌ Some test users failed to register');
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});