# Quick Start - Deployment

## Your API is already deployed! 🎉

**API URL:** https://r2ojozs7s3.execute-api.eu-west-1.amazonaws.com/prod/

## Test Endpoints

```bash
# Health check
curl https://r2ojozs7s3.execute-api.eu-west-1.amazonaws.com/prod/ping

# Expected response: {"statusCode":200,"message":"OK"}
```

## Available Endpoints

- `GET /ping` - Health check (public)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/profile` - Get user profile (requires auth)
- Cart endpoints (require auth)
- Order endpoints (require auth)

## Re-deploy After Changes

```bash
# 1. Build the app
npm run build

# 2. Deploy (from cdk directory)
cd cdk
npm run deploy
```

## AWS Resources Created

- **Lambda Function:** `NestApiStack-NestLambdaFunction553906D7-o0cGqxeilDsB`
- **API Gateway:** https://r2ojozs7s3.execute-api.eu-west-1.amazonaws.com/prod/
- **Region:** eu-west-1
- **Account:** 833376855827

## View Logs

```bash
AWS_PROFILE=deploy aws logs tail /aws/lambda/NestApiStack-NestLambdaFunction553906D7-o0cGqxeilDsB --follow
```

## Important Notes

- All CDK commands now automatically use the `deploy` AWS profile
- The profile is configured in `~/.aws/credentials` as `[deploy]`
- No need to manually specify `AWS_PROFILE=deploy` anymore

## Destroy Resources (cleanup)

```bash
cd cdk
npm run destroy
```

⚠️ This will delete all AWS resources and cannot be undone.
