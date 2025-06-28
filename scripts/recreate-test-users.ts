#!/usr/bin/env bun
import { logger } from '../lib/core/debug/server-logger';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const testUsers = [
  { email: 'operator@test.com', password: 'Operator123!', name: 'Test Operator', role: 'operator' },
  { email: 'doctor@test.com', password: 'Doctor123!', name: 'Test Doctor', role: 'doctor' },
  { email: 'admin@test.com', password: 'Admin123!', name: 'Test Admin', role: 'admin' },
];

async function deleteAndRecreateUser(email: string, password: string, name: string, role: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';
  
  try {
    logger.info(`Processing ${email}...`);
    
    // First delete the user completely
    const userResult = await db.execute(sql`
      SELECT id FROM "user" WHERE email = ${email};
    `);
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      
      // Delete from all related tables
      await db.execute(sql`DELETE FROM account WHERE "user_id" = ${userId};`);
      await db.execute(sql`DELETE FROM session WHERE "user_id" = ${userId};`);
      await db.execute(sql`DELETE FROM healthcare_users WHERE "user_id" = ${userId};`);
      await db.execute(sql`DELETE FROM "user" WHERE id = ${userId};`);
      
      logger.info(`Deleted existing user: ${email}`);
    }
    
    // Now register fresh via Better Auth
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
      logger.error(`❌ Registration failed for ${email}: ${registerResponse.status} - ${errorText}`);
      return false;
    }
    
    const registerData = await registerResponse.json();
    
    if (!registerData.user) {
      logger.error(`❌ Registration failed for ${email}: No user data received`);
      return false;
    }
    
    logger.info(`✅ Registered successfully: ${email}`);
    
    // Update role and organization
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
        "email_verified" = true,
        "needs_profile_completion" = false
      WHERE id = ${registerData.user.id};
    `);
    
    // Create healthcare user entry if needed
    if (needsHospital) {
      try {
        await db.execute(sql`
          INSERT INTO healthcare_users (
            "user_id", 
            "hospital_id", 
            department, 
            "is_on_duty"
          ) VALUES (
            ${registerData.user.id},
            ${hospital.id},
            'general',
            false
          ) ON CONFLICT ("user_id") DO NOTHING;
        `);
      } catch (err) {
        // Healthcare user entry is optional, log but don't fail
        logger.warn(`Could not create healthcare user entry for ${email}: ${err}`);
      }
    }
    
    // Verify login works
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
      logger.info(`✅ Login verification successful for ${email}`);
      return true;
    } else {
      const loginError = await loginResponse.text();
      logger.error(`❌ Login verification failed for ${email}: ${loginError}`);
      return false;
    }
    
  } catch (error: any) {
    logger.error(`❌ Error processing ${email}:`, {
      error: error.message || error,
      code: error.code,
    });
    return false;
  }
}

async function main() {
  logger.info('🔄 Recreating test users from scratch...\n');
  
  let successCount = 0;
  
  for (const user of testUsers) {
    const success = await deleteAndRecreateUser(user.email, user.password, user.name, user.role);
    if (success) successCount++;
    console.log(''); // Add spacing
  }
  
  logger.info(`\n📊 Results: ${successCount}/${testUsers.length} successful recreations`);
  
  if (successCount === testUsers.length) {
    logger.info('✅ All test users recreated successfully!');
    logger.info('\n📋 Test Credentials:');
    logger.info('┌─────────────────────────────────────────┐');
    logger.info('│ Operator: operator@test.com             │');
    logger.info('│ Doctor:   doctor@test.com               │');
    logger.info('│ Admin:    admin@test.com                │');
    logger.info('│ Password: [Role]123! (e.g. Doctor123!)  │');
    logger.info('└─────────────────────────────────────────┘');
  } else {
    logger.error('❌ Some test users failed to recreate');
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});