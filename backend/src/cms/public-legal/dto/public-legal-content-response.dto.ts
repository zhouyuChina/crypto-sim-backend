type PublicLegalRecordLike = {
  locale: string;
  homeAntiScam: unknown;
  tutorialSectionE: unknown;
  version: number;
  isPublished: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
};

export class PublicLegalContentResponseDto {
  locale: string;
  homeAntiScam: unknown;
  tutorialSectionE: unknown;
  version: number;
  isPublished: boolean;
  publishedAt: Date | null;
  updatedAt: Date;

  constructor(record: PublicLegalRecordLike) {
    this.locale = record.locale;
    this.homeAntiScam = record.homeAntiScam;
    this.tutorialSectionE = record.tutorialSectionE;
    this.version = record.version;
    this.isPublished = record.isPublished;
    this.publishedAt = record.publishedAt;
    this.updatedAt = record.updatedAt;
  }
}

export class PublicLegalContentListItemDto {
  locale: string;
  version: number;
  isPublished: boolean;
  publishedAt: Date | null;
  updatedAt: Date;

  constructor(record: PublicLegalRecordLike) {
    this.locale = record.locale;
    this.version = record.version;
    this.isPublished = record.isPublished;
    this.publishedAt = record.publishedAt;
    this.updatedAt = record.updatedAt;
  }
}
