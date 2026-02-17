import { ValidationPipe } from '@nestjs/common';

/**
 * Pre-configured global validation pipe for the Ndipaano API.
 *
 * Configuration:
 *  - transform: true  -- Automatically transform payloads to DTO class instances
 *  - whitelist: true   -- Strip properties not defined in the DTO
 *  - forbidNonWhitelisted: true  -- Throw an error if unknown properties are sent
 *
 * This ensures that all incoming request bodies are validated against their
 * respective DTOs and any extraneous properties are rejected.
 */
export const globalValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  validationError: {
    target: false,
    value: false,
  },
});
