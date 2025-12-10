import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysService } from './api-keys.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { User } from '../users/entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let mockApiKeyRepository: any;

  beforeEach(async () => {
    mockApiKeyRepository = {
      count: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => ({ ...data, id: 'generated-uuid' })),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepository },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw error if user has 5 or more active keys', async () => {
      mockApiKeyRepository.count.mockResolvedValue(5);

      const user = { id: '1', email: 'test@example.com' } as User;
      const createDto = {
        name: 'test-key',
        permissions: ['read'],
        expiry: '1D' as any,
      };

      await expect(service.create(user, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create API key successfully', async () => {
      mockApiKeyRepository.count.mockResolvedValue(0);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-key');

      const user = { id: '1', email: 'test@example.com' } as User;
      const createDto = {
        name: 'test-key',
        permissions: ['read'],
        expiry: '1D' as any,
      };

      const result = await service.create(user, createDto);

      expect(result).toHaveProperty('api_key');
      expect(result.api_key).toContain('sk_live_');
      expect(mockApiKeyRepository.save).toHaveBeenCalled();
    });
  });

  describe('validateApiKey', () => {
    it('should return null for invalid key', async () => {
      mockApiKeyRepository.find.mockResolvedValue([]);

      const result = await service.validateApiKey('invalid-key');

      expect(result).toBeNull();
    });

    it('should return apiKey and user for valid key', async () => {
      const mockApiKey = {
        id: '1',
        key: 'hashed-key',
        user: { id: '1', email: 'test@example.com' },
      };

      mockApiKeyRepository.find.mockResolvedValue([mockApiKey]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateApiKey('valid-key');

      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('user');
    });
  });
});
