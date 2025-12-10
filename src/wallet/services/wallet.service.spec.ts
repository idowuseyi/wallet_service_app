import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { PaystackService } from './paystack.service';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;
  let mockWalletRepository: any;
  let mockTransactionRepository: any;
  let mockPaystackService: any;
  let mockDataSource: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockWalletRepository = {
      findOne: jest.fn(),
    };

    mockTransactionRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => ({ ...data, id: 'generated-uuid' })),
      findAndCount: jest.fn(),
    };

    mockPaystackService = {
      initializeTransaction: jest.fn(() => ({
        data: {
          authorization_url: 'https://paystack.co/checkout/test',
          access_code: 'test-access-code',
        },
      })),
      verifyTransaction: jest.fn(),
    };

    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn((data) => data),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    mockConfigService = {
      get: jest.fn((key) => {
        if (key === 'PAYSTACK_SECRET_KEY') return 'test-secret-key';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(Wallet), useValue: mockWalletRepository },
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepository },
        { provide: PaystackService, useValue: mockPaystackService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBalance', () => {
    it('should return wallet balance', async () => {
      const mockWallet = {
        id: '1',
        balance: 5000,
        currency: 'NGN',
        walletNumber: '1234567890',
      };

      mockWalletRepository.findOne.mockResolvedValue(mockWallet);

      const result = await service.getBalance('user-1');

      expect(result).toEqual({
        balance: 5000,
        currency: 'NGN',
        wallet_number: '1234567890',
      });
    });

    it('should throw NotFoundException if wallet not found', async () => {
      mockWalletRepository.findOne.mockResolvedValue(null);

      await expect(service.getBalance('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deposit', () => {
    it('should initialize deposit and return paystack details', async () => {
      const mockWallet = { id: '1', userId: 'user-1' };
      const user = { id: 'user-1', email: 'test@example.com' } as any;

      mockWalletRepository.findOne.mockResolvedValue(mockWallet);

      const result = await service.deposit(user, { amount: 1000 });

      expect(result).toHaveProperty('reference');
      expect(result).toHaveProperty('authorization_url');
      expect(mockTransactionRepository.save).toHaveBeenCalled();
      expect(mockPaystackService.initializeTransaction).toHaveBeenCalled();
    });
  });

  describe('transfer', () => {
    it('should throw BadRequestException for insufficient funds', async () => {
      const user = { id: 'user-1' } as any;
      const senderWallet = { id: '1', balance: 500 };

      const queryRunner = mockDataSource.createQueryRunner();
      queryRunner.manager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce({ id: '2', walletNumber: '0987654321' });

      await expect(
        service.transfer(user, { wallet_number: '0987654321', amount: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
