import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { redisStore } from 'cache-manager-ioredis-yet';

import configuration from '../config/configuration';
import validateEnv from '../config/validate-env';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { QueueModule } from '../queue/queue.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { UsersModule } from '../users/users.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { MailModule } from '../mail/mail.module';
import { TransactionLogModule } from '../transaction-log/transaction-log.module';
import { SettingsModule } from '../settings/settings.module';
import { CmsModule } from '../cms/cms.module';
import { PublicCmsModule } from '../cms/public/public-cms.module';
import { OperatorsModule } from '../operators/operators.module';
import { TradingManagementModule } from '../trading-management/trading-management.module';
import { SupportModule } from '../support/support.module';
import { MarketSessionModule } from '../market-session/market-session.module';
import { AdminTradingModule } from '../admin-trading/admin-trading.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  translateTime: 'SYS:standard'
                }
              }
      }
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisEnabled = configService.get<boolean>('redis.enabled');

        if (redisEnabled) {
          // 使用 Redis 缓存
          const store = await redisStore({
            host: configService.get<string>('redis.host'),
            port: configService.get<number>('redis.port'),
            username: configService.get<string>('redis.username') || undefined,
            password: configService.get<string>('redis.password') || undefined,
            db: configService.get<number>('redis.cacheDb')
          });

          return {
            store,
            ttl: configService.get<number>('cache.ttl')
          };
        } else {
          // 使用内存缓存
          return {
            ttl: configService.get<number>('cache.ttl')
          };
        }
      }
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('rateLimit.ttl') ?? 60000,
          limit: configService.get<number>('rateLimit.limit') ?? 10
        }
      ]
    }),
    // BullMQ 需要 Redis，开发模式下暂时注释
    // TODO: 等需要使用消息队列功能时再启用
    // BullModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => ({
    //     connection: {
    //       host: configService.get<string>('redis.host'),
    //       port: configService.get<number>('redis.port'),
    //       db: configService.get<number>('redis.bullmqDb'),
    //       password: configService.get<string>('redis.password') || undefined
    //     },
    //     prefix: configService.get<string>('queue.prefix')
    //   })
    // }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    TerminusModule,
    PrismaModule,
    RedisModule,
    // QueueModule 依赖 BullMQ，开发模式下暂时注释
    // TODO: 等需要使用消息队列功能时再启用
    // QueueModule,
    AuthModule,
    AdminAuthModule,
    UsersModule,
    CmsModule,
    PublicCmsModule,
    RealtimeModule,
    MarketDataModule,
    MailModule,
    TransactionLogModule,
    SettingsModule,
    OperatorsModule,
    TradingManagementModule,
    SupportModule,
    MarketSessionModule,
    AdminTradingModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ]
})
export class AppModule {}
