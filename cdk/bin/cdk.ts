#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NestApiStack } from '../lib/nest-api-stack';

const app = new cdk.App();

new NestApiStack(app, 'NestApiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'NestJS Cart API deployed on AWS Lambda with API Gateway',
});
