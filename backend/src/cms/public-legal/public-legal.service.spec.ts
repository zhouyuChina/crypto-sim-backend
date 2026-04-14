import { BusinessException } from '../../common/exceptions/business.exception';
import { PublicLegalService } from './public-legal.service';

describe('PublicLegalService', () => {
  const createService = () => {
    const prisma = {
      publicLegalContent: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    };

    return {
      prisma,
      service: new PublicLegalService(prisma as any)
    };
  };

  it('returns only published content to the public endpoint', async () => {
    const { prisma, service } = createService();

    prisma.publicLegalContent.findUnique.mockResolvedValue(null);

    await expect(service.findPublishedByLocale('zh-TW')).rejects.toMatchObject<
      Partial<BusinessException>
    >({
      code: 'PUBLIC_LEGAL_NOT_FOUND'
    });
  });

  it('rejects version conflicts on upsert', async () => {
    const { prisma, service } = createService();

    prisma.publicLegalContent.findUnique.mockResolvedValue({
      id: 'cms-1',
      locale: 'zh-TW',
      version: 3,
      isPublished: true
    });

    await expect(
      service.upsert(
        'zh-TW',
        {
          version: 2,
          homeAntiScam: {
            title: '反诈骗宣导',
            tip1: 'tip1',
            tip2: 'tip2',
            tip3: 'tip3',
            tip4: 'tip4',
            suggestion: 'stay safe'
          },
          tutorialSectionE: {
            title: '风险提示',
            content: 'line1\nline2'
          }
        },
        'admin-1'
      )
    ).rejects.toMatchObject<Partial<BusinessException>>({
      code: 'VERSION_CONFLICT'
    });
  });

  it('rejects unsupported html tags in anti scam copy', async () => {
    const { prisma, service } = createService();

    prisma.publicLegalContent.findUnique.mockResolvedValue(null);

    await expect(
      service.upsert(
        'zh-TW',
        {
          version: 0,
          homeAntiScam: {
            title: '反诈骗宣导',
            tip1: '<script>alert(1)</script>',
            tip2: 'tip2',
            tip3: 'tip3',
            tip4: 'tip4',
            suggestion: 'stay safe'
          },
          tutorialSectionE: {
            title: '风险提示',
            content: 'line1\nline2'
          }
        },
        'admin-1'
      )
    ).rejects.toMatchObject<Partial<BusinessException>>({
      code: 'VALIDATION_ERROR'
    });
  });
});
