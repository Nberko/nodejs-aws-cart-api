# Deployment Guide

## Overview

Your NestJS Cart API is now configured for AWS deployment using:
- **AWS Lambda** - Serverless compute for running your NestJS application
- **API Gateway** - HTTP API endpoint
- **AWS CDK** - Infrastructure as Code

## Quick Start Deployment

### 1. Configure AWS Credentials

Ensure you have AWS CLI configured with valid credentials:

```bash
aws configure
```

You'll need:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `eu-west-1`)

Verify your credentials:
```bash
aws sts get-caller-identity
```

### 2. Install AWS CDK CLI (if not already installed)

```bash
npm install -g aws-cdk
```

### 3. Bootstrap CDK (First Time Only)

If this is your first time using CDK in this AWS account/region:

```bash
cd cdk
npm run bootstrap
```

### 4. Deploy to AWS

```bash
cd cdk
npm run deploy
```

This will:
1. Bundle your NestJS application
2. Create Lambda function
3. Set up API Gateway
4. Configure permissions and integrations

You'll be asked to approve security changes - type `y` to proceed.

### 5. Get Your API URL

After successful deployment, you'll see output like:

```
✅  NestApiStack

Outputs:
NestApiStack.ApiUrl = https://xxxxxxxxxx.execute-api.eu-west-1.amazonaws.com/prod/
NestApiStack.LambdaFunctionArn = arn:aws:lambda:eu-west-1:xxxxxxxxxxxx:function:NestApiStack-NestLambdaFunction-xxxxx
```

## Testing Your Deployment

Test your API endpoint:

```bash
curl https://your-api-url.execute-api.eu-west-1.amazonaws.com/prod/api/health
```

## Project Structure

```
nodejs-aws-cart-api/
├── src/
│   ├── lambda.ts          # Lambda handler (entry point)
│   └── ...                # NestJS application files
├── cdk/                   # CDK infrastructure code
│   ├── bin/cdk.ts        # CDK app entry point
│   ├── lib/nest-api-stack.ts  # Stack definition
│   └── README.md         # Detailed CDK documentation
└── DEPLOYMENT.md         # This file
```

## Common Commands

### Build NestJS App
```bash
npm run build
```

### View Changes Before Deployment
```bash
cd cdk && npm run diff
```

### Update Deployed Application
After making code changes:
```bash
npm run build
cd cdk && npm run deploy
```

### View Lambda Logs
```bash
aws logs tail /aws/lambda/NestApiStack-NestLambdaFunction --follow
```

### Destroy Infrastructure
⚠️ This will delete all AWS resources:
```bash
cd cdk && npm run destroy
```

## Configuration

### Environment Variables

To add environment variables to your Lambda function, edit `cdk/lib/nest-api-stack.ts`:

```typescript
environment: {
  NODE_ENV: 'production',
  DATABASE_URL: 'your-database-url',
  // Add more variables here
},
```

Then redeploy:
```bash
cd cdk && npm run deploy
```

### Lambda Settings

Adjust Lambda configuration in `cdk/lib/nest-api-stack.ts`:

```typescript
timeout: cdk.Duration.seconds(30),  // Max execution time
memorySize: 512,                     // Memory in MB (128-10240)
```

### API Gateway Settings

CORS is pre-configured to allow all origins. To restrict, modify in `cdk/lib/nest-api-stack.ts`:

```typescript
defaultCorsPreflightOptions: {
  allowOrigins: ['https://yourdomain.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
}
```

## Monitoring

### CloudWatch Logs
- Lambda logs: `/aws/lambda/NestApiStack-NestLambdaFunction`
- View in AWS Console: CloudWatch → Log groups

### Metrics
Monitor in AWS Console:
- Lambda: Invocations, Duration, Errors, Throttles
- API Gateway: Request count, Latency, 4xx/5xx errors

## Troubleshooting

### Deployment Fails

1. **Check AWS credentials:**
   ```bash
   aws sts get-caller-identity
   ```

2. **Ensure CDK is bootstrapped:**
   ```bash
   cd cdk && npm run bootstrap
   ```

3. **Clear CDK cache:**
   ```bash
   cd cdk && rm -rf cdk.out && npm run synth
   ```

### Lambda Errors

View logs:
```bash
aws logs tail /aws/lambda/NestApiStack-NestLambdaFunction --follow
```

### Cold Start Issues

If experiencing slow cold starts:
- Increase memory (faster CPU)
- Consider provisioned concurrency (additional cost)

## Cost Estimation

AWS Free Tier includes:
- Lambda: 1M free requests/month + 400,000 GB-seconds compute
- API Gateway: 1M free requests/month (first 12 months)
- CloudWatch: 5GB log ingestion

Typical small application stays within free tier.

## Next Steps

1. ✅ Deploy to AWS
2. Configure custom domain (optional)
3. Set up CI/CD pipeline
4. Add monitoring and alerts
5. Configure backups (if using databases)

## Support

For issues:
- CDK documentation: https://docs.aws.amazon.com/cdk/
- NestJS documentation: https://docs.nestjs.com/
- Check `cdk/README.md` for more details

## Security Best Practices

1. Never commit AWS credentials
2. Use IAM roles with minimum required permissions
3. Enable AWS CloudTrail for audit logging
4. Regularly update dependencies
5. Use environment variables for secrets (or AWS Secrets Manager)
