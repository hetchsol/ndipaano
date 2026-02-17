import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // ---------------------------------------------------------------------------
  // Global prefix
  // ---------------------------------------------------------------------------
  app.setGlobalPrefix('api', {
    exclude: ['/health', '/'],
  });

  // ---------------------------------------------------------------------------
  // API Versioning
  // ---------------------------------------------------------------------------
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ---------------------------------------------------------------------------
  // Security - Helmet
  // ---------------------------------------------------------------------------
  app.use(helmet());

  // ---------------------------------------------------------------------------
  // Compression
  // ---------------------------------------------------------------------------
  app.use(compression());

  // ---------------------------------------------------------------------------
  // Rate limiting
  // ---------------------------------------------------------------------------
  app.use(
    rateLimit({
      windowMs: configService.get<number>('rateLimit.windowMs', 15 * 60 * 1000),
      max: configService.get<number>('rateLimit.max', 100),
      message: {
        statusCode: 429,
        message: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // ---------------------------------------------------------------------------
  // CORS
  // ---------------------------------------------------------------------------
  const allowedOrigins = configService.get<string>('cors.origins', 'http://localhost:3000');
  app.enableCors({
    origin: allowedOrigins.split(',').map((origin) => origin.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 3600,
  });

  // ---------------------------------------------------------------------------
  // Global validation pipe
  // ---------------------------------------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configService.get<string>('NODE_ENV') === 'production',
    }),
  );

  // ---------------------------------------------------------------------------
  // Swagger / OpenAPI documentation
  // ---------------------------------------------------------------------------
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Ndipaano API')
      .setDescription(
        'Ndipaano Medical Home Care Platform API - ' +
        'Zambian healthcare services connecting patients with certified practitioners. ' +
        'Compliant with Zambia Data Protection Act (DPA) 2021.',
      )
      .setVersion('1.0')
      .setContact(
        'Ndipaano Engineering',
        'https://ndipaano.co.zm',
        'engineering@ndipaano.co.zm',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter your JWT token',
          in: 'header',
        },
        'access-token',
      )
      .addTag('Auth', 'Authentication and authorization')
      .addTag('Users', 'User management')
      .addTag('Patients', 'Patient profiles and family members')
      .addTag('Practitioners', 'Practitioner profiles and documents')
      .addTag('Bookings', 'Booking management and tracking')
      .addTag('Medical Records', 'Medical records and prescriptions')
      .addTag('Payments', 'Payments and insurance claims')
      .addTag('Notifications', 'Push, SMS, and email notifications')
      .addTag('Admin', 'Administrative operations')
      .addTag('Compliance', 'DPA compliance, consent, and audit logs')
      .addServer('http://localhost:3001', 'Local Development')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Ndipaano API Documentation',
    });

    logger.log('Swagger documentation available at /api/docs');
  }

  // ---------------------------------------------------------------------------
  // Start server
  // ---------------------------------------------------------------------------
  const port = configService.get<number>('port', 3001);
  const host = configService.get<string>('host', '0.0.0.0');

  await app.listen(port, host);
  logger.log(`Ndipaano API is running on http://${host}:${port}`);
  logger.log(`Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
}

bootstrap();
