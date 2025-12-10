import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeysService } from '../../api-keys/api-keys.service';

@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const apiKeyHeader = request.headers['x-api-key'];

    // Case A: JWT Authentication
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwtGuard = new (AuthGuard('jwt'))();
      const canActivate = await jwtGuard.canActivate(context);
      if (canActivate) {
        request.authType = 'user';
        return true;
      }
    }

    // Case B: API Key Authentication
    if (apiKeyHeader) {
      const result = await this.apiKeysService.validateApiKey(apiKeyHeader);

      if (result) {
        request.user = result.user;
        request.apiKey = result.apiKey;
        request.authType = 'api_key';
        return true;
      }

      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Case C: Neither
    throw new UnauthorizedException('No authentication credentials provided');
  }
}
