import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiOkResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: '🔗 Initiate Google OAuth (Browser Only)',
    description: `
⚠️ **IMPORTANT**: This endpoint CANNOT be tested using Swagger's "Try it out" button.

**Why?** This endpoint redirects to Google's OAuth consent screen, which requires a browser session with cookies.

**How to test:**
1. Open this URL directly in your browser:
   👉 http://localhost:6070/auth/google

2. You'll be redirected to Google to sign in
3. After signing in, you'll be redirected to /auth/google/callback
4. Copy the access_token from the JSON response
5. Use that token in Swagger by clicking "Authorize" 🔓

**Alternative for testing:**
- Use Postman and manually follow redirects
- Use curl with -L flag to follow redirects
    `,
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen (browser only)',
  })
  async googleAuth() {
    // This route initiates the Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: '✅ Google OAuth Callback (Automatic)',
    description: `
This endpoint is called automatically by Google after you authorize the application.

**You don't need to call this manually.**

When you visit /auth/google in your browser:
1. Google redirects back to this endpoint
2. Creates/updates user in database
3. Creates wallet if first-time user
4. Returns JWT access token

**Response:** Use the access_token for authenticated requests.
    `,
  })
  @ApiOkResponse({
    description: 'Successfully authenticated - Returns JWT token',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJzdWIiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJpYXQiOjE3MDIzOTQwMDAsImV4cCI6MTcwMjk5ODgwMH0.example_signature',
          description: 'JWT token valid for 7 days. Use this in the "Authorize" button above.',
        },
      },
    },
  })
  async googleAuthRedirect(@Req() req) {
    return this.authService.login(req.user);
  }
}
