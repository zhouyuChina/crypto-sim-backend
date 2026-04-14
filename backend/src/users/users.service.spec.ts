import * as bcrypt from 'bcrypt';

import { BusinessException } from '../common/exceptions/business.exception';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const baseUserRecord = {
    id: 'user-1',
    email: 'player001@example.com',
    displayName: 'Player 001',
    phoneNumber: '+1-202-555-0100',
    avatar: null,
    idCardFront: 'https://cdn.example.com/front.png',
    idCardBack: 'https://cdn.example.com/back.png',
    roles: ['trader'],
    isActive: true,
    verificationStatus: 'PENDING',
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date('2026-04-10T00:00:00.000Z'),
    updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    demoBalance: 10000,
    realBalance: 0,
    totalProfitLoss: 0,
    totalTrades: 0,
    winRate: 0
  };

  const createService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn()
      }
    };

    return {
      prisma,
      service: new UsersService(prisma as any)
    };
  };

  it('creates a custom user with hashed password and admin provenance', async () => {
    const { prisma, service } = createService();

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }: any) => ({
      ...baseUserRecord,
      ...data
    }));

    const result = await service.createCustomUser(
      {
        email: 'player001@example.com',
        password: '123456',
        displayName: 'Player 001',
        phoneNumber: '+1-202-555-0100',
        demoBalance: 10000,
        realBalance: 0,
        verificationStatus: 'PENDING',
        idCardFront: 'https://cdn.example.com/front.png',
        idCardBack: 'https://cdn.example.com/back.png'
      },
      'admin-1'
    );

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'player001@example.com',
          isCustomMember: true,
          createdBy: 'admin-1',
          roles: ['trader']
        })
      })
    );

    const createArgs = prisma.user.create.mock.calls[0][0];
    expect(createArgs.data.passwordHash).not.toBe('123456');
    await expect(bcrypt.compare('123456', createArgs.data.passwordHash)).resolves.toBe(true);
    expect(result.email).toBe('player001@example.com');
  });

  it('rejects duplicate emails with a business code', async () => {
    const { prisma, service } = createService();

    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.createCustomUser(
        {
          email: 'player001@example.com',
          password: '123456',
          displayName: 'Player 001',
          phoneNumber: '+1-202-555-0100',
          demoBalance: 10000,
          realBalance: 0,
          verificationStatus: 'PENDING'
        },
        'admin-1'
      )
    ).rejects.toMatchObject<Partial<BusinessException>>({
      code: 'EMAIL_ALREADY_EXISTS'
    });
  });
});
