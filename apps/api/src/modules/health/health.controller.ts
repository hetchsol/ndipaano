import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-02-17T12:00:00.000Z' },
        version: { type: 'string', example: '0.1.0' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('api/health')
  @Public()
  @ApiOperation({ summary: 'API health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'API service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-02-17T12:00:00.000Z' },
        version: { type: 'string', example: '0.1.0' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  apiHealthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
