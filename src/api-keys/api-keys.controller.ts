import { Controller, Post, Body, UseGuards, Req, Get, Delete, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiOkResponse, ApiBadRequestResponse, ApiUnauthorizedResponse, ApiParam, ApiNotFoundResponse } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';

@ApiTags('API Keys')
@Controller('keys')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) { }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get all my API keys',
    description: 'Retrieves all API keys created by the authenticated user. Returns metadata only - actual key values are never shown after creation.',
  })
  @ApiOkResponse({
    description: 'API keys retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
            description: 'Unique identifier for the API key',
          },
          name: {
            type: 'string',
            example: 'my-service-key',
            description: 'Name/identifier of the API key',
          },
          prefix: {
            type: 'string',
            example: 'truncated sk_live_a1b2c3d',
            description: 'First 15 characters of the key for identification',
          },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            example: ['read', 'deposit', 'transfer'],
            description: 'Permissions granted to this API key',
          },
          status: {
            type: 'string',
            enum: ['active', 'expired', 'revoked'],
            example: 'active',
            description: 'Current status of the API key',
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-10T21:16:52.000Z',
            description: 'Expiration date and time',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-09T21:16:52.000Z',
            description: 'Creation date and time',
          },
        },
      },
    },
  })
  async getMyKeys(@Req() req) {
    return this.apiKeysService.getMyKeys(req.user);
  }

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Create a new API key',
    description: 'Creates a new API key with specified permissions. Maximum 5 active keys allowed per user. The API key is only shown once at creation.',
  })
  @ApiOkResponse({
    description: 'API key created successfully',
    schema: {
      type: 'object',
      properties: {
        api_key: {
          type: 'string',
          example: 'truncated sk_live_a1b2c3d...',
          description: 'The generated API key (shown only once)',
        },
        expires_at: {
          type: 'string',
          format: 'date-time',
          example: '2025-12-10T21:16:52.000Z',
          description: 'Expiration date and time of the API key',
        },
        prefix: {
          type: 'string',
          example: 'truncated sk_live_a1b2c3d',
          description: 'The key prefix for identification',
        },
        name: {
          type: 'string',
          example: 'my-service-key',
          description: 'Name of the API key',
        },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          example: ['read', 'deposit', 'transfer'],
          description: 'Permissions granted to this API key',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Maximum of 5 active API keys allowed or invalid permissions/expiry' })
  async create(@Req() req, @Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeysService.create(req.user, createApiKeyDto);
  }

  @Post('rollover')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Rollover an expired API key',
    description: 'Creates a new API key with the same permissions as an expired key. The old key must be expired.',
  })
  @ApiOkResponse({
    description: 'API key rolled over successfully',
    schema: {
      type: 'object',
      properties: {
        api_key: {
          type: 'string',
          example: 'truncated sk_live_x1y2z3a...',
          description: 'The new API key (shown only once)',
        },
        expires_at: {
          type: 'string',
          format: 'date-time',
          example: '2026-01-10T21:16:52.000Z',
          description: 'Expiration date and time of the new API key',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'API key not expired or not found' })
  async rollover(@Req() req, @Body() rolloverDto: RolloverApiKeyDto) {
    return this.apiKeysService.rollover(req.user, rolloverDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Revoke an API key',
    description: `
Revokes an API key immediately. This is a soft delete - the key is marked as revoked but remains in the database for audit purposes.

**Use cases:**
- Key was compromised or leaked
- Service no longer needs access
- Key rotation/cleanup
- Security best practice

**Note:** Revoked keys cannot be reactivated. Create a new key instead.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the API key to revoke',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'API key revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'API key revoked successfully',
        },
        id: {
          type: 'string',
          format: 'uuid',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        name: {
          type: 'string',
          example: 'production-service',
        },
        prefix: {
          type: 'string',
          example: 'truncated sk_live_a1b2c3d',
        },
        revoked_at: {
          type: 'string',
          format: 'date-time',
          example: '2025-12-10T13:20:00.000Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'API key not found or does not belong to user' })
  @ApiBadRequestResponse({ description: 'API key is already revoked' })
  async revokeKey(@Req() req, @Param('id') id: string) {
    return this.apiKeysService.revokeKey(req.user, id);
  }
}
