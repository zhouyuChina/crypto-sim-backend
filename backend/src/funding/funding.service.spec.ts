import { Prisma } from '@prisma/client';

import { BusinessException } from '../common/exceptions/business.exception';
import { FundingService } from './funding.service';

describe('FundingService', () => {
  const createService = () => {
    const tx = {
      fundingRecord: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn()
      },
      balanceLedger: {
        create: jest.fn()
      },
      user: {
        update: jest.fn()
      }
    };

    const prisma = {
      fundingRecord: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn()
      },
      $transaction: jest.fn(async (callback: (innerTx: typeof tx) => unknown) => callback(tx))
    };

    return {
      prisma,
      tx,
      service: new FundingService(prisma as any)
    };
  };

  it('rejects duplicate deposit tx hashes', async () => {
    const { prisma, service } = createService();

    prisma.fundingRecord.findFirst.mockResolvedValue({ id: 'dep-1' });

    await expect(
      service.createDeposit('user-1', {
        amount: 100.5,
        network: 'TRC20',
        txHash: 'duplicate-hash',
        remark: 'manual submit'
      })
    ).rejects.toMatchObject<Partial<BusinessException>>({
      code: 'DUPLICATE_TX_HASH'
    });
  });

  it('rejects withdraw requests from unverified users', async () => {
    const { service } = createService();

    await expect(
      service.createWithdraw(
        {
          id: 'user-1',
          verificationStatus: 'PENDING',
          realBalance: 100
        } as any,
        {
          amount: 50,
          network: 'TRC20',
          toAddress: 'TQx9LqS3K4qB4Jxj2m5v7u9n1p3r5t7y9z',
          remark: 'cash out'
        }
      )
    ).rejects.toMatchObject<Partial<BusinessException>>({
      code: 'KYC_REQUIRED'
    });
  });

  it('approves a deposit and applies real balance changes atomically', async () => {
    const { service, tx } = createService();

    tx.fundingRecord.findUnique
      .mockResolvedValueOnce({
        id: 'dep-1',
        type: 'deposit',
        status: 'pending',
        amount: new Prisma.Decimal('100.5'),
        network: 'TRC20',
        txHash: 'hash-1',
        toAddress: null,
        remark: 'manual submit',
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
        balanceApplied: false,
        beforeRealBalance: null,
        afterRealBalance: null,
        createdAt: new Date('2026-04-10T08:00:00.000Z'),
        updatedAt: new Date('2026-04-10T08:00:00.000Z'),
        userId: 'user-1',
        user: {
          id: 'user-1',
          displayName: 'Alice',
          realBalance: new Prisma.Decimal('50')
        }
      })
      .mockResolvedValueOnce({
        id: 'dep-1',
        type: 'deposit',
        status: 'completed',
        amount: new Prisma.Decimal('100.5'),
        network: 'TRC20',
        txHash: 'hash-1',
        toAddress: null,
        remark: 'manual submit',
        reviewNote: '链上确认完成',
        reviewedAt: new Date('2026-04-10T09:00:00.000Z'),
        reviewedBy: 'admin-1',
        balanceApplied: true,
        beforeRealBalance: new Prisma.Decimal('50'),
        afterRealBalance: new Prisma.Decimal('150.5'),
        createdAt: new Date('2026-04-10T08:00:00.000Z'),
        updatedAt: new Date('2026-04-10T09:00:00.000Z'),
        userId: 'user-1',
        user: {
          id: 'user-1',
          displayName: 'Alice',
          realBalance: new Prisma.Decimal('150.5')
        }
      });
    tx.fundingRecord.updateMany.mockResolvedValue({ count: 1 });
    tx.user.update.mockResolvedValue({
      id: 'user-1',
      realBalance: new Prisma.Decimal('150.5')
    });
    tx.balanceLedger.create.mockResolvedValue({ id: 'ledger-1' });

    const result = await service.reviewRecord(
      'dep-1',
      {
        action: 'approve',
        reviewNote: '链上确认完成',
        applyBalance: true
      },
      'admin-1'
    );

    expect(tx.fundingRecord.updateMany).toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: {
          realBalance: new Prisma.Decimal('150.5')
        }
      })
    );
    expect(tx.balanceLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referenceId: 'dep-1',
          referenceType: 'funding_review'
        })
      })
    );
    expect(result.record.status).toBe('completed');
    expect(result.record.balanceApplied).toBe(true);
  });

  it('rejects re-reviewing a completed funding record', async () => {
    const { service, tx } = createService();

    tx.fundingRecord.findUnique.mockResolvedValue({
      id: 'dep-1',
      type: 'deposit',
      status: 'completed',
      amount: new Prisma.Decimal('100'),
      userId: 'user-1',
      user: {
        id: 'user-1',
        displayName: 'Alice',
        realBalance: new Prisma.Decimal('50')
      }
    });

    await expect(
      service.reviewRecord(
        'dep-1',
        {
          action: 'approve',
          reviewNote: 'again',
          applyBalance: true
        },
        'admin-1'
      )
    ).rejects.toMatchObject<Partial<BusinessException>>({
      code: 'FUNDING_ALREADY_REVIEWED'
    });
  });
});
