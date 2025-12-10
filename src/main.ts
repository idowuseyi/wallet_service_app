import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT || 6070;
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Wallet Service API')
    .setDescription(`
# Wallet Service API Documentation

A comprehensive wallet service with Google OAuth, API key management, Paystack integration, and secure wallet operations.

## 🔐 Authentication Guide

### Step 1: Get JWT Token (Google OAuth)
**⚠️ Important:** OAuth endpoints cannot be tested in Swagger directly.

1. **Open this URL in your browser:**  
   👉 [${baseUrl}/auth/google](${baseUrl}/auth/google)

2. Sign in with your Google account

3. Copy the \`access_token\` from the response

4. Click the **"Authorize" 🔓** button above

5. Paste the token in **JWT-auth** section

### Step 2: Test Endpoints
Now you can test all protected endpoints using the "Try it out" button!

### Alternative: Use API Keys
For service-to-service authentication:
1. First get a JWT token (see above)
2. Use \`POST /keys/create\` to generate an API key
3. Authorize with the API key instead

## 📖 More Information
- [GitHub Repository](#)
- [Full Documentation](./SWAGGER.md)
    `)
    .setVersion('1.0')
    .addTag('Authentication', '🔐 Google OAuth and JWT authentication')
    .addTag('API Keys', '🔑 Service-to-service authentication')
    .addTag('Wallet', '💰 Wallet operations and Paystack integration')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token obtained from Google OAuth callback',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Enter your API key (sk_live_xxxxx)',
      },
      'api-key',
    )
    // .addServer(`http://localhost:${port}`, 'Local Development')
    .addServer(`${baseUrl}`, 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  await app.listen(port);
  console.log(`Application is running on: ${baseUrl}`);
  console.log(`Swagger documentation is available at: ${baseUrl}/api`);
}
bootstrap();
