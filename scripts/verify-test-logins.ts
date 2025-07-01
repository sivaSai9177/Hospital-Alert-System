#!/usr/bin/env bun
import { logger } from '../lib/core/debug/server-logger';

const testUsers = [
  { email: 'operator@test.com', password: 'Operator123!', expectedRole: 'operator' },
  { email: 'doctor@test.com', password: 'Doctor123!', expectedRole: 'doctor' },
  { email: 'admin@test.com', password: 'Admin123!', expectedRole: 'admin' },
];

async function verifyLogin(email: string, password: string, expectedRole: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';
  
  try {
    logger.info(`Testing login for ${email}...`);
    
    // Test login via Better Auth
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
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      logger.error(`❌ Login failed for ${email}: ${loginResponse.status} - ${error}`);
      return false;
    }
    
    const loginData = await loginResponse.json();
    
    if (!loginData.user) {
      logger.error(`❌ Login failed for ${email}: No user data received`);
      return false;
    }
    
    if (loginData.user.role !== expectedRole) {
      logger.error(`❌ Role mismatch for ${email}: expected ${expectedRole}, got ${loginData.user.role}`);
      return false;
    }
    
    logger.info(`✅ Login successful for ${email}`, {
      userId: loginData.user.id,
      role: loginData.user.role,
      organizationId: loginData.user.organizationId,
      defaultHospitalId: loginData.user.defaultHospitalId,
    });
    
    return true;
  } catch (error: any) {
    logger.error(`❌ Login failed for ${email}:`, {
      error: error.message || error,
      code: error.code,
    });
    return false;
  }
}

async function main() {
  logger.info('🔐 Verifying test user logins...\n');
  
  let successCount = 0;
  
  for (const user of testUsers) {
    const success = await verifyLogin(user.email, user.password, user.expectedRole);
    if (success) successCount++;
    console.log(''); // Add spacing
  }
  
  logger.info(`\n📊 Results: ${successCount}/${testUsers.length} successful logins`);
  
  if (successCount === testUsers.length) {
    logger.info('✅ All test users can login successfully!');
  } else {
    logger.error('❌ Some test users failed to login');
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});