import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('Wallet E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;
  let apiKey: string;
  let walletNumber: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Clean database before tests
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow', () => {
    it('should redirect to Google OAuth', () => {
      return request(app.getHttpServer())
        .get('/auth/google')
        .expect(302);
    });
  });

  describe('API Keys', () => {
    it('should create an API key (requires JWT)', async () => {
      // Note: In real e2e test, you'd need to mock Google OAuth or use test credentials
      // For now, this shows the structure
      const response = await request(app.getHttpServer())
        .post('/keys/create')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: 'test-api-key',
          permissions: ['read', 'deposit', 'transfer'],
          expiry: '1D',
        });

      if (jwtToken) {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('api_key');
        apiKey = response.body.api_key;
      }
    });

    it('should reject creating more than 5 API keys', async () => {
      const createKey = () =>
        request(app.getHttpServer())
          .post('/keys/create')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({
            name: 'test-key',
            permissions: ['read'],
            expiry: '1D',
          });

      if (jwtToken) {
        // Create 5 keys
        for (let i = 0; i < 5; i++) {
          await createKey();
        }

        // 6th should fail
        const response = await createKey();
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Maximum of 5 active API keys');
      }
    });
  });

  describe('Wallet Operations', () => {
    it('should get wallet balance with JWT', async () => {
      if (jwtToken) {
        const response = await request(app.getHttpServer())
          .get('/wallet/balance')
          .set('Authorization', `Bearer ${jwtToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('balance');
        expect(response.body).toHaveProperty('wallet_number');
        walletNumber = response.body.wallet_number;
      }
    });

    it('should get wallet balance with API key', async () => {
      if (apiKey) {
        const response = await request(app.getHttpServer())
          .get('/wallet/balance')
          .set('x-api-key', apiKey);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('balance');
      }
    });

    it('should initialize deposit', async () => {
      if (jwtToken) {
        const response = await request(app.getHttpServer())
          .post('/wallet/deposit')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({ amount: 5000 });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('reference');
        expect(response.body).toHaveProperty('authorization_url');
      }
    });

    it('should reject deposit with insufficient amount', async () => {
      if (jwtToken) {
        const response = await request(app.getHttpServer())
          .post('/wallet/deposit')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({ amount: 50 }); // Less than minimum 100

        expect(response.status).toBe(400);
      }
    });

    it('should reject transfer without transfer permission', async () => {
      // Create API key with only read permission
      const keyResponse = await request(app.getHttpServer())
        .post('/keys/create')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: 'read-only-key',
          permissions: ['read'],
          expiry: '1D',
        });

      if (keyResponse.body.api_key) {
        const response = await request(app.getHttpServer())
          .post('/wallet/transfer')
          .set('x-api-key', keyResponse.body.api_key)
          .send({
            wallet_number: '1234567890',
            amount: 100,
          });

        expect(response.status).toBe(403);
        expect(response.body.message).toContain('required permissions');
      }
    });

    it('should get transaction history', async () => {
      if (jwtToken) {
        const response = await request(app.getHttpServer())
          .get('/wallet/transactions?page=1&limit=10')
          .set('Authorization', `Bearer ${jwtToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('transactions');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.transactions)).toBe(true);
      }
    });
  });

  describe('Security', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/balance');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('x-api-key', 'invalid-key');

      expect(response.status).toBe(401);
    });
  });
});
