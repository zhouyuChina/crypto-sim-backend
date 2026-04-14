import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { BusinessException } from '../../common/exceptions/business.exception';
import { PrismaService } from '../../prisma/prisma.service';

import { PatchPublicLegalContentDto } from './dto/patch-public-legal-content.dto';
import {
  PublicLegalContentListItemDto,
  PublicLegalContentResponseDto
} from './dto/public-legal-content-response.dto';
import { PublishPublicLegalContentDto } from './dto/publish-public-legal-content.dto';
import { UpsertPublicLegalContentDto } from './dto/upsert-public-legal-content.dto';

type PublicLegalContentRecord = Awaited<
  ReturnType<PrismaService['publicLegalContent']['findUnique']>
>;

type HomeAntiScamContent = {
  title: string;
  tip1: string;
  tip2: string;
  tip3: string;
  tip4: string;
  suggestion: string;
};

type TutorialSectionEContent = {
  title: string;
  content: string;
};

type PublicLegalContentShape = {
  version: number;
  homeAntiScam: HomeAntiScamContent;
  tutorialSectionE: TutorialSectionEContent;
};

@Injectable()
export class PublicLegalService {
  private readonly logger = new Logger(PublicLegalService.name);
  private readonly supportedLocales = ['zh-TW', 'zh-CN', 'en', 'es', 'pt', 'ru'];

  constructor(private readonly prisma: PrismaService) {}

  async findPublishedByLocale(locale: string): Promise<PublicLegalContentResponseDto> {
    this.ensureValidLocale(locale);

    const record = await this.prisma.publicLegalContent.findUnique({
      where: { locale }
    });

    if (!record || !record.isPublished) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'PUBLIC_LEGAL_NOT_FOUND',
        '公开法务文案不存在'
      );
    }

    return new PublicLegalContentResponseDto(record);
  }

  async findAll(): Promise<PublicLegalContentListItemDto[]> {
    const records = await this.prisma.publicLegalContent.findMany({
      orderBy: { locale: 'asc' }
    });

    return records.map(record => new PublicLegalContentListItemDto(record));
  }

  async findOne(locale: string): Promise<PublicLegalContentResponseDto> {
    this.ensureValidLocale(locale);

    const record = await this.prisma.publicLegalContent.findUnique({
      where: { locale }
    });

    if (!record) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'PUBLIC_LEGAL_NOT_FOUND',
        '法务文案不存在'
      );
    }

    return new PublicLegalContentResponseDto(record);
  }

  async upsert(
    locale: string,
    dto: UpsertPublicLegalContentDto,
    adminId: string
  ): Promise<PublicLegalContentResponseDto> {
    this.ensureValidLocale(locale);
    this.validateContent(dto);

    const existingRecord = await this.prisma.publicLegalContent.findUnique({
      where: { locale }
    });

    if (existingRecord) {
      this.ensureVersionMatches(existingRecord.version, dto.version);

      const updatedRecord = await this.prisma.publicLegalContent.update({
        where: { locale },
        data: {
          homeAntiScam: this.toJsonObject(dto.homeAntiScam),
          tutorialSectionE: this.toJsonObject(dto.tutorialSectionE),
          version: existingRecord.version + 1,
          updatedBy: adminId
        }
      });

      this.logger.log(`Public legal content updated: locale=${locale}, adminId=${adminId}`);

      return new PublicLegalContentResponseDto(updatedRecord);
    }

    if (dto.version !== 0) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        'VERSION_CONFLICT',
        '版本号不匹配，请刷新后重试'
      );
    }

    const createdRecord = await this.prisma.publicLegalContent.create({
      data: {
        locale,
        homeAntiScam: this.toJsonObject(dto.homeAntiScam),
        tutorialSectionE: this.toJsonObject(dto.tutorialSectionE),
        version: 1,
        createdBy: adminId,
        updatedBy: adminId
      }
    });

    this.logger.log(`Public legal content created: locale=${locale}, adminId=${adminId}`);

    return new PublicLegalContentResponseDto(createdRecord);
  }

  async patch(
    locale: string,
    dto: PatchPublicLegalContentDto,
    adminId: string
  ): Promise<PublicLegalContentResponseDto> {
    this.ensureValidLocale(locale);

    const existingRecord = await this.prisma.publicLegalContent.findUnique({
      where: { locale }
    });

    if (!existingRecord) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'PUBLIC_LEGAL_NOT_FOUND',
        '法务文案不存在'
      );
    }

    this.ensureVersionMatches(existingRecord.version, dto.version);

    const mergedContent = this.mergeContent(existingRecord, dto);
    this.validateContent(mergedContent);

    const updatedRecord = await this.prisma.publicLegalContent.update({
      where: { locale },
      data: {
        homeAntiScam: this.toJsonObject(mergedContent.homeAntiScam),
        tutorialSectionE: this.toJsonObject(mergedContent.tutorialSectionE),
        version: existingRecord.version + 1,
        updatedBy: adminId
      }
    });

    this.logger.log(`Public legal content patched: locale=${locale}, adminId=${adminId}`);

    return new PublicLegalContentResponseDto(updatedRecord);
  }

  async remove(locale: string): Promise<{ message: string }> {
    this.ensureValidLocale(locale);

    const record = await this.prisma.publicLegalContent.findUnique({
      where: { locale }
    });

    if (!record) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'PUBLIC_LEGAL_NOT_FOUND',
        '法务文案不存在'
      );
    }

    await this.prisma.publicLegalContent.delete({
      where: { locale }
    });

    this.logger.log(`Public legal content deleted: locale=${locale}`);

    return {
      message: `法务文案 ${locale} 已删除`
    };
  }

  async publish(
    locale: string,
    dto: PublishPublicLegalContentDto,
    adminId: string
  ): Promise<PublicLegalContentResponseDto> {
    this.ensureValidLocale(locale);

    const existingRecord = await this.prisma.publicLegalContent.findUnique({
      where: { locale }
    });

    if (!existingRecord) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'PUBLIC_LEGAL_NOT_FOUND',
        '法务文案不存在'
      );
    }

    this.ensureVersionMatches(existingRecord.version, dto.version);

    const publishedRecord = await this.prisma.publicLegalContent.update({
      where: { locale },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        version: existingRecord.version + 1,
        updatedBy: adminId
      }
    });

    this.logger.log(`Public legal content published: locale=${locale}, adminId=${adminId}`);

    return new PublicLegalContentResponseDto(publishedRecord);
  }

  private ensureValidLocale(locale: string): void {
    if (!this.supportedLocales.includes(locale)) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'INVALID_LOCALE', '不支持的语系');
    }
  }

  private ensureVersionMatches(currentVersion: number, incomingVersion: number): void {
    if (currentVersion !== incomingVersion) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        'VERSION_CONFLICT',
        '版本号不匹配，请刷新后重试'
      );
    }
  }

  private mergeContent(
    record: NonNullable<PublicLegalContentRecord>,
    dto: PatchPublicLegalContentDto
  ): PublicLegalContentShape {
    return {
      version: dto.version,
      homeAntiScam: {
        ...(record.homeAntiScam as Record<string, string>),
        ...(dto.homeAntiScam ?? {})
      } as HomeAntiScamContent,
      tutorialSectionE: {
        ...(record.tutorialSectionE as Record<string, string>),
        ...(dto.tutorialSectionE ?? {})
      } as TutorialSectionEContent
    };
  }

  private validateContent(dto: PublicLegalContentShape): void {
    const antiScamValues = Object.values(dto.homeAntiScam);
    antiScamValues.forEach(value => this.ensureAllowedHtml(value));
    this.ensureNoHtml(dto.tutorialSectionE.title);
    this.ensureNoHtml(dto.tutorialSectionE.content);
  }

  private ensureAllowedHtml(value: string): void {
    const tags = value.match(/<[^>]+>/g) ?? [];
    const containsUnsupportedTag = tags.some(tag => tag !== '<strong>' && tag !== '</strong>');

    if (containsUnsupportedTag) {
      throw new BusinessException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'VALIDATION_ERROR',
        '仅允许 <strong> HTML 标签'
      );
    }
  }

  private ensureNoHtml(value: string): void {
    if (/<[^>]+>/.test(value)) {
      throw new BusinessException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'VALIDATION_ERROR',
        '字段内容不能包含 HTML 标签'
      );
    }
  }

  private toJsonObject<T extends object>(value: T): Prisma.InputJsonObject {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }
}
