import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
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

export const getDatabaseConfig = async (
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const isLambda = !!configService.get<string>('AWS_LAMBDA_FUNCTION_NAME');

  // In Lambda/Production, get password from Secrets Manager
  let password: string;

  if (isLambda) {
    const secretArn = configService.get<string>('DB_SECRET_ARN');
    if (secretArn) {
      password = await getPasswordFromSecretsManager(secretArn);
    } else {
      password = configService.get<string>('DB_PASSWORD', 'postgres');
    }
  } else {
    // For local development, use password from env or default
    password = configService.get<string>('DB_PASSWORD', 'postgres');
  }

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password,
    database: configService.get<string>('DB_NAME', 'nestcartdb'),
    entities: [Cart, CartItem],
    synchronize: true, // Auto-create tables (OK for learning/demo, use migrations in real prod)
    logging: !isProduction,
    ssl: isProduction
      ? {
          rejectUnauthorized: false, // AWS RDS requires SSL
        }
      : false,
  };
};
