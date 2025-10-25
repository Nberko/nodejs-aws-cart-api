import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Context, Handler } from 'aws-lambda';
import { configure } from '@vendia/serverless-express';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

let cachedServer: Handler;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    nestApp.enableCors({
      origin: (req, callback) => callback(null, true),
    });
    nestApp.use(helmet());

    await nestApp.init();

    cachedServer = configure({ app: expressApp });
  }

  return cachedServer;
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: any,
) => {
  const server = await bootstrap();
  return server(event, context, callback);
};
