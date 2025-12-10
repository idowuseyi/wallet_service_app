import { IsNumber, IsPositive, IsUUID, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({
    description: 'Amount to deposit in Naira (minimum 100)',
    example: 5000,
    minimum: 100,
  })
  @IsNumber()
  @IsPositive()
  @Min(100)
  amount: number;
}

export class TransferDto {
  @ApiProperty({
    description: '10-digit wallet number of the recipient',
    example: '1234567890',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  wallet_number: string;

  @ApiProperty({
    description: 'Amount to  transfer in Naira',
    example: 1000,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  amount: number;
}
