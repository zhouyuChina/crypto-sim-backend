import * as path from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

import emailConfig from '../config/email.config';
import { PrismaModule } from '../prisma/prisma.module';

import { EmailVerificationService } from './email-verification.service';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';


@Module({
  imports: [
    ConfigModule.forFeature(emailConfig),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: configService.get('email.transport'),
        defaults: configService.get('email.defaults'),
        template: {
          // __dirname在编译后指向 dist/src/email，但模板在 dist/email/templates
          // 所以需要向上两级，然后进入 email/templates
          dir: path.join(__dirname, '../../email/templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailVerificationService],
  exports: [EmailService, EmailVerificationService],
})
export class EmailModule {}
