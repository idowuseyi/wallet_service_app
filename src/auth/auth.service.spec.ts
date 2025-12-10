import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { DataSource } from 'typeorm';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: any;
  let mockWalletRepository: any;
  let mockJwtService: any;
  let mockDataSource: any;

  beforeEach(async () => {
    // Mock repositories
    mockUserRepository = {
      findOne: jest.fn(),
    };

    mockWalletRepository = {
      findOne: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(() => 'test-jwt-token'),
    };

    // Mock query runner
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        create: jest.fn((entity, data) => data),
        save: jest.fn((data) => ({ ...data, id: 'generated-uuid' })),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Wallet), useValue: mockWalletRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return access token', async () => {
      const user = { id: '1', email: 'test@example.com' } as User;
      const result = await service.login(user);

      expect(result).toEqual({ access_token: 'test-jwt-token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
      });
    });
  });

  describe('validateGoogleUser', () => {
    it('should create new user and wallet if user does not exist', async () => {
      const googleUser = {
        email: 'newuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        googleId: 'google-123',
      };

      const queryRunner = mockDataSource.createQueryRunner();
      queryRunner.manager.findOne.mockResolvedValue(null);

      const result = await service.validateGoogleUser(googleUser);

      expect(result).toHaveProperty('email', googleUser.email);
      expect(queryRunner.manager.save).toHaveBeenCalledTimes(2); // User + Wallet
    });
  });
});
