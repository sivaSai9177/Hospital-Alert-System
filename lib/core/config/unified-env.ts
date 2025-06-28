/**
 * Unified Environment Configuration
 * Handles all environment scenarios: local, network, tunnel, OAuth
 */

// Platform detection that works on both client and server
const getPlatform = () => {
  // Server-side check
  if (typeof window === 'undefined') {
    return { OS: 'server' };
  }
  
  // Client-side - try to use React Native Platform if available
  try {
    const { Platform } = require('react-native');
    return Platform;
  } catch (e) {
    // Fallback for web or when React Native is not available
    return { OS: 'web' };
  }
};

const Platform = getPlatform();

export type EnvironmentMode = 'local' | 'network' | 'tunnel' | 'production';

interface EnvConfig {
  apiUrl: string;
  authUrl: string;
  authBaseUrl: string;
  databaseUrl: string;
  mode: EnvironmentMode;
  isOAuthSafe: boolean;
  wsUrl: string;
  wsEnabled: boolean;
  wsPort: number;
  redisUrl: string;
  logging: {
    enabled: boolean;
    serviceUrl: string;
    batchSize: number;
    flushInterval: number;
  };
  posthog: {
    enabled: boolean;
    apiKey: string;
    apiHost: string;
    projectApiKey?: string;
  };
  email: {
    servicePort: number;
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
}

/**
 * Generate WebSocket URL from HTTP URL
 */
function generateWebSocketUrl(httpUrl: string): string {
  const wsPort = parseInt(process.env.EXPO_PUBLIC_WS_PORT || '3002', 10);
  const wsUrl = httpUrl
    .replace(/^http:/, 'ws:')
    .replace(/^https:/, 'wss:')
    .replace(/:8081/, `:${wsPort}`);
  
  // Ensure the WebSocket URL includes the tRPC path
  // Remove any existing /api/trpc path and add it consistently
  const baseUrl = wsUrl.replace(/\/api\/trpc$/, '');
  return `${baseUrl}/api/trpc`;
}

/**
 * Get common service configurations
 */
function getCommonServiceConfig() {
  return {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    logging: {
      enabled: process.env.LOGGING_SERVICE_ENABLED === 'true',
      serviceUrl: process.env.EXPO_PUBLIC_LOGGING_SERVICE_URL || process.env.LOGGING_SERVICE_URL || 'http://logging-local:3003',
      batchSize: parseInt(process.env.LOGGING_BATCH_SIZE || '50', 10),
      flushInterval: parseInt(process.env.LOGGING_FLUSH_INTERVAL || '5000', 10),
    },
    posthog: {
      enabled: process.env.EXPO_PUBLIC_POSTHOG_ENABLED === 'true' || process.env.POSTHOG_ENABLED === 'true' || !!process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
      apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY || process.env.POSTHOG_API_KEY || '',
      apiHost: process.env.EXPO_PUBLIC_POSTHOG_API_HOST || process.env.POSTHOG_API_HOST || 'https://app.posthog.com',
      projectApiKey: process.env.POSTHOG_PROJECT_API_KEY,
    },
    email: {
      servicePort: parseInt(process.env.EMAIL_SERVICE_PORT || '3001', 10),
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
      from: process.env.EMAIL_FROM || 'noreply@hospital-alert-system.com',
    },
  };
}

/**
 * Detect current environment mode
 */
function detectEnvironmentMode(): EnvironmentMode {
  // Check if we're in tunnel mode
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname.includes('.exp.direct') || hostname.includes('.exp.host')) {
      return 'tunnel';
    }
  }
  
  // Check environment variables
  const appEnv = process.env.APP_ENV;
  if (appEnv === 'production' || process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  // Check if explicitly set to local
  if (appEnv === 'local' || process.env.EXPO_PUBLIC_API_URL?.includes('localhost')) {
    return 'local';
  }
  
  // Default to network mode for development
  return 'network';
}

/**
 * Get unified environment configuration
 */
export function getUnifiedEnvConfig(): EnvConfig {
  const mode = detectEnvironmentMode();
  
  switch (mode) {
    case 'local':
      const localUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';
      return {
        apiUrl: localUrl,
        authUrl: localUrl,
        authBaseUrl: `${localUrl}/api/auth`,
        databaseUrl: process.env.DATABASE_URL || 'postgresql://myexpo:myexpo123@localhost:5432/myexpo_dev',
        mode: 'local',
        isOAuthSafe: true, // localhost is OAuth-safe
        wsUrl: generateWebSocketUrl(localUrl),
        wsEnabled: true, // Always enable WebSocket for healthcare features
        wsPort: parseInt(process.env.EXPO_PUBLIC_WS_PORT || '3002', 10),
        ...getCommonServiceConfig(),
      };
      
    case 'tunnel':
      const tunnelUrl = getTunnelUrl();
      return {
        apiUrl: tunnelUrl,
        authUrl: tunnelUrl,
        authBaseUrl: `${tunnelUrl}/api/auth`,
        databaseUrl: process.env.DATABASE_URL || 'postgresql://myexpo:myexpo123@localhost:5432/myexpo_dev',
        mode: 'tunnel',
        isOAuthSafe: true, // Public URLs are OAuth-safe
        wsUrl: generateWebSocketUrl(tunnelUrl),
        wsEnabled: true, // Always enable WebSocket for healthcare features
        wsPort: parseInt(process.env.EXPO_PUBLIC_WS_PORT || '3002', 10),
        ...getCommonServiceConfig(),
      };
      
    case 'production':
      const prodUrl = process.env.EXPO_PUBLIC_API_URL_PRODUCTION || 'https://api.myapp.com';
      return {
        apiUrl: prodUrl,
        authUrl: prodUrl,
        authBaseUrl: `${prodUrl}/api/auth`,
        databaseUrl: process.env.PROD_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://myexpo:myexpo123@localhost:5432/myexpo_prod',
        mode: 'production',
        isOAuthSafe: true, // Production URLs are OAuth-safe
        wsUrl: generateWebSocketUrl(prodUrl),
        wsEnabled: true, // Always enable WebSocket for healthcare features
        wsPort: parseInt(process.env.EXPO_PUBLIC_WS_PORT || '3002', 10),
        ...getCommonServiceConfig(),
      };
      
    case 'network':
    default:
      // Network mode - detect best URL
      const networkUrl = getNetworkUrl();
      const isPrivateIP = networkUrl.includes('192.168') || networkUrl.includes('10.0');
      
      return {
        apiUrl: networkUrl,
        authUrl: isPrivateIP ? 'http://localhost:8081' : networkUrl, // Use localhost for auth if private IP
        authBaseUrl: isPrivateIP ? 'http://localhost:8081/api/auth' : `${networkUrl}/api/auth`,
        databaseUrl: process.env.DATABASE_URL || 'postgresql://myexpo:myexpo123@localhost:5432/myexpo_dev',
        mode: 'network',
        isOAuthSafe: !isPrivateIP, // Private IPs are not OAuth-safe
        wsUrl: generateWebSocketUrl(networkUrl),
        wsEnabled: true, // Always enable WebSocket for healthcare features
        wsPort: parseInt(process.env.EXPO_PUBLIC_WS_PORT || '3002', 10),
        ...getCommonServiceConfig(),
      };
  }
}

/**
 * Get tunnel URL
 */
function getTunnelUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  // Check environment variable
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && (envUrl.includes('.exp.direct') || envUrl.includes('.exp.host'))) {
    return envUrl;
  }
  
  return 'http://localhost:8081'; // Fallback
}

/**
 * Get network URL based on platform
 */
function getNetworkUrl(): string {
  // Web always uses origin
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // First priority: Use environment variable if set
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  // Only log once on client side to avoid spam
  if (Platform.OS !== 'server' && typeof window !== 'undefined' && !(window as any).__envLogged) {
    console.log('[ENV] Checking EXPO_PUBLIC_API_URL:', {
      value: envUrl,
      allEnvVars: Object.keys(process.env).filter(k => k.includes('API')),
      localIP: process.env.LOCAL_IP,
      nodeEnv: process.env.NODE_ENV,
      platform: Platform.OS
    });
    (window as any).__envLogged = true;
  }
  if (envUrl && envUrl !== '') {
    if (Platform.OS !== 'server' && typeof window !== 'undefined' && !(window as any).__envUrlLogged) {
      console.log('[ENV] Using EXPO_PUBLIC_API_URL:', envUrl);
      (window as any).__envUrlLogged = true;
    }
    return envUrl;
  }
  
  // Android emulator special case
  if (Platform.OS === 'android' && __DEV__) {
    console.log('[ENV] Android emulator detected, using 10.0.2.2');
    return 'http://10.0.2.2:8081';
  }
  
  // For iOS and physical devices, try to use the LOCAL_IP if available
  const localIP = process.env.LOCAL_IP || process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
  if (localIP) {
    console.log('[ENV] Using LOCAL_IP:', localIP);
    return `http://${localIP}:8081`;
  }
  
  // Default fallback - this should rarely be used
  console.warn('[ENV] No network configuration found, falling back to localhost');
  return 'http://localhost:8081';
}

/**
 * Get API URL for general use
 */
export function getApiUrl(): string {
  const config = getUnifiedEnvConfig();
  return config.apiUrl;
}

/**
 * Get Auth URL (OAuth-safe)
 */
export function getAuthUrl(): string {
  const config = getUnifiedEnvConfig();
  return config.authUrl;
}

/**
 * Get Auth Base URL for Better Auth
 */
export function getAuthBaseUrl(): string {
  const config = getUnifiedEnvConfig();
  return config.authBaseUrl;
}

/**
 * Check if current environment is OAuth-safe
 */
export function isOAuthSafe(): boolean {
  const config = getUnifiedEnvConfig();
  return config.isOAuthSafe;
}

/**
 * Get database URL
 */
export function getDatabaseUrl(): string {
  const config = getUnifiedEnvConfig();
  return config.databaseUrl;
}

/**
 * Get WebSocket URL
 */
export function getWebSocketUrl(): string {
  const config = getUnifiedEnvConfig();
  return config.wsUrl;
}

/**
 * Check if WebSocket is enabled
 */
export function isWebSocketEnabled(): boolean {
  const config = getUnifiedEnvConfig();
  return config.wsEnabled;
}

/**
 * Get Redis URL
 */
export function getRedisUrl(): string {
  const config = getUnifiedEnvConfig();
  return config.redisUrl;
}

/**
 * Get Logging configuration
 */
export function getLoggingConfig() {
  const config = getUnifiedEnvConfig();
  return config.logging;
}

/**
 * Get PostHog configuration
 */
export function getPostHogConfig() {
  const config = getUnifiedEnvConfig();
  return config.posthog;
}

/**
 * Get Email configuration
 */
export function getEmailConfig() {
  const config = getUnifiedEnvConfig();
  return config.email;
}

/**
 * Log current environment (debug)
 */
export function logEnvironment(): void {
  const config = getUnifiedEnvConfig();
  // TODO: Replace with structured logging
  // /* console.log('[UNIFIED ENV] Configuration:', {
  //   mode: config.mode,
  //   apiUrl: config.apiUrl,
  //   authUrl: config.authUrl,
  //   authBaseUrl: config.authBaseUrl,
  //   isOAuthSafe: config.isOAuthSafe,
  //   wsUrl: config.wsUrl,
  //   wsEnabled: config.wsEnabled,
  //   platform: Platform.OS,
  //   isDev: __DEV__,
  // }) */;
}