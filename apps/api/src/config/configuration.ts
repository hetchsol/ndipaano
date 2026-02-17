/**
 * Ndipaano API - Configuration Factory
 *
 * Centralised, typed configuration loaded from environment variables.
 * All secrets and environment-specific values are read here and exposed
 * through the NestJS ConfigService.
 */
export default () => ({
  // ---------------------------------------------------------------------------
  // Server
  // ---------------------------------------------------------------------------
  NODE_ENV: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  // ---------------------------------------------------------------------------
  // Database (PostgreSQL + PostGIS)
  // ---------------------------------------------------------------------------
  database: {
    url: process.env.DATABASE_URL || 'postgresql://ndipaano:ndipaano@localhost:5432/ndipaano?schema=public',
  },

  // ---------------------------------------------------------------------------
  // Redis
  // ---------------------------------------------------------------------------
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true',
  },

  // ---------------------------------------------------------------------------
  // JWT / Authentication
  // ---------------------------------------------------------------------------
  jwt: {
    secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'ndipaano-api',
  },

  // ---------------------------------------------------------------------------
  // CORS
  // ---------------------------------------------------------------------------
  cors: {
    origins: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002',
  },

  // ---------------------------------------------------------------------------
  // Rate Limiting
  // ---------------------------------------------------------------------------
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // ---------------------------------------------------------------------------
  // AWS S3 (document / file storage)
  // ---------------------------------------------------------------------------
  s3: {
    region: process.env.AWS_S3_REGION || 'af-south-1',
    bucket: process.env.AWS_S3_BUCKET || 'ndipaano-uploads',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  },

  // ---------------------------------------------------------------------------
  // SMS Provider (Zambia)
  // ---------------------------------------------------------------------------
  sms: {
    provider: process.env.SMS_PROVIDER || 'zamtel', // zamtel | bongolive | africastalking
    apiKey: process.env.SMS_API_KEY || '',
    senderId: process.env.SMS_SENDER_ID || 'Ndipaano',
  },

  // ---------------------------------------------------------------------------
  // Email (SMTP / Transactional)
  // ---------------------------------------------------------------------------
  email: {
    host: process.env.SMTP_HOST || 'smtp.mailgun.org',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromAddress: process.env.EMAIL_FROM || 'noreply@ndipaano.co.zm',
    fromName: process.env.EMAIL_FROM_NAME || 'Ndipaano Health',
  },

  // ---------------------------------------------------------------------------
  // Mobile Money Payment Providers (Zambian)
  // ---------------------------------------------------------------------------
  payments: {
    // Kazang / SparkPay or similar aggregator
    provider: process.env.PAYMENT_PROVIDER || 'kazang',
    apiUrl: process.env.PAYMENT_API_URL || '',
    apiKey: process.env.PAYMENT_API_KEY || '',
    secretKey: process.env.PAYMENT_SECRET_KEY || '',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',
    // Commission percentage taken by platform
    commissionPercent: parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '15'),
    currency: 'ZMW',
  },

  // ---------------------------------------------------------------------------
  // Two-Factor Authentication (TOTP)
  // ---------------------------------------------------------------------------
  twoFactor: {
    issuer: process.env.TOTP_ISSUER || 'Ndipaano',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  },

  // ---------------------------------------------------------------------------
  // Data Protection / Compliance (Zambia DPA 2021)
  // ---------------------------------------------------------------------------
  compliance: {
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '2555', 10), // ~7 years medical records
    auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '3650', 10), // 10 years
    breachNotificationHours: 72, // DPA requires notification within 72 hours
    privacyPolicyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0',
  },

  // ---------------------------------------------------------------------------
  // HPCZ Integration (Health Professions Council of Zambia)
  // ---------------------------------------------------------------------------
  hpcz: {
    verificationApiUrl: process.env.HPCZ_API_URL || '',
    apiKey: process.env.HPCZ_API_KEY || '',
  },

  // ---------------------------------------------------------------------------
  // Bull Queue (background jobs)
  // ---------------------------------------------------------------------------
  bull: {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Encryption (AES-256 for medical records at rest)
  // ---------------------------------------------------------------------------
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'CHANGE_ME_32_BYTE_KEY_IN_PROD!!',
    algorithm: 'aes-256-gcm',
  },
});
