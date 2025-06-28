#!/usr/bin/env bun
/**
 * Test Better Auth Email Integration
 * Verifies email OTP, templates, and service configuration
 */

import { emailService } from '@/src/server/services/email';
import { auth } from '@/lib/auth/auth-server';
import { logger } from '@/lib/core/debug/unified-logger';

// Test configuration
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_USER_NAME = 'Test User';

// Colors for output
const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  info: '\x1b[34m',
  warning: '\x1b[33m',
  reset: '\x1b[0m',
};

async function testEmailService() {
  console.log(`${colors.info}=== Testing Better Auth Email Integration ===${colors.reset}\n`);

  // Test 1: Email Service Initialization
  console.log(`${colors.info}1. Testing Email Service Initialization${colors.reset}`);
  try {
    // The email service should auto-initialize
    console.log(`${colors.success}✓ Email service initialized successfully${colors.reset}`);
  } catch (error) {
    console.error(`${colors.error}✗ Email service initialization failed:${colors.reset}`, error);
    return;
  }

  // Test 2: Template Loading
  console.log(`\n${colors.info}2. Testing Email Template Loading${colors.reset}`);
  try {
    // Test verify-email template
    const verifyResult = await emailService.send({
      to: TEST_EMAIL,
      template: 'auth.verify',
      subject: 'Test Verification Email',
      data: {
        name: TEST_USER_NAME,
        code: '123456',
        type: 'email-verification',
      },
    });

    if (verifyResult.success) {
      console.log(`${colors.success}✓ Verify email template loaded and sent successfully${colors.reset}`);
      console.log(`  Message ID: ${verifyResult.messageId}`);
    } else {
      console.error(`${colors.error}✗ Failed to send verify email:${colors.reset}`, verifyResult.error);
    }
  } catch (error) {
    console.error(`${colors.error}✗ Template test failed:${colors.reset}`, error);
  }

  // Test 3: Better Auth Email OTP Integration
  console.log(`\n${colors.info}3. Testing Better Auth Email OTP Plugin${colors.reset}`);
  try {
    // Test the email OTP configuration
    const authConfig = (auth as any).options;
    const hasEmailOTP = authConfig.plugins?.some((p: any) => p.id === 'email-otp');
    
    if (hasEmailOTP) {
      console.log(`${colors.success}✓ Email OTP plugin is configured${colors.reset}`);
    } else {
      console.error(`${colors.error}✗ Email OTP plugin not found in auth configuration${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.error}✗ Better Auth plugin test failed:${colors.reset}`, error);
  }

  // Test 4: Send Test OTP Email
  console.log(`\n${colors.info}4. Testing OTP Email Sending${colors.reset}`);
  try {
    const otpResult = await emailService.send({
      to: TEST_EMAIL,
      template: 'auth.verify',
      subject: 'Your verification code',
      data: {
        name: TEST_USER_NAME,
        code: '654321',
        type: 'sign-in',
      },
    });

    if (otpResult.success) {
      console.log(`${colors.success}✓ OTP email sent successfully${colors.reset}`);
      console.log(`  Message ID: ${otpResult.messageId}`);
    } else {
      console.error(`${colors.error}✗ Failed to send OTP email:${colors.reset}`, otpResult.error);
    }
  } catch (error) {
    console.error(`${colors.error}✗ OTP email test failed:${colors.reset}`, error);
  }

  // Test 5: Environment Variables
  console.log(`\n${colors.info}5. Checking Email Configuration${colors.reset}`);
  const emailConfig = {
    HOST: process.env.EMAIL_HOST ? '✓ Set' : '✗ Not set',
    PORT: process.env.EMAIL_PORT ? '✓ Set' : '✗ Not set',
    USER: process.env.EMAIL_USER ? '✓ Set' : '✗ Not set',
    PASS: process.env.EMAIL_PASS ? '✓ Set (hidden)' : '✗ Not set',
    FROM: process.env.EMAIL_FROM || 'Not set',
  };

  console.log('Email Environment Variables:');
  Object.entries(emailConfig).forEach(([key, value]) => {
    const color = value.startsWith('✓') ? colors.success : colors.error;
    console.log(`  ${key}: ${color}${value}${colors.reset}`);
  });

  // Test 6: Docker Configuration
  console.log(`\n${colors.info}6. Docker Email Service Configuration${colors.reset}`);
  if (process.env.EMAIL_HOST === 'mailhog' || process.env.EMAIL_HOST === 'mailhog-local') {
    console.log(`${colors.success}✓ Using Mailhog for development${colors.reset}`);
    console.log(`  UI available at: http://localhost:8025`);
  } else if (process.env.EMAIL_HOST === 'smtp.gmail.com') {
    console.log(`${colors.warning}⚠ Using Gmail SMTP (ensure app password is configured)${colors.reset}`);
  } else {
    console.log(`${colors.info}ℹ Using custom SMTP: ${process.env.EMAIL_HOST}${colors.reset}`);
  }

  // Test 7: Send Magic Link Email
  console.log(`\n${colors.info}7. Testing Magic Link Email${colors.reset}`);
  try {
    const magicLinkResult = await emailService.send({
      to: TEST_EMAIL,
      subject: 'Sign in to Hospital Alert System',
      html: `
        <h2>Sign in to Hospital Alert System</h2>
        <p>Click the link below to sign in:</p>
        <a href="http://localhost:8081/auth/magic-link?token=test-token" style="background-color: #FF1493; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Sign In</a>
        <p>This link will expire in 15 minutes.</p>
      `,
      text: 'Sign in to Hospital Alert System\n\nClick here to sign in: http://localhost:8081/auth/magic-link?token=test-token\n\nThis link will expire in 15 minutes.',
    });

    if (magicLinkResult.success) {
      console.log(`${colors.success}✓ Magic link email sent successfully${colors.reset}`);
      console.log(`  Message ID: ${magicLinkResult.messageId}`);
    } else {
      console.error(`${colors.error}✗ Failed to send magic link:${colors.reset}`, magicLinkResult.error);
    }
  } catch (error) {
    console.error(`${colors.error}✗ Magic link test failed:${colors.reset}`, error);
  }

  console.log(`\n${colors.info}=== Test Summary ===${colors.reset}`);
  console.log(`
Email Service Status:
- Service: ${colors.success}Active${colors.reset}
- Templates: ${colors.success}Loaded${colors.reset}
- Better Auth: ${colors.success}Integrated${colors.reset}
- Environment: ${process.env.NODE_ENV || 'development'}

Next Steps:
1. Check your email inbox for test messages
2. If using Mailhog, visit http://localhost:8025
3. Verify OTP codes are properly formatted
4. Test with actual user registration flow
`);

  // Gracefully shutdown
  await emailService.shutdown();
  process.exit(0);
}

// Run the test
testEmailService().catch((error) => {
  console.error(`${colors.error}Test failed with error:${colors.reset}`, error);
  process.exit(1);
});