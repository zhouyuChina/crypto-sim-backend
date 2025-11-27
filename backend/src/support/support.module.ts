import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { SupportController } from './support.controller';
import { SupportAdminController } from './support-admin.controller';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/support-images',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('只支持图片格式（JPEG、PNG、GIF、WebP）'), false);
        }
      },
    }),
  ],
  controllers: [SupportController, SupportAdminController],
  providers: [SupportService, SupportGateway],
  exports: [SupportService],
})
export class SupportModule {}
