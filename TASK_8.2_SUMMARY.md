# Task 8.2 Summary - RDS PostgreSQL Integration

## What Was Implemented

### 1. VPC Configuration
- Created VPC with 2 Availability Zones for high availability
- **Public Subnets**: For NAT Gateway and Internet Gateway
- **Private Subnets**: For Lambda functions (with egress to internet via NAT)
- **Isolated Subnets**: For RDS database (no internet access)

### 2. RDS PostgreSQL Instance
- **Engine**: PostgreSQL 15 (latest minor version)
- **Instance Class**: db.t3.micro (Free tier eligible)
- **Storage**: 20 GB with auto-scaling up to 100 GB
- **Database Name**: `nestcartdb`
- **Username**: `dbadmin`
- **Password**: Auto-generated and stored in AWS Secrets Manager
- **Backups**: 7-day retention

### 3. Security Groups
#### Lambda Security Group
- **Outbound**: All traffic allowed (to access RDS and internet)

#### Database Security Group
- **Inbound**: Only port 5432 from Lambda Security Group
- **Outbound**: None (database doesn't need outbound)

### 4. Lambda VPC Integration
- Lambda deployed in **Private Subnets** with egress
- Configured to use Lambda Security Group
- Environment variables automatically set:
  - `DB_HOST`: RDS endpoint
  - `DB_PORT`: 5432
  - `DB_NAME`: nestcartdb
  - `DB_USERNAME`: dbadmin
  - `DB_SECRET_ARN`: ARN of secret containing password

### 5. IAM Permissions
- Lambda granted permission to read database secret from Secrets Manager
- Automatic password retrieval support

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              VPC                                    │
│                                                                     │
│  ┌────────────────────┐           ┌──────────────────────────┐     │
│  │  Public Subnet (AZ1│           │  Private Subnet (AZ1)    │     │
│  │                    │           │                          │     │
│  │  NAT Gateway       │──────────▶│  Lambda Function         │     │
│  │  Internet Gateway  │           │  (NestJS App)            │     │
│  └────────────────────┘           │                          │     │
│                                   │  Port 5432 ▼             │     │
│  ┌────────────────────┐           └──────────────────────────┘     │
│  │  Public Subnet (AZ2│                                            │
│  │                    │           ┌──────────────────────────┐     │
│  │  (NAT backup)      │           │  Isolated Subnet (AZ1)   │     │
│  └────────────────────┘           │                          │     │
│                                   │  RDS PostgreSQL          │     │
│                                   │  (no internet)           │     │
│                                   └──────────────────────────┘     │
│                                                                     │
│                                   ┌──────────────────────────┐     │
│                                   │  Isolated Subnet (AZ2)   │     │
│                                   │  (RDS Multi-AZ)          │     │
│                                   └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Files Modified

1. **cdk/lib/nest-api-stack.ts**
   - Added VPC construct
   - Added RDS PostgreSQL instance
   - Added Security Groups
   - Updated Lambda configuration for VPC
   - Added environment variables
   - Added IAM permissions

## Deployment Status

Currently deploying with the following command:
```bash
cd cdk
npm run deploy
```

This will:
1. Create VPC and all subnets (~2 min)
2. Create NAT Gateway (~1 min)
3. Create RDS PostgreSQL instance (~5-8 min)
4. Update Lambda function (~1 min)
5. Configure all security groups and permissions

**Total deployment time**: ~10 minutes

## After Deployment

### Getting Database Credentials

```bash
# Get secret ARN
AWS_PROFILE=deploy aws cloudformation describe-stacks \
  --stack-name NestApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' \
  --output text

# Get password
AWS_PROFILE=deploy aws secretsmanager get-secret-value \
  --secret-id <SECRET_ARN> \
  --query SecretString \
  --output text | jq -r '.password'
```

### Stack Outputs

After deployment, you'll see:
- `ApiUrl`: API Gateway endpoint
- `DatabaseEndpoint`: RDS host address
- `DatabaseSecretArn`: Secret ARN with password
- `DatabaseName`: nestcartdb
- `LambdaFunctionArn`: Lambda ARN

## Next Steps

1. **Install TypeORM** in your NestJS app:
   ```bash
   npm install --save @nestjs/typeorm typeorm pg @aws-sdk/client-secrets-manager
   ```

2. **Create Database Module** (see `cdk/DATABASE.md` for complete guide)

3. **Define Entities** for Cart, Order, User tables

4. **Create and Run Migrations**

5. **Update NestJS Services** to use TypeORM repositories

## Cost Estimate

- RDS db.t3.micro: $15-20/month (Free tier: 750 hours/month)
- Storage (20 GB): $2-3/month (Free tier: 20 GB)
- NAT Gateway: ~$32/month (NOT free tier)
- Data Transfer: Variable

**Total**: ~$50/month (or ~$0 if within free tier limits)

## Documentation

- **DATABASE.md**: Complete database integration guide
- **DEPLOYMENT.md**: Deployment instructions
- **QUICKSTART.md**: Quick reference

## Notes

- Database is in **isolated subnets** with NO internet access (security best practice)
- Lambda has internet access via NAT Gateway (for npm packages, external APIs)
- Password is auto-generated and stored securely in Secrets Manager
- Backups are automated (7-day retention)
- `deletionProtection: false` for development (set to `true` for production)

## Troubleshooting

If deployment fails:
1. Check CloudFormation console for details
2. Verify AWS credentials: `AWS_PROFILE=deploy aws sts get-caller-identity`
3. Check CDK logs in terminal
4. See DATABASE.md troubleshooting section
