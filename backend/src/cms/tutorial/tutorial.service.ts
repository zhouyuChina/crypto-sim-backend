import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException } from '../../common/exceptions/business.exception';
import { PrismaService } from '../../prisma/prisma.service';

import { UpsertTutorialDto } from './dto/upsert-tutorial.dto';

const TUTORIAL_KEY = 'cms.tutorial';
const TUTORIAL_CATEGORY = 'cms';

export interface TutorialContent {
  version: number;
  sectionA: UpsertTutorialDto['sectionA'];
  sectionB: UpsertTutorialDto['sectionB'];
  sectionC: UpsertTutorialDto['sectionC'];
  sectionD: UpsertTutorialDto['sectionD'];
  updatedAt?: Date;
  updatedBy?: string;
}

@Injectable()
export class TutorialService {
  private readonly logger = new Logger(TutorialService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOne(): Promise<TutorialContent> {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key: TUTORIAL_KEY },
    });

    if (!setting) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'TUTORIAL_NOT_FOUND',
        '新手教学内容尚未配置',
      );
    }

    return this.toResponse(setting.value, setting.updatedAt);
  }

  async findOneOrNull(): Promise<TutorialContent | null> {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key: TUTORIAL_KEY },
    });

    if (!setting) {
      return null;
    }

    return this.toResponse(setting.value, setting.updatedAt);
  }

  async upsert(dto: UpsertTutorialDto, operatorId: string): Promise<TutorialContent> {
    const value = {
      version: dto.version,
      sectionA: dto.sectionA,
      sectionB: dto.sectionB,
      sectionC: dto.sectionC,
      sectionD: dto.sectionD,
      updatedBy: operatorId,
    };

    const saved = await this.prisma.systemSettings.upsert({
      where: { key: TUTORIAL_KEY },
      create: {
        key: TUTORIAL_KEY,
        category: TUTORIAL_CATEGORY,
        description: '新手教学（首页/教程页）',
        value: value as any,
      },
      update: {
        value: value as any,
      },
    });

    this.logger.log(`新手教学已更新 by ${operatorId}, version=${dto.version}`);

    return this.toResponse(saved.value, saved.updatedAt);
  }

  private toResponse(rawValue: unknown, updatedAt: Date): TutorialContent {
    const value = (rawValue ?? {}) as Partial<TutorialContent>;
    return {
      version: value.version ?? 0,
      sectionA: value.sectionA as TutorialContent['sectionA'],
      sectionB: value.sectionB as TutorialContent['sectionB'],
      sectionC: value.sectionC as TutorialContent['sectionC'],
      sectionD: value.sectionD as TutorialContent['sectionD'],
      updatedAt,
      updatedBy: value.updatedBy,
    };
  }
}
