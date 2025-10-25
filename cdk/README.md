# NestJS Cart API - AWS CDK Deployment

This directory contains the AWS CDK infrastructure code to deploy the NestJS Cart API to AWS Lambda with API Gateway.

## Prerequisites

Before deploying, ensure you have:

1. AWS CLI installed and configured with appropriate credentials
2. AWS CDK CLI installed globally: `npm install -g aws-cdk`
3. Node.js 20.x or later

## AWS Configuration

Make sure your AWS credentials are configured:

```bash
aws configure
```

You'll need:
- AWS Access Key ID
- AWS Secret Access Key
- Default region name (e.g., us-east-1)
- Default output format (json)

## Bootstrap CDK (First Time Only)

If this is your first time using CDK in this AWS account/region, you need to bootstrap:

```bash
cd cdk
npm run bootstrap
```

This creates the necessary resources in your AWS account for CDK deployments.

## Deployment Steps

### 1. Build the NestJS Application

From the project root:

```bash
cd /Users/nika_beridze/Desktop/Projects/nodejs-aws-cart-api
npm run build
```

### 2. Synthesize the CloudFormation Template

This generates the CloudFormation template that CDK will deploy:

```bash
cd cdk
npm run synth
```

### 3. Deploy to AWS

Deploy the stack to AWS:

```bash
npm run deploy
```

This command will:
- Bundle your NestJS application
- Create a Lambda function
- Set up API Gateway
- Configure all necessary permissions and integrations

You'll be prompted to approve security-related changes. Type `y` to proceed.

### 4. Get the API URL

After deployment, CDK will output the API Gateway URL:

```
Outputs:
NestApiStack.ApiUrl = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
```

## Testing the Deployment

Test your deployed API:

```bash
curl https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod/
```

## Updating the Application

After making changes to your NestJS application:

1. Build the application: `npm run build` (from project root)
2. Deploy the changes: `npm run deploy` (from cdk directory)

## Viewing Differences

To see what changes will be made before deploying:

```bash
npm run diff
```

## Destroying the Stack

To remove all resources created by this stack:

```bash
npm run destroy
```

⚠️ **Warning**: This will delete all resources including the Lambda function and API Gateway.

## Stack Details

### Resources Created

- **Lambda Function**: Runs the NestJS application with Node.js 20.x runtime
  - Memory: 512 MB
  - Timeout: 30 seconds
  - Bundled with all necessary dependencies

- **API Gateway**: REST API with proxy integration
  - Stage: prod
  - CORS enabled for all origins
  - Rate limiting: 100 requests/second
  - Burst limit: 200 requests

### Environment Variables

You can add environment variables to the Lambda function in `lib/nest-api-stack.ts`:

```typescript
environment: {
  NODE_ENV: 'production',
  // Add your variables here
},
```

## Monitoring

View Lambda logs in CloudWatch:

```bash
aws logs tail /aws/lambda/NestApiStack-NestLambdaFunction --follow
```

## Troubleshooting

### Build Errors

If you encounter build errors:
1. Ensure all dependencies are installed: `npm install` in both root and cdk directories
2. Clear the cdk.out directory: `rm -rf cdk.out`
3. Rebuild: `npm run build`

### Deployment Errors

If deployment fails:
1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify CDK bootstrap: `npm run bootstrap`
3. Check CloudFormation console for detailed error messages

## Cost Estimation

This setup uses the following AWS services:
- Lambda (pay per request + compute time)
- API Gateway (pay per request)
- CloudWatch Logs (log storage)

Most applications will stay within AWS Free Tier limits for development/testing.
