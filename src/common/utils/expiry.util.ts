import { DateTime } from 'luxon';
import { BadRequestException } from '@nestjs/common';

export type ExpiryDuration = '1H' | '1D' | '1M' | '1Y';

export function parseExpiry(expiry: string): Date {
  const validDurations: ExpiryDuration[] = ['1H', '1D', '1M', '1Y'];

  if (!validDurations.includes(expiry as ExpiryDuration)) {
    throw new BadRequestException(
      `Invalid expiry format. Must be one of: ${validDurations.join(', ')}`,
    );
  }

  const now = DateTime.now();

  switch (expiry) {
    case '1H':
      return now.plus({ hours: 1 }).toJSDate();
    case '1D':
      return now.plus({ days: 1 }).toJSDate();
    case '1M':
      return now.plus({ months: 1 }).toJSDate();
    case '1Y':
      return now.plus({ years: 1 }).toJSDate();
    default:
      throw new BadRequestException('Invalid expiry duration');
  }
}
