import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const { authType, apiKey, user } = request;

    // If authenticated as user (JWT), allow all actions
    if (authType === 'user') {
      return true;
    }

    // If authenticated via API key, check permissions
    if (authType === 'api_key' && apiKey) {
      const hasPermission = requiredPermissions.every((permission) =>
        apiKey.permissions.includes(permission),
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `API key does not have required permissions: ${requiredPermissions.join(', ')}`,
        );
      }

      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
