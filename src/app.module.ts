import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/entities/user.entity';
import { Wallet } from './wallet/entities/wallet.entity';
import { ApiKey } from './api-keys/entities/api-key.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { AuthModule } from './auth/auth.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(6070),
        // Support both DATABASE_URL (for cloud) and individual params (for local)
        DATABASE_URL: Joi.string().optional(),
        DATABASE_HOST: Joi.string().when('DATABASE_URL', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USER: Joi.string().when('DATABASE_URL', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
        DATABASE_PASSWORD: Joi.string().when('DATABASE_URL', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
        DATABASE_NAME: Joi.string().when('DATABASE_URL', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
        DATABASE_SSL: Joi.string().valid('true', 'false').default('false'),
        JWT_SECRET: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().required(),
        PAYSTACK_SECRET_KEY: Joi.string().required(),
        PAYSTACK_PUBLIC_KEY: Joi.string().required(),
        SERVICE_NAME: Joi.string().default('wallet-service'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Check if using DATABASE_URL (common for cloud providers) or individual configs
        const databaseUrl = configService.get('DATABASE_URL');
        const useSSL = configService.get('DATABASE_SSL') === 'true' || !!databaseUrl;

        // Base configuration
        const config: any = {
          type: 'postgres',
          entities: [User, Wallet, ApiKey, Transaction],
          synchronize: process.env.NODE_ENV !== 'production',
          logging: process.env.NODE_ENV !== 'production',
        };

        // Use DATABASE_URL if provided (for Leapcell, Heroku, etc.)
        if (databaseUrl) {
          config.url = databaseUrl;
        } else {
          // Use individual connection parameters
          config.host = configService.get('DATABASE_HOST');
          config.port = configService.get('DATABASE_PORT');
          config.username = configService.get('DATABASE_USER');
          config.password = configService.get('DATABASE_PASSWORD');
          config.database = configService.get('DATABASE_NAME');
        }

        // Add SSL configuration for remote databases
        if (useSSL) {
          config.ssl = {
            rejectUnauthorized: false, // Required for most cloud providers
          };
        }

        return config;
      },
      inject: [ConfigService],
    }),
    AuthModule,
    ApiKeysModule,
    WalletModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
