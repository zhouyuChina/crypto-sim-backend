import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app/app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RedisIoAdapter } from './realtime/redis-io-adapter';
import { RedisService } from './redis/redis.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true
  });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // 信任反向代理（Nginx），使 req.ip 读取 X-Forwarded-For 首位
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  // Serve static files — __dirname is backend/dist after build, so one level up = backend/
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS
  app.enableCors({
    origin: true, // Allow all origins in development, configure specifically in production
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.setGlobalPrefix('api');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be loaded
  }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidUnknownValues: false
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new TransformInterceptor());

  // Redis WebSocket 适配器（可选）
  const redisEnabled = configService.get<boolean>('redis.enabled');
  if (redisEnabled) {
    try {
      const redisService = app.get(RedisService);
      const redisAdapter = new RedisIoAdapter(app, redisService, configService);
      await redisAdapter.connect();
      app.useWebSocketAdapter(redisAdapter);
      logger.log('Redis WebSocket adapter enabled');
    } catch (error) {
      logger.warn('Failed to connect Redis adapter, using default adapter', error);
    }
  } else {
    logger.log('Redis disabled, using default WebSocket adapter');
  }

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Crypto Sim API')
    .setDescription('Crypto Sim 后端接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  const port = configService.get<number>('http.port', 3000);
  const host = configService.get<string>('http.host', '0.0.0.0');
  await app.listen(port, host);
  logger.log(`Backend listening on http://${host}:${port}`);
}

void bootstrap();
