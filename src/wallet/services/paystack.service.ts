import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface InitializeTransactionData {
  email: string;
  amount: number;
  reference: string;
}

@Injectable()
export class PaystackService {
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY')!;
  }

  async initializeTransaction(data: InitializeTransactionData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: data.email,
          amount: data.amount * 100, // Convert to kobo
          reference: data.reference,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Paystack initialization failed',
        error.response?.status || 500,
      );
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Paystack verification failed',
        error.response?.status || 500,
      );
    }
  }
}
