#!/usr/bin/env bun
import { logger } from '../lib/core/debug/server-logger';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function recreateHeadDoctor() {
  const email = 'headdoctor@test.com';
  const password = 'Headdoctor123!';
  const name = 'Test Head Doctor';
  const role = 'head_doctor';
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
    
    await db.execute(sql`
      UPDATE "user" 
      SET 
        role = ${role},
        "organization_id" = ${org.id},
        "default_hospital_id" = ${hospital.id},
        "email_verified" = true,
        "needs_profile_completion" = false
      WHERE id = ${registerData.user.id};
    `);
    
    // Create healthcare user entry
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
      logger.info('\n📋 Head Doctor Credentials:');
      logger.info('┌─────────────────────────────────────────┐');
      logger.info('│ Email:    headdoctor@test.com           │');
      logger.info('│ Password: Headdoctor123!                │');
      logger.info('└─────────────────────────────────────────┘');
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

recreateHeadDoctor()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });