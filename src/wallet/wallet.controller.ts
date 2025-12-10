import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
  Res,
  HttpCode,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletService } from './services/wallet.service';
import { DepositDto, TransferDto } from './dto/wallet.dto';
import { UnifiedAuthGuard } from '../common/guards/unified-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Get('balance')
  @UseGuards(UnifiedAuthGuard, PermissionsGuard)
  @RequirePermissions('read')
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Retrieves the current balance and wallet details for the authenticated user. Requires JWT or API key with "read" permission.',
  })
  @ApiOkResponse({
    description: 'Wallet balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        balance: {
          type: 'number',
          example: 15000.50,
          description: 'Current wallet balance in Naira',
        },
        currency: {
          type: 'string',
          example: 'NGN',
          description: 'Currency code',
        },
        wallet_number: {
          type: 'string',
          example: '1234567890',
          description: '10-digit unique wallet number',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication credentials' })
  @ApiForbiddenResponse({ description: 'API key does not have required "read" permission' })
  async getBalance(@Req() req) {
    return this.walletService.getBalance(req.user.id);
  }

  @Post('deposit')
  @UseGuards(UnifiedAuthGuard, PermissionsGuard)
  @RequirePermissions('deposit')
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Initialize deposit',
    description: 'Initializes a Paystack deposit transaction. Returns a payment URL for the user to complete payment. Requires JWT or API key with "deposit" permission.',
  })
  @ApiOkResponse({
    description: 'Deposit initialized successfully',
    schema: {
      type: 'object',
      properties: {
        reference: {
          type: 'string',
          example: 'dep_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          description: 'Unique transaction reference',
        },
        authorization_url: {
          type: 'string',
          example: 'https://checkout.paystack.com/abc123xyz',
          description: 'Paystack payment URL',
        },
        access_code: {
          type: 'string',
          example: 'abc123xyz',
          description: 'Paystack access code',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid amount (minimum 100 NGN)' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication credentials' })
  @ApiForbiddenResponse({ description: 'API key does not have required "deposit" permission' })
  async deposit(@Req() req, @Body() depositDto: DepositDto) {
    return this.walletService.deposit(req.user, depositDto);
  }

  @Post('paystack/webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Paystack webhook handler',
    description: 'Receives Paystack webhook events for transaction updates. Verifies signature and credits wallet on successful payment. This endpoint does not require authentication but validates webhook signature.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid webhook signature' })
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const signature = req.headers['x-paystack-signature'] as string;
    const body = req.body;

    await this.walletService.handleWebhook(signature, body);
    return res.json({ status: true });
  }

  @Get('deposit/:reference/status')
  @UseGuards(UnifiedAuthGuard, PermissionsGuard)
  @RequirePermissions('read')
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Check deposit status',
    description: 'Retrieves the status of a deposit transaction by reference. Can also trigger manual verification with Paystack if status is still pending. Requires JWT or API key with "read" permission.',
  })
  @ApiParam({
    name: 'reference',
    description: 'Transaction reference',
    example: 'dep_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: 'Transaction status retrieved',
    schema: {
      type: 'object',
      properties: {
        reference: {
          type: 'string',
          example: 'dep_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
        status: {
          type: 'string',
          enum: ['pending', 'success', 'failed'],
          example: 'success',
        },
        amount: {
          type: 'number',
          example: 5000,
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  @ApiBadRequestResponse({ description: 'Unauthorized access to transaction' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication credentials' })
  async getDepositStatus(@Req() req, @Param('reference') reference: string) {
    return this.walletService.getDepositStatus(reference, req.user.id);
  }

  @Post('transfer')
  @UseGuards(UnifiedAuthGuard, PermissionsGuard)
  @RequirePermissions('transfer')
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Transfer funds',
    description: 'Transfers funds from your wallet to another user\'s wallet. Uses atomic transactions with pessimistic locking. Requires JWT or API key with "transfer" permission.',
  })
  @ApiOkResponse({
    description: 'Transfer completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'success',
        },
        message: {
          type: 'string',
          example: 'Transfer completed',
        },
        amount: {
          type: 'number',
          example: 1000,
        },
        recipient: {
          type: 'string',
          example: '0987654321',
          description: 'Recipient wallet number',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Insufficient funds, invalid wallet number, or self transfer' })
  @ApiNotFoundResponse({ description: 'Recipient wallet not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication credentials' })
  @ApiForbiddenResponse({ description: 'API key does not have required "transfer" permission' })
  async transfer(@Req() req, @Body() transferDto: TransferDto) {
    return this.walletService.transfer(req.user, transferDto);
  }

  @Get('transactions')
  @UseGuards(UnifiedAuthGuard, PermissionsGuard)
  @RequirePermissions('read')
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Get transaction history',
    description: 'Retrieves paginated transaction history for the authenticated user\'s wallet. Supports pagination via query parameters. Requires JWT or API key with "read" permission.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Transaction history retrieved',
    schema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
              type: { type: 'string', enum: ['deposit', 'transfer'], example: 'deposit' },
              amount: { type: 'number', example: 5000 },
              status: { type: 'string', enum: ['pending', 'success', 'failed'], example: 'success' },
              description: { type: 'string', example: 'Wallet deposit via Paystack' },
              reference: { type: 'string', example: 'dep_a1b2c3d4-e5f6-7890' },
              createdAt: { type: 'string', format: 'date-time', example: '2025-12-09T21:16:52.000Z' },
            },
          },
        },
        total: {
          type: 'number',
          example: 25,
          description: 'Total number of transactions',
        },
        page: {
          type: 'number',
          example: 1,
        },
        limit: {
          type: 'number',
          example: 10,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication credentials' })
  @ApiForbiddenResponse({ description: 'API key does not have required "read" permission' })
  async getTransactions(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.walletService.getTransactions(
      req.user.id,
      parseInt(page),
      parseInt(limit),
    );
  }
}
