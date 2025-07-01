# Email Service Setup Guide

This guide covers the email service configuration for the Hospital Alert System with Better Auth integration.

## Overview

The email service is configured to work with:
- **Better Auth Email OTP Plugin** for verification codes
- **Magic Link Plugin** for passwordless authentication
- **Nodemailer** for SMTP email sending
- **Mailhog** for local development testing
- **Docker** support for containerized deployment

## Environment Variables

### Required Variables

```bash
# SMTP Configuration
EMAIL_HOST=smtp.gmail.com          # SMTP server host
EMAIL_PORT=587                     # SMTP server port
EMAIL_USER=your-email@gmail.com    # SMTP username
EMAIL_PASS=your-app-password       # SMTP password (use app password for Gmail)
EMAIL_FROM="Hospital Alert System <noreply@hospital.com>"

# Optional Variables
EMAIL_SECURE=false                 # Use TLS (true for port 465)
EMAIL_DEV_MODE=false              # Redirect all emails to dev address
EMAIL_DEV_TO=dev@example.com      # Dev mode recipient
EMAIL_QUEUE_ENABLED=false         # Enable email queueing
EMAIL_RATE_LIMIT=100              # Max emails per window
EMAIL_RATE_WINDOW=3600000         # Rate limit window (1 hour)
```

## Docker Setup

### 1. Development with Mailhog

For local development, use Mailhog to catch all emails:

```bash
# Start services with Mailhog
docker-compose up -d postgres redis mailhog

# Or use the local compose file
docker-compose -f docker-compose.local.yml up -d
```

Access Mailhog UI at: http://localhost:8025

### 2. Production Email Service

The dedicated email service runs in a container:

```bash
# Start with email service profile
docker-compose -f docker-compose.local.yml --profile services up -d

# Check email service logs
docker logs myexpo-email-local -f
```

### 3. Docker Environment Configuration

When using Docker, update your `.env.local`:

```bash
# For Mailhog (development)
EMAIL_HOST=mailhog
EMAIL_PORT=1025
EMAIL_USER=any
EMAIL_PASS=any

# For production SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Better Auth Integration

### Email OTP Configuration

The email OTP plugin is configured in `lib/auth/auth-server.ts`:

```typescript
emailOTP({
  sendVerificationOtp: async ({ email, otp, type }) => {
    await emailService.send({
      to: email,
      template: 'auth.verify',
      data: {
        name: email.split('@')[0],
        code: otp,
        type,
      },
    });
  },
  otpLength: 6,
  expiresIn: 15 * 60, // 15 minutes
})
```

### Magic Link Configuration

```typescript
magicLink({
  sendMagicLink: async ({ email, url }) => {
    await emailService.send({
      to: email,
      subject: 'Sign in to Hospital Alert System',
      html: `...`, // Custom HTML template
      text: `...`, // Plain text version
    });
  },
  expiresIn: 15 * 60, // 15 minutes
})
```

## Email Templates

Templates are located in `src/server/services/email-templates/`:

### Available Templates

1. **auth.verify** - Email verification with OTP
2. **healthcare.alert** - Alert notifications
3. **auth.welcome** - Welcome email for new users
4. **auth.password-reset** - Password reset emails

### Template Structure

```typescript
export const verifyEmailTemplate: EmailTemplate = {
  name: 'auth.verify',
  subject: 'Verify your email address',
  html: `...`, // HTML content with {{variables}}
  text: `...`, // Plain text content
  requiredData: ['name', 'code'],
};
```

## Testing

### 1. Run Email Service Test

```bash
# Test email service and Better Auth integration
bun run scripts/test-better-auth-email.ts

# Test with specific email
TEST_EMAIL=your-email@example.com bun run scripts/test-better-auth-email.ts
```

### 2. Test in Docker

```bash
# Test email service in Docker
docker exec myexpo-email-local bun run scripts/test/unit/test-email-service.ts
```

### 3. Manual Testing

1. Start the application with email service
2. Register a new account
3. Check Mailhog UI or your inbox
4. Verify OTP code format and delivery

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if email service is running: `docker ps | grep email`
   - Verify environment variables are loaded
   - Check firewall/network settings

2. **Authentication Failed**
   - For Gmail: Use app password, not regular password
   - Enable 2FA and generate app-specific password
   - Check EMAIL_USER and EMAIL_PASS values

3. **Templates Not Loading**
   - Check template file paths
   - Verify template export format
   - Check logs for template loading errors

4. **Rate Limiting**
   - Adjust EMAIL_RATE_LIMIT and EMAIL_RATE_WINDOW
   - Use email queue for high volume
   - Implement retry logic

### Debug Commands

```bash
# Check email service health
curl http://localhost:3001/health

# View email service logs
docker logs myexpo-email-local -f --tail 100

# Test SMTP connection
bun run scripts/test/unit/test-smtp-connection.ts

# Verify environment variables
docker exec myexpo-email-local env | grep EMAIL
```

## Production Considerations

1. **Use Dedicated Email Service**
   - SendGrid, AWS SES, or Postmark for reliability
   - Configure SPF, DKIM, and DMARC records

2. **Enable Email Queue**
   - Set EMAIL_QUEUE_ENABLED=true
   - Configure Redis for queue storage
   - Monitor queue health

3. **Security**
   - Use environment variables for credentials
   - Enable TLS/SSL for SMTP
   - Implement email verification for user signups

4. **Monitoring**
   - Track email delivery rates
   - Monitor bounce rates
   - Set up alerts for failures

## Additional Resources

- [Better Auth Email OTP Docs](https://www.better-auth.com/docs/plugins/email-otp)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Mailhog GitHub](https://github.com/mailhog/MailHog)
- [Docker Compose Reference](https://docs.docker.com/compose/)