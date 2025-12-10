import { IsString, IsArray, IsEnum, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Permission {
  READ = 'read',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
}

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name/identifier for the API key',
    example: 'my-service-key',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Array of permissions for the API key',
    enum: Permission,
    isArray: true,
    example: ['read', 'deposit', 'transfer'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];

  @ApiProperty({
    description: 'Expiry duration: 1H (1 hour), 1D (1 day), 1M (1 month), 1Y (1 year)',
    enum: ['1H', '1D', '1M', '1Y'],
    example: '1D',
  })
  @IsEnum(['1H', '1D', '1M', '1Y'])
  expiry: '1H' | '1D' | '1M' | '1Y';
}
