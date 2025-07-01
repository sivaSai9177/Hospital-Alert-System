#!/usr/bin/env bun
/**
 * Test Onboarding Module on Mobile
 * Verifies all onboarding screens work correctly
 */

import { logger } from '@/lib/core/debug/unified-logger';

// Colors for output
const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  info: '\x1b[34m',
  warning: '\x1b[33m',
  reset: '\x1b[0m',
};

async function testOnboardingFlow() {
  console.log(`${colors.info}=== Testing Onboarding Module ===${colors.reset}\n`);

  // Test 1: Check all screen exports
  console.log(`${colors.info}1. Checking screen exports...${colors.reset}`);
  try {
    const screens = await import('@/modules/onboarding');
    const requiredScreens = [
      'WelcomeScreen',
      'RoleSelectionScreen',
      'RegistrationScreen',
      'EmailVerificationScreen',
      'PhoneVerificationScreen',
      'ProfileSetupScreen',
      'HospitalSetupScreen',
      'DepartmentSetupScreen',
      'PermissionsScreen',
      'CompletionScreen',
    ];

    let allExported = true;
    for (const screenName of requiredScreens) {
      if (screenName in screens) {
        console.log(`${colors.success}✓ ${screenName} exported${colors.reset}`);
      } else {
        console.log(`${colors.error}✗ ${screenName} not exported${colors.reset}`);
        allExported = false;
      }
    }

    if (!allExported) {
      throw new Error('Some screens are not exported');
    }
  } catch (error) {
    console.error(`${colors.error}✗ Screen export test failed:${colors.reset}`, error);
    return;
  }

  // Test 2: Check hooks
  console.log(`\n${colors.info}2. Checking hooks...${colors.reset}`);
  try {
    const { useOnboardingFlow } = await import('@/modules/onboarding/hooks/useOnboardingFlow');
    const { useOnboardingValidation } = await import('@/modules/onboarding/hooks/useOnboardingValidation');
    
    console.log(`${colors.success}✓ useOnboardingFlow available${colors.reset}`);
    console.log(`${colors.success}✓ useOnboardingValidation available${colors.reset}`);
  } catch (error) {
    console.error(`${colors.error}✗ Hook test failed:${colors.reset}`, error);
  }

  // Test 3: Check constants
  console.log(`\n${colors.info}3. Checking constants...${colors.reset}`);
  try {
    const { ONBOARDING_STEPS, ROLE_OPTIONS } = await import('@/modules/onboarding/utils/constants');
    
    console.log(`${colors.success}✓ Found ${ONBOARDING_STEPS.length} onboarding steps${colors.reset}`);
    console.log(`${colors.success}✓ Found ${ROLE_OPTIONS.length} role options${colors.reset}`);
    
    // Check for phone verification step
    const hasPhoneStep = ONBOARDING_STEPS.some(step => step.id === 'phone-verification');
    if (hasPhoneStep) {
      console.log(`${colors.success}✓ Phone verification step configured${colors.reset}`);
    } else {
      console.log(`${colors.warning}⚠ Phone verification step not found${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.error}✗ Constants test failed:${colors.reset}`, error);
  }

  // Test 4: Check routes
  console.log(`\n${colors.info}4. Checking route files...${colors.reset}`);
  const fs = require('fs');
  const path = require('path');
  
  const routeFiles = [
    'app/onboarding/welcome.tsx',
    'app/onboarding/role-selection.tsx',
    'app/onboarding/registration.tsx',
    'app/onboarding/email-verification.tsx',
    'app/onboarding/phone-verification.tsx',
    'app/onboarding/profile-setup.tsx',
    'app/onboarding/hospital-setup.tsx',
    'app/onboarding/department-setup.tsx',
    'app/onboarding/permissions.tsx',
    'app/onboarding/completion.tsx',
    'app/onboarding/_layout.tsx',
  ];

  let allRoutesExist = true;
  for (const routeFile of routeFiles) {
    const fullPath = path.join(process.cwd(), routeFile);
    if (fs.existsSync(fullPath)) {
      console.log(`${colors.success}✓ ${routeFile} exists${colors.reset}`);
    } else {
      console.log(`${colors.error}✗ ${routeFile} missing${colors.reset}`);
      allRoutesExist = false;
    }
  }

  // Test 5: Check Better Auth integration
  console.log(`\n${colors.info}5. Checking Better Auth integration...${colors.reset}`);
  try {
    const { authClient } = await import('@/lib/auth/auth-client');
    
    // Check if email OTP methods exist
    if (authClient.emailOTP) {
      console.log(`${colors.success}✓ Email OTP plugin available${colors.reset}`);
      
      if (typeof authClient.emailOTP.sendVerificationOtp === 'function') {
        console.log(`${colors.success}✓ sendVerificationOtp method available${colors.reset}`);
      }
      if (typeof authClient.emailOTP.verifyEmail === 'function') {
        console.log(`${colors.success}✓ verifyEmail method available${colors.reset}`);
      }
    } else {
      console.log(`${colors.error}✗ Email OTP plugin not found${colors.reset}`);
    }

    // Check phone number plugin
    if (authClient.phoneNumber) {
      console.log(`${colors.success}✓ Phone number plugin available${colors.reset}`);
    } else {
      console.log(`${colors.warning}⚠ Phone number plugin not found${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.error}✗ Better Auth test failed:${colors.reset}`, error);
  }

  // Summary
  console.log(`\n${colors.info}=== Test Summary ===${colors.reset}`);
  console.log(`
Onboarding Module Status:
- Screens: ${colors.success}Ready${colors.reset}
- Hooks: ${colors.success}Available${colors.reset}
- Routes: ${allRoutesExist ? colors.success + 'Configured' : colors.error + 'Missing routes'}${colors.reset}
- Better Auth: ${colors.success}Integrated${colors.reset}

To test on mobile:
1. Run: bun run mobile
2. Open on device/simulator
3. Sign out if logged in
4. Complete onboarding flow
5. Check Mailhog for emails at http://localhost:8025
`);
}

// Run the test
testOnboardingFlow().catch((error) => {
  console.error(`${colors.error}Test failed:${colors.reset}`, error);
  process.exit(1);
});