/**
 * Server-safe Better Auth configuration
 * This file is used for API routes and server-side code
 * No React Native or browser dependencies
 */

// Ensure environment variables are loaded
import 'dotenv/config';
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
// import { expo } from "@better-auth/expo"; // Temporarily disabled
import { 
  oAuthProxy, 
  organization, 
  admin, 
  magicLink, 
  twoFactor, 
  bearer, 
  multiSession,
  emailOTP,
  phoneNumber
} from "better-auth/plugins";
import { db } from "@/src/db";
import * as schema from "@/src/db/schema";
import { emailService } from "@/src/server/services/email";
// import { notificationService, NotificationType, Priority } from "@/src/server/services/notifications";
import * as crypto from "crypto";

// Import server-safe logger
import { logger } from '@/lib/core/debug/server-logger';

// Server-safe base URL configuration
const getBaseURL = () => {
  // Better Auth v1 expects the base URL without /api/auth
  // It will add /api/auth internally
  
  // Force localhost for OAuth to work properly
  return 'http://localhost:8081';
};

const getTrustedOrigins = () => {
  const origins = [
    "http://localhost:8081",
    "http://localhost:8082",
    "http://localhost:3000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
    "http://127.0.0.1:3000",
  ];
  
  // Add production origins from environment
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
  }
  
  if (process.env.NODE_ENV === "development") {
    origins.push(
      "https://*.exp.direct",
      "https://*.exp.host",
      "https://*.expo.dev",
      "https://*.expo.io"
    );
    
    const localIP = process.env.LOCAL_IP || "192.168.1.101";
    origins.push(
      `http://${localIP}:8081`,
      `http://${localIP}:8082`,
      `http://${localIP}:3000`,
      `http://${localIP}:19000`,
      `http://${localIP}:19001`,
      `http://${localIP}:19002`
    );
  }

  return origins;
};

// Debug environment variables on load (only once)
let hasLoggedConfig = false;
if (process.env.NODE_ENV === 'development' && !hasLoggedConfig) {
  hasLoggedConfig = true;
  logger.system.info('Auth server environment variables', {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'NOT SET',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
    BETTER_AUTH_BASE_URL: process.env.BETTER_AUTH_BASE_URL || 'NOT SET',
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  });
  
  // Validate OAuth configuration
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    logger.auth.info('Google OAuth configured', {
      redirectURI: `${getBaseURL()}/api/auth/callback/google`
    });
    
    // Check if client ID looks valid
    if (!process.env.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
      logger.auth.warn('Google Client ID doesn\'t match expected format');
    }
  }
}

export const auth = betterAuth({
  baseURL: getBaseURL(),
  secret: process.env.BETTER_AUTH_SECRET || "your-secret-key-change-in-production",
  
  // Disable CSRF check in development for tunnel URLs
  ...(process.env.NODE_ENV === "development" && {
    disableCsrf: true,
  }),
  
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema },
  }),
  
  // Email and password configuration
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.EXPO_PUBLIC_REQUIRE_EMAIL_VERIFICATION === 'true',
    sendResetPassword: async ({ user, url }) => {
      logger.auth.info('Password reset link generated', { email: user.email, url });
      
      // Send password reset email using our notification service
      // await notificationService.send({
      //   type: NotificationType.AUTH_RESET_PASSWORD,
      //   recipient: {
      //     userId: user.id,
      //     email: user.email,
      //   },
      //   priority: Priority.HIGH,
      //   data: {
      //     name: user.name || user.email,
      //     resetUrl: url,
      //     expirationTime: '1 hour',
      //     ipAddress: 'System Generated',
      //     userAgent: 'Hospital Alert System',
      //   },
      // });
      console.log('Password reset email would be sent to:', user.email, 'with URL:', url);
    },
    sendVerificationEmail: async ({ user, url }) => {
      logger.auth.info('Email verification link generated', { email: user.email, url });
      
      // Send verification email using our notification service
      // await notificationService.send({
      //   type: NotificationType.AUTH_VERIFY_EMAIL,
      //   recipient: {
      //     userId: user.id,
      //     email: user.email,
      //   },
      //   priority: Priority.HIGH,
      //   data: {
      //     name: user.name || user.email,
      //     verificationUrl: url,
      //     expirationTime: '24 hours',
      //   },
      // });
      console.log('Verification email would be sent to:', user.email, 'with URL:', url);
    },
  },
  
  // Social providers
  socialProviders: {
    google: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // redirectURI is automatically set by Better Auth
    } : undefined,
  },
  
  // User configuration
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      organizationId: {
        type: "string",
        required: false,
      },
      needsProfileCompletion: {
        type: "boolean",
        required: true,
        defaultValue: true,
      },
      defaultHospitalId: {
        type: "string",
        required: false,
      },
      contactPreferences: {
        type: "string",
        required: false,
        defaultValue: '{"email": true, "push": true, "sms": false}',
      },
    },
  },
  
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  
  // Plugins
  plugins: [
    // expo(), // Temporarily disabled - causing issues
    bearer(), // Enable Bearer token authentication for mobile
    oAuthProxy(), // Enable OAuth proxy for mobile
    multiSession({ 
      maximumSessions: 5 
    }),
    organization({
      allowUserToCreateOrganization: true,
      membershipLimits: {
        'free': 5,
        'pro': 50,
        'enterprise': -1,
      },
      // Configure organization roles for healthcare
      roles: {
        admin: {},
        head_doctor: {},
        doctor: {},
        nurse: {},
        operator: {},
        member: {},
      }
    }),
    admin({
      defaultRole: 'user',
      adminUserIds: process.env.ADMIN_USER_IDS?.split(',') || []
    }),
    // Email OTP for verification
    emailOTP({
      sendVerificationOtp: async ({ email, otp, type }) => {
        logger.auth.info('Sending email OTP', { email, type });
        
        try {
          await emailService.send({
            to: email,
            subject: type === 'sign-in' ? 'Sign in to Hospital Alert System' : 'Verify your email',
            template: 'auth.verify',
            data: {
              name: email.split('@')[0],
              code: otp,
              type,
            },
          });
        } catch (error) {
          logger.auth.error('Failed to send OTP email', error);
          throw new Error('Failed to send verification email');
        }
      },
      otpLength: 6,
      expiresIn: 15 * 60, // 15 minutes
    }),
    // Phone number for SMS alerts
    phoneNumber(),
    // Two-factor authentication for healthcare staff
    twoFactor({
      issuer: 'Hospital Alert System',
      // Automatically enable for healthcare roles
      backupCodeCount: 8,
    }),
    // Magic link for passwordless sign-in
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        logger.auth.info('Sending magic link', { email });
        
        try {
          await emailService.send({
            to: email,
            subject: 'Sign in to Hospital Alert System',
            html: `
              <h2>Sign in to Hospital Alert System</h2>
              <p>Click the link below to sign in:</p>
              <a href="${url}" style="background-color: #FF1493; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Sign In</a>
              <p>This link will expire in 15 minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
            `,
            text: `Sign in to Hospital Alert System\n\nClick here to sign in: ${url}\n\nThis link will expire in 15 minutes.`,
          });
        } catch (error) {
          logger.auth.error('Failed to send magic link', error);
          throw new Error('Failed to send magic link email');
        }
      },
      expiresIn: 15 * 60, // 15 minutes
    }),
  ],
  
  // Trusted origins for CORS
  trustedOrigins: getTrustedOrigins(),
  
  // Advanced configuration
  advanced: {
    // Cookie configuration based on Better Auth v1 documentation
    // https://www.better-auth.com/docs/concepts/cookies
    cookies: {
      // Session token cookie
      "better-auth.session-token": {
        name: "better-auth.session-token",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
      // CSRF token cookie
      "better-auth.csrf": {
        name: "better-auth.csrf",
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
      // Session data cookie (for client-side access)
      "better-auth.session-data": {
        name: "better-auth.session-data",
        httpOnly: false, // Allow client-side access
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
    // Generate session ID
    generateSessionId: () => crypto.randomBytes(32).toString('hex'),
    // Disable CSRF in development for easier testing
    csrf: {
      enabled: process.env.NODE_ENV === "production",
    },
  },
  
  // Rate limiting
  rateLimit: {
    window: 15 * 60,
    max: process.env.NODE_ENV === "production" ? 100 : 1000,
    storage: "memory",
  },
  
  // CORS configuration
  cors: {
    origin: (origin: string) => {
      // Allow all origins in development
      if (process.env.NODE_ENV === "development") {
        return true;
      }
      
      const staticOrigins = getTrustedOrigins();
      if (staticOrigins.includes(origin)) {
        return true;
      }
      
      const tunnelPatterns = [
        /^https:\/\/[\w-]+\.exp\.direct$/,
        /^https:\/\/[\w-]+\.exp\.host$/,
        /^https:\/\/[\w-]+\.expo\.dev$/,
        /^https:\/\/[\w-]+\.expo\.io$/,
      ];
      
      return tunnelPatterns.some(pattern => pattern.test(origin));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
  
  // Logging
  logger: {
    level: process.env.NODE_ENV === "production" ? "error" : "debug",
    disabled: false,
  },
  
  // Error handling
  onError: (error: any, request: Request) => {
    logger.auth.error('Authentication error', error);
    
    // Log additional context for debugging
    const errorContext = {
      message: error.message,
      code: error.code,
      status: error.status,
      path: new URL(request.url).pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip'),
    };
    
    logger.auth.error('Auth error details', errorContext);
    
    // Rate limit specific error handling
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return {
        message: 'Too many requests. Please try again later.',
        status: 429,
        retryAfter: error.retryAfter || 60,
      };
    }
    
    // Handle specific error types with appropriate messages
    const errorMessages: Record<string, string> = {
      INVALID_CREDENTIALS: 'Invalid email or password',
      EMAIL_NOT_VERIFIED: 'Please verify your email address',
      ACCOUNT_LOCKED: 'Account temporarily locked due to suspicious activity',
      SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
      INVALID_TOKEN: 'Invalid or expired token',
    };
    
    if (process.env.NODE_ENV === "production") {
      return {
        message: errorMessages[error.code] || "An error occurred during authentication",
        status: error.status || 500,
      };
    }
    
    return {
      message: error.message,
      status: error.status || 500,
      code: error.code,
    };
  },
  
  // Callbacks for user management
  callbacks: {
    signIn: {
      async before({ user, isNewUser }) {
        logger.auth.debug('[AUTH CALLBACK] Sign in before', { 
          userId: user?.id, 
          isNewUser,
          existingRole: user?.role,
          existingNeedsProfileCompletion: user?.needsProfileCompletion
        });
        
        // For new OAuth users, set profile completion requirement
        if (isNewUser) {
          // Set a temporary role that indicates profile completion is needed
          user.role = 'user'; // Basic role until they complete profile
          // New OAuth users need to complete their profile
          user.needsProfileCompletion = true;
          logger.auth.debug('[AUTH CALLBACK] New OAuth user, setting needsProfileCompletion=true, role=user');
        } else if (!user.role || user.role === 'user' || user.role === 'guest' || !user.organizationId) {
          // For existing users without proper role/org, also require profile completion
          user.needsProfileCompletion = true;
          user.role = user.role || 'user';
          logger.auth.debug('[AUTH CALLBACK] Existing user needs profile completion', {
            userId: user.id,
            role: user.role,
            hasOrganization: !!user.organizationId
          });
        } else {
          // Check if existing user is healthcare role without organization/hospital
          const healthcareRoles = ['doctor', 'nurse', 'head_doctor', 'operator'];
          if (healthcareRoles.includes(user.role) && (!user.organizationId || !user.defaultHospitalId)) {
            user.needsProfileCompletion = true;
            logger.auth.debug('[AUTH CALLBACK] Healthcare user without proper setup, setting needsProfileCompletion=true', {
              userId: user.id,
              role: user.role,
              hasOrganization: !!user.organizationId,
              hasHospital: !!user.defaultHospitalId
            });
          } else {
            // For existing users with completed profiles, preserve their status
            logger.auth.debug('[AUTH CALLBACK] Existing user with completed profile');
          }
        }
      },
      async after({ user, session, request }) {
        logger.auth.info('User signed in', {
          userId: user.id,
          email: user.email,
          role: user.role,
          needsProfileCompletion: user.needsProfileCompletion,
          method: request?.method,
          userAgent: request?.headers?.get('user-agent')
        });
      }
    }
  },
});

export type Auth = typeof auth;