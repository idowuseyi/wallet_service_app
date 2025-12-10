import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Wallet } from '../entities/wallet.entity';
import { Transaction, TransactionStatus, TransactionType } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { PaystackService } from './paystack.service';
import { DepositDto, TransferDto } from '../dto/wallet.dto';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private paystackService: PaystackService,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) { }

  async getBalance(userId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      balance: Number(wallet.balance),
      currency: wallet.currency,
      wallet_number: wallet.walletNumber,
    };
  }

  async deposit(user: User, depositDto: DepositDto) {
    const wallet = await this.walletRepository.findOne({
      where: { userId: user.id },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Generate unique reference
    const reference = `dep_${uuidv4()}`;

    // Create pending transaction
    const transaction = this.transactionRepository.create({
      reference,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      amount: depositDto.amount,
      description: 'Wallet deposit via Paystack',
      walletId: wallet.id,
      metadata: {
        email: user.email,
      },
    });

    await this.transactionRepository.save(transaction);

    // Initialize Paystack transaction
    const paystackResponse = await this.paystackService.initializeTransaction({
      email: user.email,
      amount: depositDto.amount,
      reference,
    });

    return {
      reference,
      authorization_url: paystackResponse.data.authorization_url,
      access_code: paystackResponse.data.access_code,
    };
  }

  async handleWebhook(signature: string, body: any) {
    // Verify Paystack signature
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY')!;
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid signature');
    }

    const event = body;

    // Only process successful charge events
    if (event.event === 'charge.success') {
      await this.processWebhookCredit(event.data);
    }

    return { status: true };
  }

  async processWebhookCredit(data: any) {
    const { reference, status, amount } = data;

    // Find transaction by reference
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
      relations: ['wallet'],
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for reference: ${reference}`);
      return;
    }

    // Check if already processed (idempotency)
    if (transaction.status === TransactionStatus.SUCCESS) {
      this.logger.log(`Transaction ${reference} already processed`);
      return;
    }

    // Only process if Paystack says success
    if (status === 'success') {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Lock wallet for update
        const wallet = await queryRunner.manager.findOne(Wallet, {
          where: { id: transaction.walletId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        // Update wallet balance (amount from Paystack is in kobo, convert to naira)
        const amountInNaira = amount / 100;
        wallet.balance = Number(wallet.balance) + amountInNaira;
        await queryRunner.manager.save(wallet);

        // Update transaction status
        transaction.status = TransactionStatus.SUCCESS;
        transaction.metadata = {
          ...transaction.metadata,
          paystackResponse: data,
        };
        await queryRunner.manager.save(transaction);

        await queryRunner.commitTransaction();
        this.logger.log(`Successfully credited ${amountInNaira} to wallet ${wallet.walletNumber}`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`Failed to process webhook: ${error.message}`);
        throw error;
      } finally {
        await queryRunner.release();
      }
    }
  }

  async getDepositStatus(reference: string, userId: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
      relations: ['wallet'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify user owns this transaction
    if (transaction.wallet.userId !== userId) {
      throw new BadRequestException('Unauthorized access to transaction');
    }

    // If still pending, check with Paystack
    if (transaction.status === TransactionStatus.PENDING as any) {
      try {
        const verification = await this.paystackService.verifyTransaction(reference);
        // Note: We don't credit the wallet here - that's done by the webhook
        // This is just for status checking
        if (verification.data.status === 'success' && transaction.status !== TransactionStatus.SUCCESS) {
          // If webhook hasn't processed yet, we can trigger it manually
          await this.processWebhookCredit(verification.data);
        }
      } catch (error) {
        this.logger.error(`Failed to verify transaction: ${error.message}`);
      }
    }

    // Refetch transaction to get updated status
    const updatedTransaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (!updatedTransaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      reference: updatedTransaction.reference,
      status: updatedTransaction.status.toLowerCase(),
      amount: Number(updatedTransaction.amount),
    };
  }

  async transfer(user: User, transferDto: TransferDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock sender wallet
      const senderWallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: user.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      // Lock recipient wallet
      const recipientWallet = await queryRunner.manager.findOne(Wallet, {
        where: { walletNumber: transferDto.wallet_number },
        lock: { mode: 'pessimistic_write' },
      });

      if (!recipientWallet) {
        throw new NotFoundException('Recipient wallet not found');
      }

      // Check if trying to transfer to self
      if (senderWallet.id === recipientWallet.id) {
        throw new BadRequestException('Cannot transfer to your own wallet');
      }

      // Check sufficient balance
      if (Number(senderWallet.balance) < transferDto.amount) {
        throw new BadRequestException('Insufficient funds');
      }

      // Update balances
      senderWallet.balance = Number(senderWallet.balance) - transferDto.amount;
      recipientWallet.balance = Number(recipientWallet.balance) + transferDto.amount;

      await queryRunner.manager.save(senderWallet);
      await queryRunner.manager.save(recipientWallet);

      // Create debit transaction (sender)
      const debitTransaction = queryRunner.manager.create(Transaction, {
        reference: `tfr_debit_${uuidv4()}`,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.SUCCESS,
        amount: -transferDto.amount, // Negative for debit
        description: `Transfer to ${recipientWallet.walletNumber}`,
        walletId: senderWallet.id,
        metadata: {
          recipientWalletNumber: recipientWallet.walletNumber,
          transferType: 'debit',
        },
      });
      await queryRunner.manager.save(debitTransaction);

      // Create credit transaction (recipient)
      const creditTransaction = queryRunner.manager.create(Transaction, {
        reference: `tfr_credit_${uuidv4()}`,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.SUCCESS,
        amount: transferDto.amount,
        description: `Transfer from ${senderWallet.walletNumber}`,
        walletId: recipientWallet.id,
        metadata: {
          senderWalletNumber: senderWallet.walletNumber,
          transferType: 'credit',
        },
      });
      await queryRunner.manager.save(creditTransaction);

      await queryRunner.commitTransaction();

      return {
        status: 'success',
        message: 'Transfer completed',
        amount: transferDto.amount,
        recipient: recipientWallet.walletNumber,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactions(userId: string, page: number = 1, limit: number = 10) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type.toLowerCase(),
        amount: Number(tx.amount),
        status: tx.status.toLowerCase(),
        description: tx.description,
        reference: tx.reference,
        createdAt: tx.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
