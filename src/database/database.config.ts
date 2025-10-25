import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Cart, CartItem } from './entities';

// Helper function to get password from AWS Secrets Manager
async function getPasswordFromSecretsManager(
  secretArn: string,
): Promise<string> {
  if (!secretArn) {
    throw new Error('DB_SECRET_ARN environment variable is not set');
  }

  const client = new SecretsManagerClient({ region: 'eu-west-1' });
  const command = new GetSecretValueCommand({ SecretId: secretArn });

  try {
    const response = await client.send(command);
    const secret = JSON.parse(response.SecretString || '{}');
    return secret.password;
  } catch (error) {
    console.error('Error retrieving secret from Secrets Manager:', error);
    throw error;
  }
}

export async function getDatabaseConfig(): Promise<TypeOrmModuleOptions> {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  // In Lambda/Production, get password from Secrets Manager
  let password: string;

  if (isLambda && process.env.DB_SECRET_ARN) {
    password = await getPasswordFromSecretsManager(process.env.DB_SECRET_ARN);
  } else {
    // For local development, use password from env or default
    password = process.env.DB_PASSWORD || 'postgres';
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password,
    database: process.env.DB_NAME || 'nestcartdb',
    entities: [Cart, CartItem],
    synchronize: !isProduction, // Set to false in production, use migrations
    logging: !isProduction,
    ssl: isProduction
      ? {
          rejectUnauthorized: false, // AWS RDS requires SSL
        }
      : false,
  };
}
