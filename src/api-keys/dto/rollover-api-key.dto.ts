import { IsString, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RolloverApiKeyDto {
  @ApiProperty({
    description: 'UUID of the expired API key to rollover',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  expired_key_id: string;

  @ApiProperty({
    description: 'New expiry duration for the rolled over key',
    enum: ['1H', '1D', '1M', '1Y'],
    example: '1M',
  })
  @IsEnum(['1H', '1D', '1M', '1Y'])
  expiry: '1H' | '1D' | '1M' | '1Y';
}
