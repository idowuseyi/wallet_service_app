import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './services/wallet.service';
import { PaystackService } from './services/paystack.service';
import { WalletController } from './wallet.controller';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction]),
    ApiKeysModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, PaystackService],
  exports: [WalletService],
})
export class WalletModule { }
