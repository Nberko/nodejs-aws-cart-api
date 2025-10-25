# Database Configuration

## Overview

Your NestJS application now has a PostgreSQL database running on Amazon RDS, deployed in a secure VPC configuration.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                           VPC                               │
│                                                             │
│  ┌──────────────────┐         ┌────────────────────────┐   │
│  │  Public Subnet   │         │   Private Subnet       │   │
│  │                  │         │                        │   │
│  │  NAT Gateway     │────────▶│  Lambda Function       │   │
│  │                  │         │  (NestJS App)          │   │
│  └──────────────────┘         │                        │   │
│                                │   ↓ Port 5432          │   │
│                                └────────────────────────┘   │
│                                                             │
│                                ┌────────────────────────┐   │
│                                │  Isolated Subnet       │   │
│                                │                        │   │
│                                │  RDS PostgreSQL        │   │
│                                │  (nestcartdb)          │   │
│                                └────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Database Details

- **Engine**: PostgreSQL 15.4
- **Instance Type**: db.t3.micro (Free tier eligible)
- **Storage**: 20 GB (auto-scaling up to 100 GB)
- **Database Name**: `nestcartdb`
- **Username**: `dbadmin`
- **Password**: Auto-generated and stored in AWS Secrets Manager
- **Backup Retention**: 7 days

## Environment Variables

The Lambda function automatically receives these environment variables:

- `DB_HOST` - RDS endpoint address
- `DB_PORT` - Database port (5432)
- `DB_NAME` - Database name (nestcartdb)
- `DB_USERNAME` - Database username (dbadmin)
- `DB_SECRET_ARN` - ARN of the secret containing the password

## Getting Database Credentials

### Method 1: From CDK Output (after deployment)

After deployment, the stack outputs will show:

```bash
Outputs:
NestApiStack.DatabaseEndpoint = xxxxx.rds.amazonaws.com
NestApiStack.DatabaseSecretArn = arn:aws:secretsmanager:...
NestApiStack.DatabaseName = nestcartdb
```

### Method 2: Retrieve Password from Secrets Manager

```bash
# Get the secret ARN from stack outputs
AWS_PROFILE=deploy aws cloudformation describe-stacks \
  --stack-name NestApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' \
  --output text

# Retrieve the secret value
AWS_PROFILE=deploy aws secretsmanager get-secret-value \
  --secret-id <SECRET_ARN> \
  --query SecretString \
  --output text | jq -r '.password'
```

### Method 3: Using AWS Console

1. Go to AWS Secrets Manager console
2. Find the secret named `NestAppDatabaseSecret*`
3. Click "Retrieve secret value"
4. Copy the password

## Connecting from Your Application

### TypeORM Configuration (Recommended for NestJS)

Install dependencies:

```bash
npm install --save @nestjs/typeorm typeorm pg
```

Create `src/database/database.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: parseInt(configService.get('DB_PORT', '5432')),
        username: configService.get('DB_USERNAME'),
        password: await getPasswordFromSecretsManager(
          configService.get('DB_SECRET_ARN')
        ),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false, // Set to false in production
        logging: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
```

Helper function to get password from Secrets Manager:

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function getPasswordFromSecretsManager(secretArn: string): Promise<string> {
  const client = new SecretsManagerClient({ region: 'eu-west-1' });
  const command = new GetSecretValueCommand({ SecretId: secretArn });
  const response = await client.send(command);
  const secret = JSON.parse(response.SecretString || '{}');
  return secret.password;
}
```

Install AWS SDK:

```bash
npm install --save @aws-sdk/client-secrets-manager
```

## Security Groups

### Lambda Security Group
- **Outbound**: All traffic allowed (to connect to RDS and internet)

### Database Security Group
- **Inbound**: Port 5432 from Lambda Security Group only
- **Outbound**: None (database doesn't need outbound)

## VPC Configuration

### Subnets

1. **Public Subnets** (2 AZs)
   - NAT Gateway
   - Internet Gateway access

2. **Private Subnets** (2 AZs)
   - Lambda functions
   - Internet access via NAT Gateway

3. **Isolated Subnets** (2 AZs)
   - RDS database
   - No internet access
   - Only accessible from Lambda

## Running Migrations

### Using TypeORM CLI

1. Create a migration:
```bash
npm run typeorm migration:generate -- -n InitialSchema
```

2. Run migrations:
```bash
npm run typeorm migration:run
```

### Using a Lambda Function

You can create a separate Lambda function for migrations:

```typescript
// src/migrations/run-migrations.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

export const handler = async () => {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();
  await app.close();
  return { success: true };
};
```

## Monitoring

### CloudWatch Metrics

RDS metrics available in CloudWatch:
- Database connections
- CPU utilization
- Storage
- Read/Write IOPS
- Network throughput

### Logs

- RDS logs: CloudWatch Logs
- Lambda logs: `/aws/lambda/NestApiStack-NestLambdaFunction*`

## Backup and Recovery

- **Automated Backups**: Daily backups retained for 7 days
- **Manual Snapshots**: Create via AWS Console or CLI
- **Point-in-Time Recovery**: Available within backup retention period

## Cost Optimization

Current configuration costs (approximate):

- **RDS db.t3.micro**: ~$15-20/month (Free tier: 750 hours/month)
- **Storage (20 GB)**: ~$2-3/month (Free tier: 20 GB)
- **NAT Gateway**: ~$32/month (not free tier)
- **Data Transfer**: Variable

### Reduce Costs

1. **Development**: Use `deletionProtection: false` and destroy when not in use
2. **Production**: Consider Aurora Serverless for variable workloads
3. **NAT Gateway**: Consider VPC endpoints to reduce data transfer costs

## Production Checklist

Before going to production:

- [ ] Set `deletionProtection: true` in CDK stack
- [ ] Increase `natGateways` to 2 for high availability
- [ ] Set `synchronize: false` in TypeORM (use migrations)
- [ ] Enable RDS Performance Insights
- [ ] Configure automated backups retention (30 days recommended)
- [ ] Set up CloudWatch alarms for database metrics
- [ ] Review and restrict Security Group rules
- [ ] Enable RDS encryption at rest
- [ ] Use Multi-AZ deployment for production
- [ ] Consider using RDS Proxy for connection pooling

## Troubleshooting

### Lambda Cannot Connect to RDS

1. Check Security Groups:
```bash
AWS_PROFILE=deploy aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*DatabaseSecurityGroup*"
```

2. Verify Lambda is in correct VPC/subnets:
```bash
AWS_PROFILE=deploy aws lambda get-function-configuration \
  --function-name NestApiStack-NestLambdaFunction*
```

3. Check CloudWatch Logs for connection errors

### Password Retrieval Issues

Ensure Lambda has permission to read secrets:
- IAM role should have `secretsmanager:GetSecretValue` permission
- This is automatically configured by CDK

### Cold Start Performance

Lambda in VPC has slightly longer cold starts (~1-2 seconds).
Consider:
- Provisioned concurrency for critical functions
- Connection pooling in your application
- Using RDS Proxy

## Resources

- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [TypeORM Documentation](https://typeorm.io/)
- [NestJS Database Documentation](https://docs.nestjs.com/techniques/database)
