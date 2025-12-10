import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey } from './entities/api-key.entity';
import { User } from '../users/entities/user.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { parseExpiry } from '../common/utils/expiry.util';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) { }

  async create(user: User, createApiKeyDto: CreateApiKeyDto) {
    // Check active keys limit (5 max)
    const activeKeysCount = await this.apiKeyRepository.count({
      where: {
        userId: user.id,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (activeKeysCount >= 5) {
      throw new BadRequestException(
        'Maximum of 5 active API keys allowed per user',
      );
    }

    // Generate secure random key
    const plainKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const prefix = plainKey.substring(0, 15);

    // Hash the key
    const hashedKey = await bcrypt.hash(plainKey, 10);

    // Parse expiry
    const expiresAt = parseExpiry(createApiKeyDto.expiry);

    // Create API key
    const apiKey = this.apiKeyRepository.create({
      key: hashedKey,
      prefix,
      name: createApiKeyDto.name,
      permissions: createApiKeyDto.permissions,
      expiresAt,
      userId: user.id,
    });

    await this.apiKeyRepository.save(apiKey);

    return {
      api_key: plainKey, // Return plain text key only once
      expires_at: expiresAt,
      prefix,
      name: apiKey.name,
      permissions: apiKey.permissions,
    };
  }

  async getMyKeys(user: User) {
    const keys = await this.apiKeyRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    // Map to safe response (don't expose hashed keys)
    return keys.map((key) => {
      const now = new Date();
      const isExpired = key.expiresAt < now;

      return {
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        permissions: key.permissions,
        status: key.isRevoked ? 'revoked' : isExpired ? 'expired' : 'active',
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
      };
    });
  }

  async revokeKey(user: User, keyId: string) {
    // Find the key and verify ownership
    const apiKey = await this.apiKeyRepository.findOne({
      where: {
        id: keyId,
        userId: user.id,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // Check if already revoked
    if (apiKey.isRevoked) {
      throw new BadRequestException('API key is already revoked');
    }

    // Soft delete - mark as revoked
    apiKey.isRevoked = true;
    await this.apiKeyRepository.save(apiKey);

    return {
      message: 'API key revoked successfully',
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      revoked_at: new Date(),
    };
  }

  async rollover(user: User, rolloverDto: RolloverApiKeyDto) {
    // Find the expired key
    const expiredKey = await this.apiKeyRepository.findOne({
      where: {
        id: rolloverDto.expired_key_id,
        userId: user.id,
      },
    });

    if (!expiredKey) {
      throw new NotFoundException('API key not found');
    }

    // Check if the key is actually expired
    if (expiredKey.expiresAt > new Date()) {
      throw new BadRequestException('API key is not expired yet');
    }

    // Create new key with same permissions
    const newKeyDto: CreateApiKeyDto = {
      name: expiredKey.name,
      permissions: expiredKey.permissions as any,
      expiry: rolloverDto.expiry,
    };

    return this.create(user, newKeyDto);
  }

  async validateApiKey(keyString: string): Promise<{ apiKey: ApiKey; user: User } | null> {
    // Find all non-revoked, non-expired keys
    const apiKeys = await this.apiKeyRepository.find({
      where: {
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    // Check each key's hash
    for (const apiKey of apiKeys) {
      const isMatch = await bcrypt.compare(keyString, apiKey.key);
      if (isMatch) {
        return { apiKey, user: apiKey.user };
      }
    }

    return null;
  }
}
